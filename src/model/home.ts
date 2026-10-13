import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
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
  scenes: string[];
  /** Doors, windows, leak / smoke / gas sensors and locks (LAYOUTS.md, "Lens screens"). */
  safety: string[];
  /** Switches that heat something (underfloor heating, a radiator): `switches` whose ID says so. */
  heating: string[];
  /**
   * What runs when asked: scripts, buttons and timers, apart from a timer that a script runs (`linkTimers`), which
   * shows on the script's tile.
   */
  routines: string[];
  /** Automations: switched on and off, run by hand from their pop-up. */
  automations: string[];
  /** What its card's "+" offers, when it isn't what the room has: a routine card offers every routine in the house. */
  pickFrom?: string[];
  /** Devices in the room, for the Devices lens: whether each is online, and its battery. */
  devices: RoomDevice[];
  temperature?: string;
  humidity?: string;
}

export interface RoomDevice {
  id: string;
  name: string;
  /** The device's battery level (`sensor`, %) or low-battery flag (`binary_sensor`), if it reports one. */
  battery?: string;
  /** One of its entities, to tell whether the device is online: when it's offline, all of them are unavailable. */
  probe: string;
}

export interface FloorGroup {
  floor?: FloorEntry; // undefined: areas with no floor
  rooms: Room[];
}

const SWITCH_DOMAINS = new Set(["switch", "fan", "input_boolean"]);
/** Relays wired to a lamp are `switch` entities; count them as lights when their ID says so. */
const LIGHT_SWITCH = /(^|_)(lights?|lamp|sconce|chandelier)(_|$)/;
/** Likewise, a switch that heats something. */
const HEATING_SWITCH = /(^|_)(heating|heater|radiator|boiler)(_|$)/;

export const isHeatingSwitch = (entityId: string) =>
  SWITCH_DOMAINS.has(domainOf(entityId)) && HEATING_SWITCH.test(entityId.slice(entityId.indexOf(".") + 1));

export const isLight = (entityId: string) =>
  entityId.startsWith("light.") || (entityId.startsWith("switch.") && LIGHT_SWITCH.test(entityId.slice(7)));
const SENSOR_CLASSES = new Set([
  "temperature", "humidity", "carbon_dioxide", "pm25", "pm10", "volatile_organic_compounds", "illuminance",
  "moisture", "smoke", "door", "window", "opening", "motion", "occupancy", "battery",
]);
/** Binary sensors that report something open: worth a look, not an alarm. */
export const OPEN_CLASSES = new Set(["door", "window", "opening", "garage_door"]);
/** Binary sensors that report a hazard: an alarm. */
export const ALARM_CLASSES = new Set(["moisture", "smoke", "gas", "carbon_monoxide", "safety"]);

export const domainOf = (entityId: string) => entityId.slice(0, entityId.indexOf("."));

/** What a routine can be: run (scripts, buttons) or counted down (timers). */
const ROUTINE_DOMAINS = new Set(["script", "button", "input_button", "timer"]);
/** Buttons that look after a device rather than do something in the home. */
const UPKEEP_BUTTONS = new Set(["restart", "identify", "update"]);

/**
 * The room the house's routines and automations go in when HA gives them no area (LAYOUTS.md, "Routines"): a card on
 * Home and a room screen like any room's. Not an area ID HA can make: those never start with "_".
 */
export const ROUTINES_ID = "_routines";

/** Whether it's a routine or an automation: shown and run the same way (ui/RoutineSheet.svelte). */
export const runsOrAutomates = (entityId: string) => ROUTINE_DOMAINS.has(domainOf(entityId)) || domainOf(entityId) === "automation";

/**
 * The timer each script runs, by script ID: the timer whose name starts the script's ("Heating floors" for "Heating
 * floors for 1 hour"), the longest when several do. A script that runs a timer shows its countdown, and its timer
 * isn't shown on its own.
 */
export function linkTimers(states: HassEntities): Map<string, string> {
  const name = (s: HassEntity) => String(s.attributes.friendly_name ?? "").trim().toLowerCase();
  const timers = Object.values(states).filter((s) => s.entity_id.startsWith("timer.") && name(s));
  const links = new Map<string, string>();
  for (const script of Object.values(states)) {
    if (!script.entity_id.startsWith("script.")) continue;
    const full = name(script);
    let best: HassEntity | undefined;
    for (const timer of timers) {
      const t = name(timer);
      if (full.length > t.length && full.startsWith(t) && full[t.length] === " " && (!best || t.length > name(best).length)) best = timer;
    }
    if (best) links.set(script.entity_id, best.entity_id);
  }
  return links;
}

