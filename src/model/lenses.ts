import type { HassEntity } from "home-assistant-js-websocket";
import { home } from "../ha/store.svelte";
import { t } from "../i18n/index.svelte";
import type { Size } from "../layout/pack";
import { SIZES } from "../layout/sizes";
import { ALARM_CLASSES, deviceClass, domainOf, OPEN_CLASSES, type FloorGroup, type Room, type RoomDevice } from "./home";

/**
 * Lenses: one function across the whole house (ROADMAP.md, "Lenses"). Each lens picks what it shows from every
 * room, and says in a status chip whether anything needs a look. Lens screens group the picks like Home does:
 * floor headings, then a section per room (LAYOUTS.md, "Lens screens").
 */

export const LENS_IDS = ["lights", "climate", "security", "devices"] as const;
export type LensId = (typeof LENS_IDS)[number];

export const isLensId = (id: string): id is LensId => (LENS_IDS as readonly string[]).includes(id);

export type LensItem =
  | { kind: "toggle" | "climate" | "sensor"; id: string; size: Size }
  | { kind: "device"; id: string; device: RoomDevice; size: Size };

export interface Chip {
  lens: LensId;
  text: string;
  /** "alert": something is wrong now (a leak, smoke); "warn": worth a look (a door open, a device offline). */
  tone?: "warn" | "alert";
}

interface Lens {
  /** What the lens shows for one room, in order; [] leaves the room out. May read live states. */
  items(room: Room): LensItem[];
  /** The entities its chip reads, so the screens that show chips subscribe to them. */
  watched(room: Room): string[];
  /** The chip's message, from live states, or undefined when there's nothing to say. */
  chip(rooms: Room[]): Omit<Chip, "lens"> | undefined;
}

const state = (id: string) => home.entity(id);
const isOn = (id: string) => state(id)?.state === "on";
const unavailable = (s: HassEntity | undefined) => !s || s.state === "unavailable";

export const LOW_BATTERY = 20;

/** Whether a device's battery is low: at or below LOW_BATTERY %, or a low-battery flag that's on. */
export function batteryLow(device: RoomDevice) {
  const s = device.battery ? state(device.battery) : undefined;
  if (!s || unavailable(s)) return false;
  if (domainOf(s.entity_id) === "binary_sensor") return s.state === "on";
  const level = Number(s.state);
  return Number.isFinite(level) && level <= LOW_BATTERY;
}

export const deviceOffline = (device: RoomDevice) => unavailable(state(device.probe));

/** A battery level for sorting: 0–100, low flags as 0 / 100. Devices without a battery sort last. */
function batteryLevel(device: RoomDevice) {
  const s = device.battery ? state(device.battery) : undefined;
  if (!s) return Infinity;
  if (domainOf(s.entity_id) === "binary_sensor") return s.state === "on" ? 0 : 100;
  const level = Number(s.state);
  return Number.isFinite(level) ? level : Infinity;
}

const toggles = (ids: string[]): LensItem[] => ids.map((id) => ({ kind: "toggle", id, size: SIZES.toggle }));
const sensors = (ids: string[]): LensItem[] => ids.map((id) => ({ kind: "sensor", id, size: SIZES.sensor }));

