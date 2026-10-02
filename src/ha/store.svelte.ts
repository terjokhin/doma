import { SvelteMap } from "svelte/reactivity";
import type { HassConfig, HassEntities, HassEntity, HassServiceTarget } from "home-assistant-js-websocket";
import type { HomeLayout } from "../layout/homeLayout";
import type { EntityChanges } from "./entities";
import type { AreaEntry, DeviceEntry, EntityEntry, FloorEntry } from "./types";

export type Status = "connecting" | "ready" | "disconnected";

/** Where commands go and where states come from: a live HA connection or a local fixture. */
export interface Backend {
  callService(domain: string, service: string, data?: object, target?: HassServiceTarget): Promise<unknown>;
  /**
   * Receive the states of `entityIds` ("all": every entity), first in full and then as they change,
   * until the returned function is called. `receivedAt` is when the message arrived (performance.now()).
   */
  subscribeEntities(
    entityIds: string[] | "all",
    onChange: (changes: EntityChanges, receivedAt: number) => void,
  ): Promise<() => void>;
  /** Receive the user's stored home layout (raw, possibly null), first now and then on every change. */
  subscribeLayout(onChange: (value: unknown) => void): Promise<() => void>;
  /** Store the user's home layout. */
  saveLayout(value: HomeLayout): Promise<void>;
  /** Close the connection and forget the login. */
  logout(): Promise<void>;
}

/**
 * Everything the UI knows about the home. Registries are replaced whole when HA reports a change.
 * Entity states are reactive per entity: `entity(id)` re-runs only the code that reads that entity.
 * Only subscribed entities are kept up to date (see subscriptions.svelte.ts).
 */
class Home {
  status = $state<Status>("connecting");
  config = $state.raw<HassConfig>();
  floors = $state.raw<FloorEntry[]>([]);
  areas = $state.raw<AreaEntry[]>([]);
  devices = $state.raw<Record<string, DeviceEntry>>({});
  registry = $state.raw<Record<string, EntityEntry>>({});
  /**
   * Every entity's state as loaded once at start and after registry changes. Not kept up to date:
   * it tells the model which entities exist and what they are (device class, name), and seeds tiles.
   */
  catalog = $state.raw<HassEntities>({});

  #states = new SvelteMap<string, HassEntity>();
  #plain = new Map<string, HassEntity>();

  /** One entity's state. Reactive, for that entity only. */
  entity(entityId: string | undefined): HassEntity | undefined {
    return entityId ? this.#states.get(entityId) : undefined;
  }

  /** One entity's state without subscribing the calling code to it. */
  peek(entityId: string): HassEntity | undefined {
    return this.#plain.get(entityId);
  }

  apply({ changed, removed }: EntityChanges) {
    for (const id in changed) {
      const known = this.#plain.get(id);
      const next = changed[id];
      if (known === next) continue;
      // A new subscription (every screen change) sends each state in full again. A state we already have keeps its
      // object, so nothing on screen re-renders for it: any change, attributes included, moves last_updated.
      if (known && known.state === next.state && sameTime(known.last_updated, next.last_updated)) continue;
      this.#plain.set(id, changed[id]);
      this.#states.set(id, changed[id]);
    }
    for (const id of removed) {
      this.#plain.delete(id);
      this.#states.delete(id);
    }
  }
}

/** Two timestamps from HA, as `get_states` ("…00.123456+00:00") or as decoded from an event ("…00.123Z"). */
const sameTime = (a: string, b: string) => a === b || Date.parse(a) === Date.parse(b);

export const home = new Home();

let backend: Backend | undefined;

export function setBackend(b: Backend) {
  backend = b;
}

export function callService(domain: string, service: string, data?: object, target?: HassServiceTarget) {
  if (!backend) return Promise.reject(new Error("Not connected"));
  return backend.callService(domain, service, data, target);
}

const LOGGED_OUT_KEY = "ha-ui.loggedOut";

/** Log out and go to the setup screen (not straight back to HA's login), dropping any ?fixture. */
export async function logout() {
  await backend?.logout();
  try {
    sessionStorage.setItem(LOGGED_OUT_KEY, "1");
  } catch {
    /* storage unavailable: we'll go to HA's login page instead */
  }
  location.replace(location.pathname);
}

/** True right after a logout in this tab; cleared once the user connects again. */
export function justLoggedOut(clear = false) {
  try {
    const out = sessionStorage.getItem(LOGGED_OUT_KEY) === "1";
    if (clear) sessionStorage.removeItem(LOGGED_OUT_KEY);
    return out;
  } catch {
    return false;
  }
}
