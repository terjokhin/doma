import type { HomeLayout } from "./homeLayout";
import { packSections, placeSections, type Packed } from "./pack";

/**
 * The room template (LAYOUTS.md, "Room screens"): which sections a room screen shows, where, how wide and under what
 * name. Every room follows one template unless it has its own arrangement; each room can also hide entities from its
 * screen. Stored in the home layout as `room`, as changes only.
 */

/** A room screen's sections, in their default order. */
export const ROOM_SECTIONS = ["scenes", "lights", "climate", "switches", "media", "sensors"] as const;
export type RoomSectionId = (typeof ROOM_SECTIONS)[number];

/** Where a section goes on one screen width: its column (the left one, when it's wider than one). */
export interface Place {
  id: RoomSectionId;
  x: number;
}

/** A section's width in section columns, or the whole screen's. */
export type SectionWidth = number | "full";

/** Where a room's sections go, which are hidden, their widths and their names. */
export interface SectionTemplate {
  /**
   * For each number of section columns ("1" on a phone, "2" on a portrait tablet, "3" on a landscape one, "4" on a
   * large screen), the sections in order, each with its column: placed in that order, each one goes right below the
   * sections before it in the columns it spans. A width without its own follows the nearest one (`arrangeSections`).
   */
  places: Record<string, Place[]>;
  hidden: RoomSectionId[];
  /** Unlisted: 1. The same on every screen width; a width that doesn't fit shrinks to the screen. */
  widths: Partial<Record<RoomSectionId, SectionWidth>>;
  /** Names given to sections. Unlisted: the default name, in the screen's language. */
  names: Partial<Record<RoomSectionId, string>>;
}

export interface RoomOverride {
  /** This room's own sections. Unset: it follows the template. */
  own?: SectionTemplate;
  /** Entities hidden from this room's screen (only there: lenses and the room card still show them). */
  hide?: string[];
}

export interface RoomLayout extends Partial<SectionTemplate> {
  /** Per room, by area ID. */
  rooms?: Record<string, RoomOverride>;
}

export const DEFAULT_SECTIONS: SectionTemplate = { places: {}, hidden: [], widths: {}, names: {} };

/** The longest name a section can have. */
export const NAME_LENGTH = 40;

const isSectionId = (value: unknown): value is RoomSectionId =>
  (ROOM_SECTIONS as readonly unknown[]).includes(value);

/** A section's width on a screen `count` section columns wide. */
export function widthOf(t: SectionTemplate, id: RoomSectionId, count: number) {
  const w = t.widths[id];
  return w === "full" ? count : Math.min(w ?? 1, count);
}

/**
 * Every section once, in order: repeated sections are dropped, and a missing one (a section a later version added)
 * goes after the section that precedes it by default, in its column, or first.
 */
export function completePlaces(stored: readonly Place[]): Place[] {
  const places: Place[] = [];
  for (const p of stored) if (!places.some((q) => q.id === p.id)) places.push(p);
  ROOM_SECTIONS.forEach((id, i) => {
    if (places.some((p) => p.id === id)) return;
    const before = ROOM_SECTIONS.slice(0, i).reverse().find((b) => places.some((p) => p.id === b));
    const at = before ? places.findIndex((p) => p.id === before) : -1;
    places.splice(at + 1, 0, { id, x: at >= 0 ? places[at].x : 0 });
  });
  return places;
}

/** Where `places` go on a screen `count` section columns wide. */
export function placeAll(t: SectionTemplate, places: readonly Place[], count: number, heights: ReadonlyMap<RoomSectionId, number>): Packed {
  return placeSections(places.map((p) => ({ x: p.x, w: widthOf(t, p.id, count), h: heights.get(p.id)! })), count);
}

/**
 * Where a room's sections go on a screen `count` section columns wide, in order. `heights` holds the sections the
 * room shows, with their heights in cells. A width that hasn't been arranged takes the reading order (top, then left)
 * of the nearest one that has (the smaller on a tie), or the default order, and packs it where each goes highest.
 */
export function arrangeSections(t: SectionTemplate, count: number, heights: ReadonlyMap<RoomSectionId, number>): Place[] {
  const shown = (places: Place[]) => places.filter((p) => heights.has(p.id));
  const stored = t.places[count];
  if (stored) return shown(completePlaces(stored));

  let order = ROOM_SECTIONS.filter((id) => heights.has(id));
  const counts = Object.keys(t.places).map(Number);
  if (counts.length) {
    const near = counts.reduce((a, b) => (Math.abs(b - count) < Math.abs(a - count) || (Math.abs(b - count) === Math.abs(a - count) && b < a) ? b : a));
    const places = shown(completePlaces(t.places[near]));
    const { slots } = placeAll(t, places, near, heights);
    order = places
      .map((p, i) => ({ id: p.id, slot: slots[i] }))
      .sort((a, b) => a.slot.top - b.slot.top || a.slot.column - b.slot.column)
      .map((p) => p.id);
  }
  const { slots } = packSections(order.map((id) => ({ w: widthOf(t, id, count), h: heights.get(id)! })), count);
  return order.map((id, i) => ({ id, x: slots[i].column }));
}

/**
 * Close up the columns no section is in, moving the ones after them left: a room that has fewer sections than the
 * template arranges doesn't keep an empty column.
 */
export function closeUp(t: SectionTemplate, places: readonly Place[], count: number): Place[] {
  const used = new Array<boolean>(count).fill(false);
  for (const p of places) used.fill(true, p.x, p.x + widthOf(t, p.id, count));
  return places.map((p) => ({ id: p.id, x: p.x - used.slice(0, p.x).filter((u) => !u).length }));
}

/**
 * `all` (every section, `completePlaces`) with the sections this room shows in a new order and columns (`shown`):
 * they take the spots the shown ones had, in their new order, so the sections the room doesn't have keep theirs.
 */
