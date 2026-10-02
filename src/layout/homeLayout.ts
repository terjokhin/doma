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
export const CARD_SIZES = ["xs", "s", "m", "l", "wide"] as const;
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
  /** Card positions by column count ("12", "4", …), then by area ID. */
  grids?: Record<string, Record<string, Position>>;
  /** The tabs after Home, in order. Unset: every lens, in LENS_IDS order. */
  tabs?: LensId[];
  /** The room template, and what each room changes on top of it. */
  room?: RoomLayout;
}

export const EMPTY_LAYOUT: HomeLayout = { version: 1 };

/** The tabs after Home in this layout. */
export const tabsOf = (layout: HomeLayout): readonly LensId[] => layout.tabs ?? LENS_IDS;

/** A room card's size in this layout. */
export const sizeOf = (layout: HomeLayout, areaId: string): CardSize => layout.sizes?.[areaId] ?? DEFAULT_CARD_SIZE;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCoordinate = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

/**
 * The stored grid closest to `cols` columns (the smaller one on a tie), for a screen width that hasn't been
 * arranged yet: its reading order seeds the placement.
 */
export function nearestGrid(layout: HomeLayout, cols: number): Record<string, Position> | undefined {
  const counts = Object.keys(layout.grids ?? {}).map(Number);
  if (!counts.length) return undefined;
  const best = counts.reduce((a, b) => (Math.abs(b - cols) < Math.abs(a - cols) || (Math.abs(b - cols) === Math.abs(a - cols) && b < a) ? b : a));
  return layout.grids![best];
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
      if ((CARD_SIZES as readonly unknown[]).includes(size)) layout.sizes[areaId] = size as CardSize;
    }
  }
  if (isObject(value.grids)) {
    layout.grids = {};
    for (const [cols, cards] of Object.entries(value.grids)) {
      if (!/^[1-9]\d*$/.test(cols) || !isObject(cards)) continue;
      const grid: Record<string, Position> = {};
      for (const [areaId, p] of Object.entries(cards)) {
        if (isObject(p) && isCoordinate(p.x) && isCoordinate(p.y)) grid[areaId] = { x: p.x, y: p.y };
      }
      layout.grids[cols] = grid;
    }
  }
  if (Array.isArray(value.tabs)) {
    layout.tabs = [...new Set(value.tabs.filter((id): id is LensId => typeof id === "string" && isLensId(id)))];
  }
  const room = parseRoomLayout(value.room);
  if (room) layout.room = room;
  return layout;
}
