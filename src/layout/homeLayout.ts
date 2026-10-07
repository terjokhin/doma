import type { AreaEntry } from "../ha/types";
import { isLensId, LENS_IDS, type LensId } from "../model/lenses";
import { parseRoomLayout, type RoomLayout } from "./roomTemplate";

/**
 * The home layout: the user's changes to the screens generated from HA's floors and areas (LAYOUTS.md, "Layout
 * model"): room card sizes, where each card sits for each column count, which tabs follow Home, and the room template
 * (`roomTemplate.ts`). It only stores differences, never a full copy, so new rooms still appear by themselves. Rooms
 * are referenced by area ID, which doesn't change when a room is renamed. Each HA user has their own, in HA's per-user
 * frontend storage under LAYOUT_KEY.
 */

/** Key in HA's per-user frontend data (`frontend/subscribe_user_data` / `set_user_data`). */
export const LAYOUT_KEY = "doma.layout";
/** Where layouts were stored while Doma was called ha-ui; copied to LAYOUT_KEY once (live.ts). */
export const LEGACY_LAYOUT_KEY = "ha-ui.layout";

/** A room card's size on the home screen (LAYOUTS.md, "Room cards"); the cells are in `CARD_CELLS`. */
/**
 * Widths only: every card is as tall as its tiles, up to two rows. Shown as S, M, L and Full; stored under the names
 * they had before (until 2026-10-07: XS, M, Wide 8 cells, Full), so a saved layout keeps its sizes. "s" and "l",
 * once heights, read as "m".
 */
