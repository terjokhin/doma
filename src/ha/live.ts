import {
  callService,
  createConnection,
  getAuth,
  subscribeConfig,
  subscribeEntities,
  type AuthData,
  type Connection,
} from "home-assistant-js-websocket";
import { store, type Backend } from "./store";
import type { AreaEntry, DeviceEntry, EntityRegistryDisplay, FloorEntry } from "./types";

const TOKENS_KEY = "ha-ui.tokens";

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

async function loadRegistries(conn: Connection) {
  const [floors, areas, devices, display] = await Promise.all([
    conn.sendMessagePromise<FloorEntry[]>({ type: "config/floor_registry/list" }),
    conn.sendMessagePromise<AreaEntry[]>({ type: "config/area_registry/list" }),
    conn.sendMessagePromise<DeviceEntry[]>({ type: "config/device_registry/list" }),
    conn.sendMessagePromise<EntityRegistryDisplay>({ type: "config/entity_registry/list_for_display" }),
  ]);
  store.set({
    floors,
    areas,
    devices: Object.fromEntries(devices.map((d) => [d.id, d])),
    registry: Object.fromEntries(display.entities.map((e) => [e.ei, e])),
  });
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
    store.set({ status: "ready" });
    void loadRegistries(conn); // may have changed while we were offline
  });
  conn.addEventListener("disconnected", () => store.set({ status: "disconnected" }));

  await loadRegistries(conn);
  subscribeConfig(conn, (config) => store.set({ config }));
  subscribeEntities(conn, (entities) => store.set({ entities }));

  let reload: ReturnType<typeof setTimeout> | undefined;
  for (const type of REGISTRY_EVENTS) {
    void conn.subscribeEvents(() => {
      clearTimeout(reload);
      reload = setTimeout(() => void loadRegistries(conn), 500);
    }, type);
  }

  store.set({ status: "ready" });
  return {
    callService: (domain, service, data, target) => callService(conn, domain, service, data, target),
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