/** Entities worth showing: not hidden, not config/diagnostic. */
const isVisible = (e: EntityEntry) => !e.hb && e.ec === undefined;

export function areaOf(e: EntityEntry, devices: Record<string, DeviceEntry>) {
  return e.ai ?? (e.di ? devices[e.di]?.area_id : undefined) ?? undefined;
}

const emptyRoom = (area: AreaEntry): Room => ({
  area,
  lights: [],
  climate: [],
  switches: [],
  media: [],
  sensors: [],
  scenes: [],
  safety: [],
  heating: [],
  routines: [],
  automations: [],
  devices: [],
});

export function buildHome(
  floors: FloorEntry[],
  areas: AreaEntry[],
  devices: Record<string, DeviceEntry>,
  registry: Record<string, EntityEntry>,
  states: HassEntities,
  /** The routines room's name, in the screen's language. */
  routinesName = "Routines",
  timerLinks: Map<string, string> = new Map(),
): FloorGroup[] {
  const rooms = new Map<string, Room>(areas.map((area) => [area.area_id, emptyRoom(area)]));
  const house = emptyRoom({
    area_id: ROUTINES_ID,
    name: routinesName,
    floor_id: null,
    icon: null,
    picture: null,
    aliases: [],
    labels: [],
  });
  const linked = new Set(timerLinks.values());
  const roomDevices = new Map<string, RoomDevice & { room: Room }>();

  for (const e of Object.values(registry)) {
    const domain = domainOf(e.ei);
    const routine = ROUTINE_DOMAINS.has(domain) || domain === "automation";
    const room = rooms.get(areaOf(e, devices) ?? "") ?? (routine ? house : undefined);
    const state = states[e.ei];
    if (!room || !state || e.hb) continue;
    const cls = deviceClass(state);
    // Batteries are usually diagnostic entities: not shown in the room, but they count for the Devices lens.
    const battery = cls === "battery" && (domain === "sensor" || domain === "binary_sensor");
    const device = e.di ? devices[e.di] : undefined;
    if (device && (battery || isVisible(e))) {
      let d = roomDevices.get(device.id);
      if (!d) roomDevices.set(device.id, (d = { id: device.id, name: device.name_by_user ?? device.name ?? e.ei, probe: e.ei, room }));
      if (battery && !d.battery) d.battery = d.probe = e.ei;
    }
    if (!isVisible(e)) continue;
    if (isLight(e.ei)) room.lights.push(e.ei);
    else if (domain === "climate") room.climate.push(e.ei);
    else if (domain === "media_player") room.media.push(e.ei);
    else if (domain === "scene") room.scenes.push(e.ei);
    else if (SWITCH_DOMAINS.has(domain)) {
      room.switches.push(e.ei);
      if (isHeatingSwitch(e.ei)) room.heating.push(e.ei);
    } else if ((domain === "sensor" || domain === "binary_sensor") && SENSOR_CLASSES.has(cls)) {
      room.sensors.push(e.ei);
    } else if (domain === "automation") {
      room.automations.push(e.ei);
    } else if (ROUTINE_DOMAINS.has(domain) && !linked.has(e.ei) && !(domain === "button" && UPKEEP_BUTTONS.has(cls))) {
      room.routines.push(e.ei);
    }
    if (domain === "lock" || (domain === "binary_sensor" && (OPEN_CLASSES.has(cls) || ALARM_CLASSES.has(cls)))) {
      room.safety.push(e.ei);
    }
  }
  for (const { room, ...device } of roomDevices.values()) room.devices.push(device);

  for (const room of [...rooms.values(), house]) {
    room.devices.sort((a, b) => a.name.localeCompare(b.name));
    for (const list of [room.lights, room.climate, room.switches, room.media, room.sensors, room.scenes, room.safety, room.heating, room.routines, room.automations]) {
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
  // The house's own routines first: like a room with no floor, only there when HA has some.
  if (house.routines.length || house.automations.length) groups.unshift({ rooms: [house] });
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