export function mergeShown(all: readonly Place[], shown: readonly Place[]): Place[] {
  const ids = new Set(shown.map((p) => p.id));
  let next = 0;
  return all.map((p) => (ids.has(p.id) ? shown[next++] : p));
}

/** A room's sections in this layout, and whether they're its own rather than the template's. */
export function roomSections(layout: HomeLayout, areaId: string): SectionTemplate & { own: boolean } {
  const own = layout.room?.rooms?.[areaId]?.own;
  const room = layout.room;
  const t = own ?? {
    places: room?.places ?? {},
    hidden: room?.hidden ?? [],
    widths: room?.widths ?? {},
    names: room?.names ?? {},
  };
  return { ...t, own: !!own };
}

/** Entities hidden from a room's screen. */
export const hiddenEntities = (layout: HomeLayout, areaId: string): readonly string[] =>
  layout.room?.rooms?.[areaId]?.hide ?? [];

// ---- Reading what's stored ----

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sectionList = (value: unknown): RoomSectionId[] =>
  Array.isArray(value) ? [...new Set(value.filter(isSectionId))] : [];

const isCount = (key: string) => /^[1-9]\d*$/.test(key);

function placesOf(value: Record<string, unknown>): Record<string, Place[]> {
  const out: Record<string, Place[]> = {};
  if (isObject(value.places)) {
    for (const [count, places] of Object.entries(value.places)) {
      if (!isCount(count) || !Array.isArray(places)) continue;
      const list = places.filter(
        (p): p is Place => isObject(p) && isSectionId(p.id) && Number.isInteger(p.x) && (p.x as number) >= 0,
      );
      if (list.length) out[count] = list.map((p) => ({ id: p.id, x: p.x }));
    }
  } else if (isObject(value.columns)) {
    // The first arrangements stored sections by column: their rows taken in turn place every section the same way.
    for (const [count, columns] of Object.entries(value.columns)) {
      if (!isCount(count) || !Array.isArray(columns)) continue;
      const lists = columns.map(sectionList);
      const list: Place[] = [];
      for (let row = 0; row < Math.max(0, ...lists.map((l) => l.length)); row++) {
        lists.forEach((l, x) => l[row] && list.push({ id: l[row], x }));
      }
      if (list.length) out[count] = list;
    }
  }
  return out;
}

function widthsOf(value: unknown): SectionTemplate["widths"] {
  const out: SectionTemplate["widths"] = {};
  if (!isObject(value)) return out;
  for (const [id, w] of Object.entries(value)) {
    if (isSectionId(id) && (w === "full" || (Number.isInteger(w) && (w as number) > 1))) out[id] = w as SectionWidth;
  }
  return out;
}

function namesOf(value: unknown): SectionTemplate["names"] {
  const out: SectionTemplate["names"] = {};
  if (!isObject(value)) return out;
  for (const [id, name] of Object.entries(value)) {
    if (isSectionId(id) && typeof name === "string" && name.trim()) out[id] = name.trim().slice(0, NAME_LENGTH);
  }
  return out;
}

function sectionsOf(value: Record<string, unknown>): SectionTemplate {
  return { places: placesOf(value), hidden: sectionList(value.hidden), widths: widthsOf(value.widths), names: namesOf(value.names) };
}

/** The fields of `t` that differ from the default. */
function changes(t: SectionTemplate): Partial<SectionTemplate> {
  const out: Partial<SectionTemplate> = {};
  if (Object.keys(t.places).length) out.places = t.places;
  if (t.hidden.length) out.hidden = t.hidden;
  if (Object.keys(t.widths).length) out.widths = t.widths;
  if (Object.keys(t.names).length) out.names = t.names;
  return out;
}

/** Read a stored `room` value defensively; undefined when there's nothing usable. */
export function parseRoomLayout(value: unknown): RoomLayout | undefined {
  if (!isObject(value)) return undefined;
  const room: RoomLayout = changes(sectionsOf(value));
  if (isObject(value.rooms)) {
    const rooms: Record<string, RoomOverride> = {};
    for (const [areaId, r] of Object.entries(value.rooms)) {
      if (!isObject(r)) continue;
      const override: RoomOverride = {};
      if (isObject(r.own)) override.own = sectionsOf(r.own);
      if (Array.isArray(r.hide)) {
        const hide = [...new Set(r.hide.filter((id): id is string => typeof id === "string"))];
        if (hide.length) override.hide = hide;
      }
      if (override.own || override.hide) rooms[areaId] = override;
    }
    if (Object.keys(rooms).length) room.rooms = rooms;
  }
  return Object.keys(room).length ? room : undefined;
}

// ---- Changing it ----

/** `room` with the template set to `t`; the default isn't stored. */
export function withTemplate(room: RoomLayout | undefined, t: SectionTemplate): RoomLayout | undefined {
  const next: RoomLayout = { ...changes(t) };
  if (room?.rooms) next.rooms = room.rooms;
  return Object.keys(next).length ? next : undefined;
}

/** `room` with one room's override changed by `change`; an empty override isn't stored. */
export function withRoom(
  room: RoomLayout | undefined,
  areaId: string,
  change: (override: RoomOverride) => RoomOverride,
): RoomLayout | undefined {
  const { [areaId]: current, ...others } = room?.rooms ?? {};
  const override = change({ ...current });
  if (!override.own) delete override.own;
  if (!override.hide?.length) delete override.hide;
  const rooms = Object.keys(override).length ? { ...others, [areaId]: override } : others;
  const { rooms: _, ...rest } = room ?? {};
  const next: RoomLayout = Object.keys(rooms).length ? { ...rest, rooms } : rest;
  return Object.keys(next).length ? next : undefined;
}
