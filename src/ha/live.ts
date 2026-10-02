import {
  callService,
  createConnection,
  getAuth,
  subscribeConfig,
  type AuthData,
  type Connection,
  type HassEntity,
} from "home-assistant-js-websocket";
import { LAYOUT_KEY, LEGACY_LAYOUT_KEY } from "../layout/homeLayout";
import { decodeEntitiesEvent, type EntitiesEvent } from "./entities";
import { home, type Backend } from "./store.svelte";
import type { AreaEntry, DeviceEntry, EntityRegistryDisplay, FloorEntry } from "./types";

const TOKENS_KEY = "doma.tokens";

// Storage can be unavailable (private mode, kiosk browsers with storage off); then we just re-login.
const loadTokens = async (): Promise<AuthData | null> => {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? "null");
  } catch {
    return null;
  }
};

const saveTokens = (data: AuthData | null) => {
  try {
    if (data) localStorage.setItem(TOKENS_KEY, JSON.stringify(data));
    else localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* ignore */
  }
};

export const hasSavedLogin = async () => (await loadTokens()) !== null;
export const forgetLogin = () => saveTokens(null);

const REGISTRY_EVENTS = [
  "floor_registry_updated",
  "area_registry_updated",
  "device_registry_updated",
  "entity_registry_updated",
];

/** Registries, plus one snapshot of all states for the model (it isn't kept up to date). */
async function loadRegistries(conn: Connection) {
  const [floors, areas, devices, display, states] = await Promise.all([
    conn.sendMessagePromise<FloorEntry[]>({ type: "config/floor_registry/list" }),
    conn.sendMessagePromise<AreaEntry[]>({ type: "config/area_registry/list" }),
    conn.sendMessagePromise<DeviceEntry[]>({ type: "config/device_registry/list" }),
    conn.sendMessagePromise<EntityRegistryDisplay>({ type: "config/entity_registry/list_for_display" }),
    conn.sendMessagePromise<HassEntity[]>({ type: "get_states" }),
  ]);
  home.floors = floors;
  home.areas = areas;
  home.devices = Object.fromEntries(devices.map((d) => [d.id, d]));
  home.registry = Object.fromEntries(display.entities.map((e) => [e.ei, e]));
  home.catalog = Object.fromEntries(states.map((s) => [s.entity_id, s]));
}

/**
 * Log in with HA's OAuth flow and keep the store in sync.
 * Without saved tokens and without `hassUrl`, rejects with ERR_HASS_HOST_REQUIRED.
 * With `hassUrl` and no saved tokens, it redirects the page to HA's login screen.
 */
export async function connectLive(hassUrl?: string): Promise<Backend> {
  const auth = await getAuth({ hassUrl, loadTokens, saveTokens });
  if (location.search.includes("auth_callback=1")) {
    history.replaceState(null, "", location.pathname + location.hash);
  }

  const conn = await createConnection({ auth });
  conn.addEventListener("ready", () => {
    home.status = "ready";
    void loadRegistries(conn); // may have changed while we were offline
  });
  conn.addEventListener("disconnected", () => (home.status = "disconnected"));

  await loadRegistries(conn);
  subscribeConfig(conn, (config) => (home.config = config));

  let reload: ReturnType<typeof setTimeout> | undefined;
  for (const type of REGISTRY_EVENTS) {
    void conn.subscribeEvents(() => {
      clearTimeout(reload);
      reload = setTimeout(() => void loadRegistries(conn), 500);
    }, type);
  }

  home.status = "ready";
  return {
    callService: (domain, service, data, target) => callService(conn, domain, service, data, target),
    async subscribeEntities(entityIds, onChange) {
      // The library's subscribeEntities() always subscribes to every entity; send the filter ourselves.
      // subscribeMessage re-sends it after a reconnect, and HA then sends the full states again.
      const unsubscribe = await conn.subscribeMessage<EntitiesEvent>(
        (ev) => {
          const receivedAt = performance.now();
          onChange(decodeEntitiesEvent(ev, (id) => home.peek(id)), receivedAt);
        },
        entityIds === "all" ? { type: "subscribe_entities" } : { type: "subscribe_entities", entity_ids: entityIds },
      );
      return () => void unsubscribe().catch(() => {}); // fails only when already disconnected
    },
    async subscribeLayout(onChange) {
      await migrateLayout(conn);
      // The user's frontend storage: sends the current value at once, then every change from any of their screens.
      const unsubscribe = await conn.subscribeMessage<{ value: unknown }>((ev) => onChange(ev.value), {
        type: "frontend/subscribe_user_data",
        key: LAYOUT_KEY,
      });
      return () => void unsubscribe().catch(() => {});
    },
    async saveLayout(value) {
      await conn.sendMessagePromise({ type: "frontend/set_user_data", key: LAYOUT_KEY, value });
    },
    async logout() {
      conn.close();
      try {
        await auth.revoke(); // HA drops the refresh token, so it can't be reused
      } catch {
        /* offline: forgetting it locally is still a logout */
      }
      forgetLogin();
    },
  };
}

/**
 * A layout saved while Doma was called ha-ui is copied to the new key once, if the new one is still empty. The old
 * entry stays in HA, untouched. Failing here only means the generated layout shows, as with no layout at all.
 */
async function migrateLayout(conn: Connection) {
  try {
    const get = (key: string) => conn.sendMessagePromise<{ value: unknown }>({ type: "frontend/get_user_data", key });
    if ((await get(LAYOUT_KEY)).value != null) return;
    const { value } = await get(LEGACY_LAYOUT_KEY);
    if (value != null) await conn.sendMessagePromise({ type: "frontend/set_user_data", key: LAYOUT_KEY, value });
  } catch (err) {
    console.warn("Couldn't move the layout saved under the old name:", err);
  }
}
