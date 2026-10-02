import type { HomeLayout } from "./homeLayout";
import { GAP } from "./grid.svelte";
import { packSections } from "./pack";

/**
 * The room template (LAYOUTS.md, "Room screens"): which sections a room screen shows, in which column and in what
 * order, for each screen width. Every room follows one template unless it has its own arrangement; each room can also
 * hide entities from its screen. Stored in the home layout as `room`, as changes only.
 */

/** A room screen's sections, in their default order. */
export const ROOM_SECTIONS = ["scenes", "lights", "climate", "switches", "media", "sensors"] as const;
export type RoomSectionId = (typeof ROOM_SECTIONS)[number];

/** Sections by column, top to bottom. */
export type Columns = RoomSectionId[][];

/** Where a room's sections go, and which are hidden. */
export interface SectionTemplate {
  /**
   * Sections by column, for each number of section columns: "1" on a phone, "2" on a portrait tablet, "3" on a
   * landscape one, "4" on a large screen. A width without its own follows the nearest one (`arrangeSections`).
   */
  columns: Record<string, Columns>;
  hidden: RoomSectionId[];
}

export interface RoomOverride {
  /** This room's own sections. Unset: it follows the template. */
  own?: SectionTemplate;
  /** Entities hidden from this room's screen (only there: lenses and the room card still show them). */
  hide?: string[];
}

export interface RoomLayout {
  /** The template's columns. Unset: the default order, packed. */
  columns?: Record<string, Columns>;
  /** Sections the template hides. */
  hidden?: RoomSectionId[];
  /** Per room, by area ID. */
  rooms?: Record<string, RoomOverride>;
}

export const DEFAULT_SECTIONS: SectionTemplate = { columns: {}, hidden: [] };

const isSectionId = (value: unknown): value is RoomSectionId =>
  (ROOM_SECTIONS as readonly unknown[]).includes(value);

/**
 * `stored` as exactly `count` columns holding every section once: unknown and repeated sections are dropped, the
 * sections of extra columns go to the end of the last one, and a missing section (one a later version added) goes
 * after the section that precedes it by default, so it shows up where it would have been.
 */
export function completeColumns(stored: readonly (readonly RoomSectionId[])[], count: number): Columns {
  const seen = new Set<RoomSectionId>();
  const columns: Columns = Array.from({ length: count }, () => []);
  stored.forEach((column, i) => {
    for (const id of column) {
      if (!isSectionId(id) || seen.has(id)) continue;
      seen.add(id);
      columns[Math.min(i, count - 1)].push(id);
    }
  });
  ROOM_SECTIONS.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    const before = ROOM_SECTIONS.slice(0, i).reverse().find((b) => columns.some((c) => c.includes(b)));
    const column = before ? columns.find((c) => c.includes(before))! : columns[0];
    column.splice(before ? column.indexOf(before) + 1 : 0, 0, id);
  });
  return columns;
}

/** Where each section of `columns` starts, in cells from the top: they're stacked with a gap between them. */
function stackTops(columns: Columns, height: (id: RoomSectionId) => number) {
  const tops = new Map<RoomSectionId, { top: number; column: number }>();
  columns.forEach((column, i) => {
    let top = 0;
    for (const id of column) {
      tops.set(id, { top, column: i });
      top += height(id) + GAP;
    }
  });
  return tops;
}

/**
 * Where a room's sections go on a screen `count` section columns wide, by column, top to bottom. `heights` holds the
 * sections the room shows, with their heights in cells. A width that hasn't been arranged takes the reading order
 * (top, then left) of the nearest one that has (the smaller on a tie), or the default order, and packs it into the
 * shortest columns. Columns may come out empty.
 */
