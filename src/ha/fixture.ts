import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import { store, type Backend } from "./store";
import type { AreaEntry, DeviceEntry, EntityEntry, FloorEntry } from "./types";

/** A snapshot of a home: the committed `demo` one, or `local` captured from your HA (git-ignored). */
export interface Fixture {
  config: Partial<HassConfig>;
  states: HassEntity[];
  floors: FloorEntry[];
  areas: AreaEntry[];
  devices: DeviceEntry[];
  entities: EntityEntry[];
}

// Production builds only carry the demo, never a snapshot of a real home.
const FIXTURES = import.meta.env.DEV
  ? import.meta.glob<Fixture>("../../fixtures/*.json", { import: "default" })
  : import.meta.glob<Fixture>("../../fixtures/demo.json", { import: "default" });

export async function connectFixture(name: string): Promise<Backend> {
  const load = FIXTURES[`../../fixtures/${name}.json`];
  if (!load) throw new Error(`No fixture "${name}". Available: ${Object.keys(FIXTURES).join(", ")}`);
  const f = await load();

  store.set({
    status: "ready",
    config: f.config as HassConfig,
    entities: Object.fromEntries(f.states.map((s) => [s.entity_id, s])),
    floors: f.floors,
    areas: f.areas,
    devices: Object.fromEntries(f.devices.map((d) => [d.id, d])),
    registry: Object.fromEntries(f.entities.map((e) => [e.ei, e])),
  });

  return {
    async callService(domain, service, data, target) {
      simulate(domain, service, { ...(data as Record<string, unknown>), ...target });
    },
    async logout() {},
  };
}

/** Just enough service behaviour to click around the UI. */
function simulate(domain: string, service: string, data: Record<string, unknown>) {
  const ids = ([] as string[]).concat((data.entity_id as string | string[]) ?? []);
  const entities = { ...store.get().entities };

  for (const id of ids) {
    const e = entities[id];
    if (!e) continue;
    let next: HassEntity = e;
    if (["turn_on", "turn_off", "toggle"].includes(service)) {
      const on = service === "toggle" ? e.state !== "on" : service === "turn_on";
      next = { ...e, state: on ? "on" : "off" };
    } else if (domain === "climate" && service === "set_temperature") {
      next = { ...e, attributes: { ...e.attributes, temperature: data.temperature } };
    } else if (domain === "climate" && service === "set_hvac_mode") {
      next = { ...e, state: String(data.hvac_mode) };
    }
    entities[id] = { ...next, last_changed: new Date().toISOString() };
  }
  store.set({ entities });
}
