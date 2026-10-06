import { byFloor, hiddenOf, nearestGrid, sizeOf, slotsOf, type CardSize, type HomeLayout, type Position } from "../layout/homeLayout";
import type { Size } from "../layout/pack";
import { rows } from "../layout/rows";
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
 * The home screen on a screen `cols` cells wide: the generated model with the home layout applied. Each card has
 * the layout's size, fitted to the screen and only as tall as its tiles (in edit mode a row more where the size
 * allows, to add one). Cards go in rows, in the layout's order (`order`, or `flatOrder` when Home doesn't group by
 * floor), the same on every screen width; rooms it doesn't list follow in HA's order. An arrangement from when cards
 * were placed freely (`grids`) gives the order until one is set. Hidden rooms have no card, and floors without rooms
 * are dropped.
 */
export function homeView(model: FloorGroup[], layout: HomeLayout, cols: number, editing = false): FloorView[] {
  const hidden = new Set(hiddenOf(layout));
  const shown = (rooms: Room[]) => (hidden.size ? rooms.filter((r) => !hidden.has(r.area.area_id)) : rooms);
  const floorOrder = (rooms: Room[]) =>
    layout.order ? inOrder(rooms, layout.order) : readingOrder(rooms, nearestGrid(layout.grids, cols));

  let groups: { key: string; name?: string; heading: boolean; rooms: Room[] }[];
  if (byFloor(layout)) {
    groups = model.map((g) => ({ key: g.floor?.floor_id ?? "_none", name: g.floor?.name, heading: true, rooms: floorOrder(shown(g.rooms)) }));
  } else {
    const floorByFloor = model.flatMap((g) => floorOrder(shown(g.rooms)));
    const rooms = layout.flatOrder
      ? inOrder(floorByFloor, layout.flatOrder)
      : layout.flatGrids
        ? readingOrder(floorByFloor, nearestGrid(layout.flatGrids, cols))
        : floorByFloor;
    groups = [{ key: ALL_ROOMS, heading: false, rooms }];
  }

  return groups
    .map((group) => {
      const cards = group.rooms.map((room) => {
        const sizeName = sizeOf(layout, room.area.area_id);
        const slots = slotsOf(layout, room.area.area_id);
        const max = fittedSize(sizeName, cols);
        const items = cardItems(room, max, slots);
        return { room, sizeName, size: cached(shownSize(max, items, editing ? 1 : 0)), slots, items };
      });
      const boxes = rows(
        cards.map((c) => ({ id: c.room.area.area_id, w: c.size.w, h: gridRows(c.size) })),
        cols,
      );
      return {
        key: group.key,
        name: group.name,
        heading: group.heading,
        rooms: boxes.map((b, i) => ({ ...cards[i], x: b.x, y: b.y })),
      };
    })
    .filter((floor) => floor.rooms.length > 0);
}