export function arrangeSections(t: SectionTemplate, count: number, heights: ReadonlyMap<RoomSectionId, number>): Columns {
  const stored = t.columns[count];
  if (stored) return completeColumns(stored, count).map((c) => c.filter((id) => heights.has(id)));

  const counts = Object.keys(t.columns).map(Number);
  let shown = ROOM_SECTIONS.filter((id) => heights.has(id));
  if (counts.length) {
    const near = counts.reduce((a, b) => (Math.abs(b - count) < Math.abs(a - count) || (Math.abs(b - count) === Math.abs(a - count) && b < a) ? b : a));
    const columns = completeColumns(t.columns[near], near).map((c) => c.filter((id) => heights.has(id)));
    const tops = stackTops(columns, (id) => heights.get(id)!);
    shown = columns.flat().sort((a, b) => tops.get(a)!.top - tops.get(b)!.top || tops.get(a)!.column - tops.get(b)!.column);
  }
  const { slots } = packSections(shown.map((id) => heights.get(id)!), count);
  const columns: Columns = Array.from({ length: count }, () => []);
  shown.forEach((id, i) => columns[slots[i].column].push(id));
  return columns;
}

/**
 * Move a section to `column`, before the section shown at `index` there (or after the last one shown). `all` holds
 * every section (`completeColumns`), `shown` the ones this room shows, in the same columns: sections the room doesn't
 * have keep their place among the others.
 */
export function moveSection(all: Columns, shown: Columns, id: RoomSectionId, column: number, index: number): Columns {
  const next = all.map((c) => c.filter((x) => x !== id));
  const target = shown[column].filter((x) => x !== id);
  const into = next[column];
  const before = target[index];
  const last = target[target.length - 1];
  into.splice(before ? into.indexOf(before) : last ? into.indexOf(last) + 1 : into.length, 0, id);
  return next;
}

/** A room's sections in this layout, and whether they're its own rather than the template's. */
export function roomSections(layout: HomeLayout, areaId: string): SectionTemplate & { own: boolean } {
  const own = layout.room?.rooms?.[areaId]?.own;
  const t = own ?? { columns: layout.room?.columns ?? {}, hidden: layout.room?.hidden ?? [] };
  return { ...t, own: !!own };
}

/** Entities hidden from a room's screen. */
export const hiddenEntities = (layout: HomeLayout, areaId: string): readonly string[] =>
  layout.room?.rooms?.[areaId]?.hide ?? [];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sectionList = (value: unknown): RoomSectionId[] | undefined =>
  Array.isArray(value) ? [...new Set(value.filter(isSectionId))] : undefined;

function columnsOf(value: unknown): Record<string, Columns> {
  const out: Record<string, Columns> = {};
  if (!isObject(value)) return out;
  for (const [count, columns] of Object.entries(value)) {
    if (/^[1-9]\d*$/.test(count) && Array.isArray(columns) && columns.length) {
      out[count] = columns.map((c) => sectionList(c) ?? []);
    }
  }
  return out;
}

/** Read a stored `room` value defensively; undefined when there's nothing usable. */
export function parseRoomLayout(value: unknown): RoomLayout | undefined {
  if (!isObject(value)) return undefined;
  const room: RoomLayout = {};
  const columns = columnsOf(value.columns);
  const hidden = sectionList(value.hidden);
  if (Object.keys(columns).length) room.columns = columns;
  if (hidden?.length) room.hidden = hidden;
  if (isObject(value.rooms)) {
    const rooms: Record<string, RoomOverride> = {};
    for (const [areaId, r] of Object.entries(value.rooms)) {
      if (!isObject(r)) continue;
      const override: RoomOverride = {};
      if (isObject(r.own)) override.own = { columns: columnsOf(r.own.columns), hidden: sectionList(r.own.hidden) ?? [] };
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

/** `room` with the template set to `t`; the default isn't stored. */
export function withTemplate(room: RoomLayout | undefined, t: SectionTemplate): RoomLayout | undefined {
  const { columns: _, hidden: __, ...rest } = room ?? {};
  const next: RoomLayout = { ...rest };
  if (Object.keys(t.columns).length) next.columns = t.columns;
  if (t.hidden.length) next.hidden = t.hidden;
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
