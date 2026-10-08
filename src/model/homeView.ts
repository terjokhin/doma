import { hiddenOf, nearestGrid, roomNameOf, rowsOf, sizeOf, slotsOf, type CardSize, type HomeLayout, type Position } from "../layout/homeLayout";
import type { Size } from "../layout/pack";
import { boardView, sameSize, type Board, type BoardItem, type Placed } from "../layout/board";
import type { FloorGroup, Room } from "./home";
import { CARD_CELLS, fitCard, roomCardItems, shownSize, type CardItem } from "./roomCard";

/** A room's card on Home. */
export interface RoomCard extends BoardItem {
  room: Room;
  /** Its name: given in Doma, else HA's. */
  name: string;
  /** The card's size as the layout names it. */
  sizeName: CardSize;
  /** Its own controls, in order; undefined when it shows the generated ones. */
  slots?: string[];
  items: CardItem[];
}

export type RoomCardView = Placed<RoomCard>;

/*
 * A card's size and controls only change with its size, not with its position: the same size object (`sameSize`)
 * and the same list of controls while cards move (each step of a drag re-places every card) mean no card re-renders
 * for a move.
 */
const fittedSize = (name: CardSize, cols: number) => sameSize(fitCard(CARD_CELLS[name], cols));

// A card's own list is a new array only when that card's list changes, so it can be compared by identity.
const itemCache = new WeakMap<Room, Map<Size, { slots?: string[]; items: CardItem[] }>>();
function cardItems(room: Room, size: Size, slots: string[] | undefined): CardItem[] {
  let bySize = itemCache.get(room);
  if (!bySize) itemCache.set(room, (bySize = new Map()));
  let cached = bySize.get(size);
  if (!cached || cached.slots !== slots) bySize.set(size, (cached = { slots, items: roomCardItems(room, size, slots) }));
  return cached.items;
}

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
 * The home screen on a screen `cols` cells wide: the generated model with the home layout applied, a board of room
 * cards (layout/board.ts). Each card has the layout's size, fitted to the screen and only as tall as its tiles (in
 * edit mode, the `selected` card with a free cell more where the size allows, to add one), in the layout's rows
 * (`homeRows`). Hidden rooms have no card. (Until 2026-10-07 Home could group its cards by floor, under a heading
 * each.)
 */
export function homeView(
  model: FloorGroup[],
  layout: HomeLayout,
  cols: number,
  editing = false,
  selected: string | null = null,
): Board<RoomCard> {
  const hidden = new Set(hiddenOf(layout));
  const cards = new Map<string, RoomCard>();
  for (const room of allRoomsOf(model)) {
    const id = room.area.area_id;
    if (hidden.has(id)) continue;
    const sizeName = sizeOf(layout, id);
    const slots = slotsOf(layout, id);
    const max = fittedSize(sizeName, cols);
    const items = cardItems(room, max, slots);
    const size = sameSize(shownSize(max, items, editing && id === selected ? 1 : 0));
    cards.set(id, { id, room, name: roomNameOf(layout, room.area), sizeName, size, slots, items });
  }
  return boardView(homeRows(model, layout), cards, cols, editing);
}

const allRoomsOf = (model: FloorGroup[]) => model.flatMap((g) => g.rooms);
