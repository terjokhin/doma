import { useMemo } from "react";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import { store, useHome } from "../ha/store";
import type { AreaEntry, DeviceEntry, EntityEntry, FloorEntry } from "../ha/types";

/**
 * The home as the UI thinks about it: floors → rooms → entities grouped by what they do.
 * Built from HA's floor/area/device/entity registries, so it follows HA's own organisation.
 */
export interface Room {
  area: AreaEntry;
  lights: string[];
  climate: string[];
  switches: string[];
  media: string[];
  sensors: string[];
  temperature?: string;
  humidity?: string;
}

export interface FloorGroup {
  floor?: FloorEntry; // undefined: areas with no floor
  rooms: Room[];
}

const SWITCH_DOMAINS = new Set(["switch", "fan", "input_boolean"]);
/** Relays wired to a lamp are `switch` entities; count them as lights when their ID says so. */
const LIGHT_SWITCH = /(^|_)(lights?|lamp|sconce|chandelier)(_|$)/;

export const isLight = (entityId: string) =>
  entityId.startsWith("light.") || (entityId.startsWith("switch.") && LIGHT_SWITCH.test(entityId.slice(7)));
const SENSOR_CLASSES = new Set([
  "temperature", "humidity", "carbon_dioxide", "pm25", "pm10", "volatile_organic_compounds", "illuminance",
  "moisture", "smoke", "door", "window", "opening", "motion", "occupancy", "battery",
]);

export const domainOf = (entityId: string) => entityId.slice(0, entityId.indexOf("."));

/** Entities worth showing: not hidden, not config/diagnostic. */
const isVisible = (e: EntityEntry) => !e.hb && e.ec === undefined;

export function areaOf(e: EntityEntry, devices: Record<string, DeviceEntry>) {
  return e.ai ?? (e.di ? devices[e.di]?.area_id : undefined) ?? undefined;
}

export function buildHome(
  floors: FloorEntry[],
  areas: AreaEntry[],
  devices: Record<string, DeviceEntry>,
  registry: Record<string, EntityEntry>,
  states: HassEntities,
): FloorGroup[] {
  const rooms = new Map<string, Room>(
    areas.map((area) => [area.area_id, { area, lights: [], climate: [], switches: [], media: [], sensors: [] }]),
  );

  for (const e of Object.values(registry)) {
    const room = rooms.get(areaOf(e, devices) ?? "");
    const state = states[e.ei];
    if (!room || !state || !isVisible(e)) continue;
    const domain = domainOf(e.ei);
    if (isLight(e.ei)) room.lights.push(e.ei);
    else if (domain === "climate") room.climate.push(e.ei);
    else if (domain === "media_player") room.media.push(e.ei);
    else if (SWITCH_DOMAINS.has(domain)) room.switches.push(e.ei);
    else if ((domain === "sensor" || domain === "binary_sensor") && SENSOR_CLASSES.has(deviceClass(state))) {
      room.sensors.push(e.ei);
    }
  }

  for (const room of rooms.values()) {
    for (const list of [room.lights, room.climate, room.switches, room.media, room.sensors]) {
      list.sort((a, b) =>
        entityName(states[a], registry[a], room.area).localeCompare(entityName(states[b], registry[b], room.area)),
      );
    }
    // HA lets you pick an area's temperature/humidity sensor; fall back to the first one in the room.
    room.temperature = pick(room.area.temperature_entity_id, room.sensors, states, "temperature");
    room.humidity = pick(room.area.humidity_entity_id, room.sensors, states, "humidity");
  }

  const sortedFloors = [...floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const groups: FloorGroup[] = sortedFloors.map((floor) => ({
    floor,
    rooms: areas.filter((a) => a.floor_id === floor.floor_id).map((a) => rooms.get(a.area_id)!),
  }));
  groups.push({ rooms: areas.filter((a) => !a.floor_id).map((a) => rooms.get(a.area_id)!) });
  return groups.filter((g) => g.rooms.length > 0);
}

function pick(preferred: string | null | undefined, sensors: string[], states: HassEntities, cls: string) {
  if (preferred && states[preferred]) return preferred;
  return sensors.find((id) => domainOf(id) === "sensor" && deviceClass(states[id]) === cls);
}

export const deviceClass = (s: HassEntity | undefined) => String(s?.attributes.device_class ?? "");

/**
 * A short name for a tile. An entity named on its own ("Temperature" on the "Air sensor" device)
 * uses that name; otherwise the friendly name without the room: "Kitchen Ceiling light" → "Ceiling light".
 */
export function entityName(s: HassEntity | undefined, reg?: EntityEntry, area?: AreaEntry) {
  if (reg?.hn && reg.en) return reg.en;
  const name = String(s?.attributes.friendly_name ?? s?.entity_id ?? "");
  if (area && name.toLowerCase().startsWith(area.name.toLowerCase() + " ")) {
    const rest = name.slice(area.name.length + 1);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return name;
}

/**
 * The home model. It only rebuilds when a registry changes, not on every state update:
 * which room an entity is in and its device class don't change with its state.
 */
export function useHomeModel(): FloorGroup[] {
  const floors = useHome((s) => s.floors);
  const areas = useHome((s) => s.areas);
  const devices = useHome((s) => s.devices);
  const registry = useHome((s) => s.registry);
  const loaded = useHome((s) => Object.keys(s.entities).length > 0);
  return useMemo(
    () => buildHome(floors, areas, devices, registry, store.get().entities),
    [floors, areas, devices, registry, loaded],
  );
}

export function useRoom(areaId: string): Room | undefined {
  const home = useHomeModel();
  return useMemo(
    () => home.flatMap((g) => g.rooms).find((r) => r.area.area_id === areaId),
    [home, areaId],
  );
}
