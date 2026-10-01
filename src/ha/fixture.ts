import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { EntityChanges } from "./entities";
import { home, type Backend } from "./store.svelte";
import type { AreaEntry, DeviceEntry, EntityEntry, FloorEntry } from "./types";

/** A snapshot of a home: the committed `demo` one, or `local` captured from your HA (git-ignored). */
export interface Fixture {
  config: Partial<HassConfig>;
  states: HassEntity[];
  floors: FloorEntry[];
  areas: AreaEntry[];
  devices: DeviceEntry[];
  entities: EntityEntry[];
  /** A stored house layout, if the snapshot has one. */
  layout?: unknown;
}

// Production builds only carry the demo, never a snapshot of a real home.
const FIXTURES = import.meta.env.DEV
  ? import.meta.glob<Fixture>("../../fixtures/*.json", { import: "default" })
  : import.meta.glob<Fixture>("../../fixtures/demo.json", { import: "default" });

export async function connectFixture(name: string): Promise<Backend> {
  const load = FIXTURES[`../../fixtures/${name}.json`];
  if (!load) throw new Error(`No fixture "${name}". Available: ${Object.keys(FIXTURES).join(", ")}`);
  const f = await load();

  // The fixture's "server side": all states, and who is subscribed to which of them.
  const states: Record<string, HassEntity> = Object.fromEntries(f.states.map((s) => [s.entity_id, s]));
  const listeners = new Set<{ ids: Set<string> | "all"; onChange: (changes: EntityChanges, at: number) => void }>();
  // The stored layout, in memory: saving works like on a live HA, but is gone on reload.
  let layout: unknown = f.layout ?? null;
  const layoutListeners = new Set<(value: unknown) => void>();

  const pick = (ids: Iterable<string>) => {
    const changed: Record<string, HassEntity> = {};
    for (const id of ids) if (states[id]) changed[id] = states[id];
    return changed;
  };

  home.config = f.config as HassConfig;
  home.floors = f.floors;
  home.areas = f.areas;
  home.devices = Object.fromEntries(f.devices.map((d) => [d.id, d]));
  home.registry = Object.fromEntries(f.entities.map((e) => [e.ei, e]));
  home.catalog = { ...states };
  home.status = "ready";

  return {
    async callService(domain, service, data, target) {
      const changed = simulate(states, domain, service, { ...(data as Record<string, unknown>), ...target });
      Object.assign(states, changed);
      // Like HA: deliver asynchronously, only to subscriptions that include the entity.
      setTimeout(() => {
        for (const l of listeners) {
          const mine = l.ids === "all" ? changed : pick(Object.keys(changed).filter((id) => (l.ids as Set<string>).has(id)));
          if (Object.keys(mine).length) l.onChange({ changed: mine, removed: [] }, performance.now());
        }
      });
    },
    async subscribeEntities(entityIds, onChange) {
      const listener = { ids: entityIds === "all" ? ("all" as const) : new Set(entityIds), onChange };
      listeners.add(listener);
      setTimeout(() => onChange({ changed: entityIds === "all" ? { ...states } : pick(entityIds), removed: [] }, performance.now()));
      return () => void listeners.delete(listener);
    },
    async subscribeLayout(onChange) {
      layoutListeners.add(onChange);
      setTimeout(() => onChange(layout));
      return () => void layoutListeners.delete(onChange);
    },
    async saveLayout(value) {
      layout = value;
      setTimeout(() => layoutListeners.forEach((l) => l(layout)));
    },
    async logout() {},
  };
}

/** Just enough service behaviour to click around the UI. Returns the new states of the entities it changed. */
function simulate(states: Record<string, HassEntity>, domain: string, service: string, data: Record<string, unknown>) {
  const ids = ([] as string[]).concat((data.entity_id as string | string[]) ?? []);
  const changed: Record<string, HassEntity> = {};

  for (const id of ids) {
    const e = states[id];
    if (!e) continue;
    let next: HassEntity = e;
    if (domain === "climate" && (service === "turn_on" || service === "turn_off")) {
      const modes = (e.attributes.hvac_modes as string[] | undefined) ?? [];
      next = { ...e, state: service === "turn_off" ? "off" : (modes.find((m) => m !== "off") ?? "heat") };
    } else if (["turn_on", "turn_off", "toggle"].includes(service)) {
      const on = service === "toggle" ? e.state !== "on" : service === "turn_on";
      next = { ...e, state: on ? "on" : "off" };
    } else if (domain === "climate" && service === "set_temperature") {
      next = { ...e, attributes: { ...e.attributes, temperature: data.temperature } };
    } else if (domain === "climate" && service === "set_hvac_mode") {
      next = { ...e, state: String(data.hvac_mode) };
    }
    changed[id] = { ...next, last_changed: new Date().toISOString() };
  }
  return changed;
}
