import { hiddenOf, nearestGrid, roomNameOf, rowsOf, sizeOf, slotsOf, type CardSize, type HomeLayout, type Position } from "../layout/homeLayout";
import type { Size } from "../layout/pack";
import { flow, type Drop } from "../layout/rows";
import type { FloorGroup, Room } from "./home";
import { CARD_CELLS, fitCard, roomCardItems, shownSize, type CardItem } from "./roomCard";

export interface RoomCardView {
  room: Room;
  /** Its name: given in Doma, else HA's. */
  name: string;
  /** The card's size as the layout names it. */
  sizeName: CardSize;
  /** The card's size in cells, fitted to the screen and to its tiles. */
  size: Size;
  /** Its own controls, in order; undefined when it shows the generated ones. */
  slots?: string[];
  /** Where it sits on Home's grid: `x` in columns, `y` in rows of a quarter cell (see layout/rows.ts). */
  x: number;
  y: number;
  /** Whether other cards share its row: a stack. */
  stacked: boolean;
  items: CardItem[];
}

/** Home's one grid of room cards. */
export interface HomeGrid {
  /** In reading order. */
  rooms: RoomCardView[];
  /** Its rows: `y` and `h` in rows of a quarter cell, `first` the area ID that names the row. */
  rows: { first: string; y: number; h: number }[];
  /** In edit mode, the gaps before, between and after its rows, half a cell tall (`BAND_ROWS`): a card dropped there gets a row. */
  bands: { y: number; drop: Drop }[];
}

/*
 * A card's size and controls only change with its size, not with its position. Reusing the same objects while
 * cards move (each step of a drag re-places every card) means no card re-renders for a move. Keyed by the room
 * object, which is new whenever the model is rebuilt, so the cache never goes stale.
 */
const sizeCache = new Map<string, Size>();
function cached(size: Size): Size {
  const key = `${size.w}/${size.h}`;
  let known = sizeCache.get(key);
  if (!known) sizeCache.set(key, (known = size));
  return known;
}
const fittedSize = (name: CardSize, cols: number) => cached(fitCard(CARD_CELLS[name], cols));

// A card's own list is a new array only when that card's list changes, so it can be compared by identity.
const itemCache = new WeakMap<Room, Map<Size, { slots?: string[]; items: CardItem[] }>>();
function cardItems(room: Room, size: Size, slots: string[] | undefined): CardItem[] {
  let bySize = itemCache.get(room);
  if (!bySize) itemCache.set(room, (bySize = new Map()));
  let cached = bySize.get(size);
  if (!cached || cached.slots !== slots) bySize.set(size, (cached = { slots, items: roomCardItems(room, size, slots) }));
  return cached.items;
}

/**
 * Grid rows a card spans: its height in cells, in rows of a quarter cell (four of them and the gaps between make a
 * cell). A title band is two, a row of tiles three (model/roomCard.ts).
 */
export const gridRows = (size: Size) => Math.round(size.h * 4);

/** In edit mode, the band between rows where a card gets a row of its own: half a cell, in grid rows. */
export const BAND_ROWS = 2;

/** Rooms in `order`; those it doesn't list keep their order, after the rest. */
function inOrder(rooms: Room[], order: readonly string[]): Room[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return rooms
    .map((room, index) => ({ room, index }))
    .sort((a, b) => (rank.get(a.room.area.area_id) ?? Infinity) - (rank.get(b.room.area.area_id) ?? Infinity) || a.index - b.index)
    .map(({ room }) => room);
}

/**
 * Rooms in the reading order of `reference`, positions from when cards were placed freely; those it doesn't place
 * keep their order, after the rest.
 */
function readingOrder(rooms: Room[], reference: Record<string, Position> | undefined): Room[] {
  if (!reference) return rooms;
  const rank = (room: Room) => {
    const p = reference[room.area.area_id];
    return p ? p.y * 1000 + p.x : Infinity;
  };
  return rooms
    .map((room, index) => ({ room, index }))
    .sort((a, b) => rank(a.room) - rank(b.room) || a.index - b.index)
    .map(({ room }) => room);
}

