import { useSyncExternalStore } from "react";
import type { HassConfig, HassEntities, HassEntity, HassServiceTarget } from "home-assistant-js-websocket";
import type { AreaEntry, DeviceEntry, EntityEntry, FloorEntry } from "./types";

export type Status = "connecting" | "ready" | "disconnected";

export interface HomeState {
  status: Status;
  config?: HassConfig;
  entities: HassEntities;
  floors: FloorEntry[];
  areas: AreaEntry[];
  devices: Record<string, DeviceEntry>;
  registry: Record<string, EntityEntry>;
}

/** Where commands go: a live HA connection or a local fixture. */
export interface Backend {
  callService(domain: string, service: string, data?: object, target?: HassServiceTarget): Promise<unknown>;
  /** Close the connection and forget the login. */
  logout(): Promise<void>;
}

let state: HomeState = { status: "connecting", entities: {}, floors: [], areas: [], devices: {}, registry: {} };
const listeners = new Set<() => void>();
let backend: Backend | undefined;

export const store = {
  get: () => state,
  set(patch: Partial<HomeState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};

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

/**
 * Read a slice of the store. The selector must return something stable (a stored object,
 * not a freshly built array), so components re-render only when their slice changes.
 * HA replaces only the entity objects that changed, so `useEntity` re-renders one tile per update.
 */
export function useHome<T>(select: (s: HomeState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(state));
}

export const useEntity = (entityId: string | undefined): HassEntity | undefined =>
  useHome((s) => (entityId ? s.entities[entityId] : undefined));
