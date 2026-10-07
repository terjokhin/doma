import { byFloor, hiddenOf, nearestGrid, rowsOf, sizeOf, slotsOf, type CardSize, type HomeLayout, type Position } from "../layout/homeLayout";
import type { Size } from "../layout/pack";
import { fillRows, flow, type Drop } from "../layout/rows";
import type { FloorGroup, Room } from "./home";
import { CARD_CELLS, fitCard, roomCardItems, shownSize, type CardItem } from "./roomCard";

export interface RoomCardView {
  room: Room;
  /** The card's size as the layout names it. */
  sizeName: CardSize;
  /** The card's size in cells, fitted to the screen and to its tiles. */
  size: Size;
  /** Its own controls, in order; undefined when it shows the generated ones. */
  slots?: string[];
  /** Where it sits on its floor's grid: `x` in columns, `y` in rows of half a cell (see layout/rows.ts). */
  x: number;
  y: number;
  /** Whether other cards share its row: a stack. */
  stacked: boolean;
  items: CardItem[];
}

export interface FloorView {
  key: string;
  /** undefined: rooms without a floor. */
  name?: string;
  /** False on the one grid of a home screen that doesn't group by floor. */
  heading: boolean;
  /** In reading order. */
  rooms: RoomCardView[];
  /** Its rows: `y` and `h` in rows of half a cell, `first` the area ID that names the row. */
  rows: { first: string; y: number; h: number }[];
  /** In edit mode, the gaps before, between and after its rows, half a cell tall: a card dropped there gets a row. */
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

/** Grid rows a card spans: its height in cells, in rows of half a cell. */
export const gridRows = (size: Size) => size.h * 2;

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

/** The key of the one grid on a home screen that doesn't group by floor. */
const ALL_ROOMS = "_all";

/**
 * The width rows are filled to for a home that never set them, and for rooms its rows don't list: a landscape
 * tablet's, so the same on every screen.
 */
const FILL_COLS = 12;

interface Group {
  key: string;
  name?: string;
  heading: boolean;
  /** Every room in it, hidden ones too, in the order rows are filled in. */
  rooms: Room[];
}

/**
 * Home's groups of cards: one per floor, or one for all rooms. Their rooms are in the order from before rows were
 * kept (`order`, or an arrangement from when cards were placed freely), else HA's.
 */
function groupsOf(model: FloorGroup[], layout: HomeLayout): Group[] {
  const floorOrder = (rooms: Room[]) =>
    layout.order ? inOrder(rooms, layout.order) : readingOrder(rooms, nearestGrid(layout.grids, FILL_COLS));
  if (byFloor(layout)) {
    return model.map((g) => ({ key: g.floor?.floor_id ?? "_none", name: g.floor?.name, heading: true, rooms: floorOrder(g.rooms) }));
  }
  const floorByFloor = model.flatMap((g) => floorOrder(g.rooms));
  const rooms = layout.flatOrder
    ? inOrder(floorByFloor, layout.flatOrder)
    : layout.flatGrids
      ? readingOrder(floorByFloor, nearestGrid(layout.flatGrids, FILL_COLS))
      : floorByFloor;
  return [{ key: ALL_ROOMS, heading: false, rooms }];
}

/**
 * Home's rows of cards in this layout, by area ID, every floor's and hidden rooms too (see `rows` in the home
 * layout): the stored rows, without rooms HA no longer has, then rows filled with the rooms they don't list.
 */
export function homeRows(model: FloorGroup[], layout: HomeLayout, groups = groupsOf(model, layout)): string[][] {
  const known = new Set(groups.flatMap((g) => g.rooms.map((r) => r.area.area_id)));
  const listed = new Set<string>();
  const rows = (rowsOf(layout) ?? [])
    .map((row) => row.filter((id) => known.has(id) && !listed.has(id) && !!listed.add(id)))
    .filter((row) => row.length > 0);
  const hidden = new Set(hiddenOf(layout));
  for (const group of groups) {
    const rest = group.rooms.filter((r) => !listed.has(r.area.area_id));
    const width = (r: Room) => ({ id: r.area.area_id, w: CARD_CELLS[sizeOf(layout, r.area.area_id)].w });
    // The rooms on show first, so a home that never set its rows looks as it did.
    rows.push(...fillRows(rest.filter((r) => !hidden.has(r.area.area_id)).map(width), FILL_COLS));
    rows.push(...fillRows(rest.filter((r) => hidden.has(r.area.area_id)).map(width), FILL_COLS));
  }
  return rows;
}

/**
 * The home screen on a screen `cols` cells wide: the generated model with the home layout applied. Each card has
 * the layout's size, fitted to the screen and only as tall as its tiles (in edit mode a row more where the size
 * allows, to add one). Cards go in the layout's rows (`homeRows`), one under another; a row wider than the screen
 * wraps inside itself. In edit mode the rows are half a cell apart, with a band there to drop a card into a new
 * row. Hidden rooms have no card, and floors without rooms are dropped.
 */
export function homeView(model: FloorGroup[], layout: HomeLayout, cols: number, editing = false): FloorView[] {
  const hidden = new Set(hiddenOf(layout));
  const groups = groupsOf(model, layout);
  const allRows = homeRows(model, layout, groups);
  const band = editing ? 1 : 0;

  return groups
    .map((group) => {
      const here = new Map(group.rooms.filter((r) => !hidden.has(r.area.area_id)).map((r) => [r.area.area_id, r]));
      const rooms: RoomCardView[] = [];
      const rows: FloorView["rows"] = [];
      let y = band;
      for (const ids of allRows) {
        const cards = ids.flatMap((id) => {
          const room = here.get(id);
          if (!room) return [];
          const sizeName = sizeOf(layout, id);
          const slots = slotsOf(layout, id);
          const max = fittedSize(sizeName, cols);
          const items = cardItems(room, max, slots);
          return [{ room, sizeName, size: cached(shownSize(max, items, editing ? 1 : 0)), slots, items }];
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
      const bands: FloorView["bands"] = !editing
        ? []
        : rows.map((row, i) => ({
            y: i === 0 ? 0 : rows[i - 1].y + rows[i - 1].h,
            drop: { kind: "before" as const, row: row.first },
          }));
      if (editing && rows.length) {
        const last = rows[rows.length - 1];
        bands.push({ y: last.y + last.h, drop: { kind: "after", row: last.first } });
      }
      return { key: group.key, name: group.name, heading: group.heading, rooms, rows, bands };
    })
    .filter((floor) => floor.rooms.length > 0);
}