/**
 * Home's rooms, floor by floor, every room hidden ones too; in each floor, in the order from before rows were kept
 * (`order`, or an arrangement from when cards were placed freely), else HA's.
 */
function floorsOf(model: FloorGroup[], layout: HomeLayout): Room[][] {
  return model.map((g) => (layout.order ? inOrder(g.rooms, layout.order) : readingOrder(g.rooms, nearestGrid(layout.grids, 8))));
}

/**
 * Home's rows of cards in this layout, by area ID, hidden rooms too (see `rows` in the home layout): the stored rows,
 * without rooms HA no longer has, then a row per floor of the rooms they don't list. So a home that never set its
 * rows starts with one row per floor, and a room new in HA comes in a row of its own after the rest.
 */
export function homeRows(model: FloorGroup[], layout: HomeLayout, floors = floorsOf(model, layout)): string[][] {
  const known = new Set(floors.flatMap((rooms) => rooms.map((r) => r.area.area_id)));
  const listed = new Set<string>();
  const rows = (rowsOf(layout) ?? [])
    .map((row) => row.filter((id) => known.has(id) && !listed.has(id) && !!listed.add(id)))
    .filter((row) => row.length > 0);
  for (const rooms of floors) {
    const rest = rooms.filter((r) => !listed.has(r.area.area_id)).map((r) => r.area.area_id);
    if (rest.length) rows.push(rest);
  }
  return rows;
}

/**
 * The home screen on a screen `cols` cells wide: the generated model with the home layout applied, one grid of room
 * cards. Each card has the layout's size, fitted to the screen and only as tall as its tiles (in edit mode, the
 * `selected` card with a free cell more where the size allows, to add one). Cards go in the layout's rows
 * (`homeRows`), one under another; a row wider than the screen wraps inside itself. In edit mode the rows are half a
 * cell apart, with a band there to drop a card into a new row. Hidden rooms have no card. (Until 2026-10-07 Home
 * could group its cards by floor, under a heading each.)
 */
export function homeView(
  model: FloorGroup[],
  layout: HomeLayout,
  cols: number,
  editing = false,
  selected: string | null = null,
): HomeGrid {
  const hidden = new Set(hiddenOf(layout));
  const here = new Map(allRoomsOf(model).filter((r) => !hidden.has(r.area.area_id)).map((r) => [r.area.area_id, r]));
  const band = editing ? BAND_ROWS : 0;
  const rooms: RoomCardView[] = [];
  const rows: HomeGrid["rows"] = [];
  let y = band;
  for (const ids of homeRows(model, layout)) {
    const cards = ids.flatMap((id) => {
      const room = here.get(id);
      if (!room) return [];
      const sizeName = sizeOf(layout, id);
      const slots = slotsOf(layout, id);
      const max = fittedSize(sizeName, cols);
      const items = cardItems(room, max, slots);
      const size = cached(shownSize(max, items, editing && id === selected ? 1 : 0));
      return [{ room, name: roomNameOf(layout, room.area), sizeName, size, slots, items }];
    });
    if (!cards.length) continue;
    const boxes = flow(
      cards.map((c) => ({ id: c.room.area.area_id, w: c.size.w, h: gridRows(c.size) })),
      cols,
    );
    boxes.forEach((b, i) => rooms.push({ ...cards[i], x: b.x, y: y + b.y, stacked: cards.length > 1 }));
    const h = Math.max(...boxes.map((b) => b.y + b.h));
    rows.push({ first: boxes[0].id, y, h });
    y += h + band;
  }
  const bands: HomeGrid["bands"] = !editing
    ? []
    : rows.map((row, i) => ({ y: i === 0 ? 0 : rows[i - 1].y + rows[i - 1].h, drop: { kind: "before" as const, row: row.first } }));
  if (editing && rows.length) {
    const last = rows[rows.length - 1];
    bands.push({ y: last.y + last.h, drop: { kind: "after", row: last.first } });
  }
  return { rooms, rows, bands };
}

const allRoomsOf = (model: FloorGroup[]) => model.flatMap((g) => g.rooms);