export const LENSES: Record<LensId, Lens> = {
  lights: {
    items: (room) => toggles(room.lights),
    watched: (room) => room.lights,
    chip(rooms) {
      const on = rooms.flatMap((r) => r.lights).filter(isOn).length;
      return on ? { text: t("lens.chips.lightsOn", { count: on }) } : undefined;
    },
  },

  climate: {
    items: (room) => [
      ...room.climate.map((id): LensItem => ({ kind: "climate", id, size: SIZES.climate })),
      ...toggles(room.heating),
      // The room's own readings (HA's chosen sensors), not every thermometer in it: an air conditioner brings two.
      ...sensors(
        [
          room.temperature,
          room.humidity,
          ...room.sensors.filter((id) => domainOf(id) === "sensor" && deviceClass(home.catalog[id]) === "carbon_dioxide"),
        ].filter((id): id is string => !!id),
      ),
    ],
    watched: (room) => [...room.climate, ...room.heating],
    chip(rooms) {
      let heating = 0;
      let cooling = 0;
      let on = 0;
      for (const id of rooms.flatMap((r) => r.climate)) {
        const s = state(id);
        if (!s || s.state === "off" || unavailable(s) || s.state === "unknown") continue;
        if (s.state === "heat") heating++;
        else if (s.state === "cool") cooling++;
        else on++;
      }
      on += rooms.flatMap((r) => r.heating).filter(isOn).length;
      const parts = [
        heating && t("lens.chips.heating", { count: heating }),
        cooling && t("lens.chips.cooling", { count: cooling }),
        on && t("lens.chips.climateOn", { count: on }),
      ].filter(Boolean);
      return parts.length ? { text: parts.join(" · ") } : undefined;
    },
  },

  security: {
    items: (room) => sensors(room.safety),
    watched: (room) => room.safety,
    chip(rooms) {
      const found = (classes: Set<string>, active: (s: HassEntity) => boolean) =>
        rooms.flatMap((room) =>
          room.safety
            .map(state)
            .filter((s): s is HassEntity => !!s && classes.has(deviceClass(s)) && active(s))
            .map((s) => ({ room, cls: deviceClass(s) })),
        );
      const alarms = found(ALARM_CLASSES, (s) => s.state === "on");
      if (alarms.length === 1) {
        const [{ room, cls }] = alarms;
        return { text: t(`lens.chips.alarm.${cls}`, { room: room.area.name }), tone: "alert" };
      }
      if (alarms.length) return { text: t("lens.chips.alarms", { count: alarms.length }), tone: "alert" };
      const open = found(OPEN_CLASSES, (s) => s.state === "on");
      const unlocked = rooms.flatMap((r) => r.safety).filter((id) => state(id)?.state === "unlocked").length;
      const parts = [];
      if (open.length === 1) {
        const [{ room, cls }] = open;
        parts.push(t(`lens.chips.open.${cls === "window" ? "window" : cls === "door" ? "door" : "other"}`, { room: room.area.name }));
      } else if (open.length) parts.push(t("lens.chips.openCount", { count: open.length }));
      if (unlocked) parts.push(t("lens.chips.unlocked", { count: unlocked }));
      return parts.length ? { text: parts.join(" · "), tone: "warn" } : undefined;
    },
  },

  devices: {
    // Offline devices first, then batteries from the lowest; devices that are online and have no battery aren't news.
    items: (room) =>
      room.devices
        .filter((d) => d.battery || deviceOffline(d))
        .map((d) => ({ d, offline: deviceOffline(d), level: batteryLevel(d) }))
        .sort((a, b) => Number(b.offline) - Number(a.offline) || a.level - b.level)
        .map(({ d }): LensItem => ({ kind: "device", id: d.id, device: d, size: SIZES.sensor })),
    watched: (room) => room.devices.map((d) => d.probe),
    chip(rooms) {
      const all = rooms.flatMap((r) => r.devices);
      const offline = all.filter(deviceOffline).length;
      const low = all.filter((d) => !deviceOffline(d) && batteryLow(d)).length;
      const parts = [
        offline && t("lens.chips.offline", { count: offline }),
        low && t("lens.chips.lowBattery", { count: low }),
      ].filter(Boolean);
      return parts.length ? { text: parts.join(" · "), tone: "warn" } : undefined;
    },
  },
};

export interface LensSection {
  room: Room;
  items: LensItem[];
}

export interface LensFloor {
  key: string;
  /** undefined: rooms without a floor. */
  name?: string;
  sections: LensSection[];
}

/** A lens screen: per floor, a section for each room the lens has something for. Floors left empty are dropped. */
export function lensView(model: FloorGroup[], lens: LensId): LensFloor[] {
  return model
    .map((group) => ({
      key: group.floor?.floor_id ?? "_none",
      name: group.floor?.name,
      sections: group.rooms
        .map((room) => ({ room, items: LENSES[lens].items(room) }))
        .filter((s) => s.items.length > 0),
    }))
    .filter((f) => f.sections.length > 0);
}

/** Every room in the model, in floor order. */
export const allRooms = (model: FloorGroup[]) => model.flatMap((g) => g.rooms);

/** The entities the chips read. */
export const chipEntities = (model: FloorGroup[]) =>
  allRooms(model).flatMap((room) => LENS_IDS.flatMap((lens) => LENSES[lens].watched(room)));