export const CARD_SIZES = ["xs", "m", "wide", "full"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

/** A card's size when the layout doesn't say. */
export const DEFAULT_CARD_SIZE: CardSize = "m";

/** Where a card sits on its floor's grid: `x` in columns, `y` in rows of half a cell, from the top left. */
export interface Position {
  x: number;
  y: number;
}

export interface HomeLayout {
  version: 1;
  /** Room card sizes, by area ID. Unlisted rooms: DEFAULT_CARD_SIZE. */
  sizes?: Record<string, CardSize>;
  /** Rooms without a card on Home, by area ID. Their screens are still reached from the lenses. */
  hidden?: string[];
  /**
   * Names given to rooms in Doma, by area ID, shown everywhere in place of HA's area name. HA's areas aren't
   * renamed: no admin login, and the area name still strips the room from entity names ("Kitchen Spots" → "Spots").
   */
  roomNames?: Record<string, string>;
  /**
   * Home's rows of room cards, by area ID, in order (`layout/rows.ts`): a room on its own, or a stack of rooms side
   * by side. Rooms they don't list get a row per floor after the rest. Unset: a row per floor.
   */
  rows?: string[][];
  /**
   * From when Home could group its cards by floor (until 2026-10-07): `floors: false` meant it didn't, and its rows
   * were `flatRows`. Only read, for the rows that were on screen; the first save keeps them as `rows`.
   */
  floors?: false;
  flatRows?: string[][];
  /**
   * The order of the room cards on Home, by area ID, from before rows were kept (until 2026-10-07). Only read: it
   * orders each floor's first row until the rows are set. Unset: the order of `grids`, else HA's.
   */
  order?: string[];
  /**
   * Card positions by column count ("12", "4", …), then by area ID, from when cards were placed freely (before
   * 2026-10-06). Only read: an arrangement made then seeds the order until the order is set.
   */
  grids?: Record<string, Record<string, Position>>;
  /**
   * A room card's own controls, in order, by area ID: entity IDs, or "lights" for all the room's lights
   * (`model/roomCard.ts`). Unlisted rooms: the generated controls.
   */
  cards?: Record<string, string[]>;
  /** The tabs after Home, in order. Unset: every lens, in LENS_IDS order. */
  tabs?: LensId[];
  /** The room template, and what each room changes on top of it. */
  room?: RoomLayout;
}

export const EMPTY_LAYOUT: HomeLayout = { version: 1 };

/** Home's rows of cards in this layout (the ones on screen in a layout from before 2026-10-07); undefined while never set. */
export const rowsOf = (layout: HomeLayout) => (layout.floors === false ? layout.flatRows : layout.rows);

/** The longest name a room can be given. */
export const ROOM_NAME_MAX = 40;

/** A room's name in this layout: the one given in Doma, else HA's. */
export const roomNameOf = (layout: HomeLayout, area: AreaEntry): string => layout.roomNames?.[area.area_id] ?? area.name;

/** The rooms hidden from Home in this layout. */
export const hiddenOf = (layout: HomeLayout): readonly string[] => layout.hidden ?? [];

/** A room card's own controls in this layout, or undefined when it shows the generated ones. */
export const slotsOf = (layout: HomeLayout, areaId: string): string[] | undefined => layout.cards?.[areaId];

/** The tabs after Home in this layout. */
export const tabsOf = (layout: HomeLayout): readonly LensId[] => layout.tabs ?? LENS_IDS;

/** A room card's size in this layout. */
export const sizeOf = (layout: HomeLayout, areaId: string): CardSize => layout.sizes?.[areaId] ?? DEFAULT_CARD_SIZE;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A card slot: an entity ID, or a word for a control of the room's own ("lights"). */
const SLOT = /^[a-z_]+(\.[a-z0-9_]+)?$/;

const isCoordinate = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

/**
 * The stored grid closest to `cols` columns (the smaller one on a tie), for a screen width that hasn't been
 * arranged yet: its reading order seeds the placement.
 */
export function nearestGrid(
  grids: Record<string, Record<string, Position>> | undefined,
  cols: number,
): Record<string, Position> | undefined {
  const counts = Object.keys(grids ?? {}).map(Number);
  if (!counts.length) return undefined;
  const best = counts.reduce((a, b) => (Math.abs(b - cols) < Math.abs(a - cols) || (Math.abs(b - cols) === Math.abs(a - cols) && b < a) ? b : a));
  return grids![best];
}

function parseGrids(value: unknown): Record<string, Record<string, Position>> | undefined {
  if (!isObject(value)) return undefined;
  const grids: Record<string, Record<string, Position>> = {};
  for (const [cols, cards] of Object.entries(value)) {
    if (!/^[1-9]\d*$/.test(cols) || !isObject(cards)) continue;
    const grid: Record<string, Position> = {};
    for (const [areaId, p] of Object.entries(cards)) {
      if (isObject(p) && isCoordinate(p.x) && isCoordinate(p.y)) grid[areaId] = { x: p.x, y: p.y };
    }
    grids[cols] = grid;
  }
  return grids;
}

/**
 * Read a stored layout defensively: storage may hold anything (nothing yet, another app version, a hand edit).
 * Unknown fields and values are dropped; anything unusable gives the empty layout.
 */
export function parseLayout(value: unknown): HomeLayout {
  if (value == null) return EMPTY_LAYOUT;
  if (!isObject(value) || value.version !== 1) {
    console.warn("Ignoring a stored layout this version doesn't understand:", value);
    return EMPTY_LAYOUT;
  }
  const layout: HomeLayout = { version: 1 };
  if (isObject(value.sizes)) {
    layout.sizes = {};
    for (const [areaId, size] of Object.entries(value.sizes)) {
      if (size === "s" || size === "l") continue; // the heights there used to be: now the default, M
      if ((CARD_SIZES as readonly unknown[]).includes(size)) layout.sizes[areaId] = size as CardSize;
    }
  }
  if (Array.isArray(value.hidden)) {
    layout.hidden = [...new Set(value.hidden.filter((id): id is string => typeof id === "string"))];
  }
  if (isObject(value.roomNames)) {
    const names: Record<string, string> = {};
    for (const [areaId, name] of Object.entries(value.roomNames)) {
      if (typeof name === "string" && name.trim()) names[areaId] = name.trim().slice(0, ROOM_NAME_MAX);
    }
    layout.roomNames = names;
  }
  const grids = parseGrids(value.grids);
  if (grids) layout.grids = grids;
  if (value.floors === false) layout.floors = false;
  if (isObject(value.cards)) {
    layout.cards = {};
    for (const [areaId, slots] of Object.entries(value.cards)) {
      if (!Array.isArray(slots)) continue;
      layout.cards[areaId] = [...new Set(slots.filter((s): s is string => typeof s === "string" && SLOT.test(s)))];
    }
  }
  for (const key of ["rows", "flatRows"] as const) {
    const rows = value[key];
    if (!Array.isArray(rows)) continue;
    const seen = new Set<string>();
    layout[key] = rows
      .map((row) => (Array.isArray(row) ? row : []).filter((id): id is string => typeof id === "string" && !seen.has(id) && !!seen.add(id)))
      .filter((row) => row.length > 0);
  }
  if (Array.isArray(value.order)) {
    layout.order = [...new Set(value.order.filter((id): id is string => typeof id === "string"))];
  }
  if (Array.isArray(value.tabs)) {
    layout.tabs = [...new Set(value.tabs.filter((id): id is LensId => typeof id === "string" && isLensId(id)))];
  }
  const room = parseRoomLayout(value.room);
  if (room) layout.room = room;
  return layout;
}
