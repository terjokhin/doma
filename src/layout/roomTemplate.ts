import { CARD_SIZES, DEFAULT_CARD_SIZE, type CardSize, type HomeLayout } from "./homeLayout";

/**
 * The room template (LAYOUTS.md, "Room screens"): which sections a room screen shows, in which rows, at what size and
 * under what name. A room screen is a board like Home (layout/board.ts) with its sections as the cards. Every room
 * follows one template unless it has its own arrangement; each room can also hide entities from its screen. Stored in
 * the home layout as `room`, as changes only.
 */

/** A room screen's sections, in their default order. */
export const ROOM_SECTIONS = ["scenes", "lights", "climate", "switches", "media", "sensors"] as const;
export type RoomSectionId = (typeof ROOM_SECTIONS)[number];

/** Where a room's sections go, which are hidden, their sizes and their names. */
export interface SectionTemplate {
  /**
   * The sections in rows, like Home's rooms (layout/rows.ts): a section on its own, or a stack of sections side by
   * side. Unset: one row of them all, which wraps on a narrow screen. (Until 2026-10-08 sections were placed in
   * columns, per screen width, as `places` and `widths`; those aren't read any more.)
   */
  rows?: RoomSectionId[][];
  /** Unlisted: DEFAULT_CARD_SIZE. */
  sizes: Partial<Record<RoomSectionId, CardSize>>;
  hidden: RoomSectionId[];
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

export const DEFAULT_SECTIONS: SectionTemplate = { sizes: {}, hidden: [], names: {} };

/** The longest name a section can have. */
export const NAME_LENGTH = 40;

const isSectionId = (value: unknown): value is RoomSectionId =>
  (ROOM_SECTIONS as readonly unknown[]).includes(value);

/**
 * Every section in the template's rows, each once: the stored rows, then a section they don't list (one a later
 * version added) at the end of the last row.
 */
export function sectionRows(t: SectionTemplate): RoomSectionId[][] {
  const seen = new Set<RoomSectionId>();
  const rows = (t.rows ?? [])
    .map((row) => row.filter((id) => !seen.has(id) && !!seen.add(id)))
    .filter((row) => row.length > 0);
  const rest = ROOM_SECTIONS.filter((id) => !seen.has(id));
  if (!rest.length) return rows;
  if (!rows.length) return [rest];
  rows[rows.length - 1].push(...rest);
  return rows;
}

/** A section's size in this template. */
export const sectionSize = (t: SectionTemplate, id: RoomSectionId): CardSize => t.sizes[id] ?? DEFAULT_CARD_SIZE;

/** A room's sections in this layout, and whether they're its own rather than the template's. */
export function roomSections(layout: HomeLayout, areaId: string): SectionTemplate & { own: boolean } {
  const own = layout.room?.rooms?.[areaId]?.own;
  const room = layout.room;
  const t = own ?? {
    rows: room?.rows,
    sizes: room?.sizes ?? {},
    hidden: room?.hidden ?? [],
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

function rowsOf(value: unknown): RoomSectionId[][] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(sectionList).filter((row) => row.length > 0);
}

function sizesOf(value: unknown): SectionTemplate["sizes"] {
  const out: SectionTemplate["sizes"] = {};
  if (!isObject(value)) return out;
  for (const [id, size] of Object.entries(value)) {
    if (isSectionId(id) && (CARD_SIZES as readonly unknown[]).includes(size)) out[id] = size as CardSize;
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
  const t: SectionTemplate = { sizes: sizesOf(value.sizes), hidden: sectionList(value.hidden), names: namesOf(value.names) };
  const rows = rowsOf(value.rows);
  if (rows) t.rows = rows;
  return t;
}

/** The fields of `t` that differ from the default. */
function changes(t: SectionTemplate): Partial<SectionTemplate> {
  const out: Partial<SectionTemplate> = {};
  if (t.rows) out.rows = t.rows;
  if (Object.keys(t.sizes).length) out.sizes = t.sizes;
  if (t.hidden.length) out.hidden = t.hidden;
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
