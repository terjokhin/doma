import { nearestGrid, sizeOf, type CardSize, type HomeLayout } from "../layout/homeLayout";
import type { Size } from "../layout/pack";
import { arrange } from "../layout/place";
import type { FloorGroup, Room } from "./home";
import { CARD_CELLS, fitCard, roomCardItems, type CardItem } from "./roomCard";

export interface RoomCardView {
  room: Room;
  /** The card's size as the layout names it. */
  sizeName: CardSize;
  /** The card's size in cells, fitted to the screen. */
  size: Size;
  /** Where it sits on its floor's grid: `x` in columns, `y` in rows of half a cell (see layout/place.ts). */
  x: number;
  y: number;
  items: CardItem[];
}

export interface FloorView {
  key: string;
  /** undefined: rooms without a floor. */
  name?: string;
  /** In reading order. */
  rooms: RoomCardView[];
}

/*
 * A card's size and controls only change with its size, not with its position. Reusing the same objects while
 * cards move (each step of a drag re-places every card) means no card re-renders for a move. Keyed by the room
 * object, which is new whenever the model is rebuilt, so the cache never goes stale.
 */
const sizeCache = new Map<string, Size>();
function fittedSize(name: CardSize, cols: number): Size {
  const key = `${name}/${cols}`;
  let size = sizeCache.get(key);
  if (!size) sizeCache.set(key, (size = fitCard(CARD_CELLS[name], cols)));
  return size;
}

const itemCache = new WeakMap<Room, Map<Size, CardItem[]>>();
function cardItems(room: Room, size: Size): CardItem[] {
  let bySize = itemCache.get(room);
  if (!bySize) itemCache.set(room, (bySize = new Map()));
  let items = bySize.get(size);
  if (!items) bySize.set(size, (items = roomCardItems(room, size)));
  return items;
}

/** Grid rows a card spans: its height in cells, in rows of half a cell. */
export const gridRows = (size: Size) => size.h * 2;

/**
 * The home screen on a screen `cols` cells wide: the generated model with the home layout applied. Each card has
 * the layout's size, fitted to the screen, and sits where the layout's grid for this column count puts it.
 * Cards it doesn't place (new rooms, or a column count not arranged yet) fill the free spots in the reading
 * order of the nearest arranged grid, else in the default order. Floors without rooms are dropped.
 */
export function homeView(model: FloorGroup[], layout: HomeLayout, cols: number): FloorView[] {
  const grid = layout.grids?.[cols];
  const reference = grid ?? nearestGrid(layout, cols);
  const rank = (room: Room) => {
    const p = reference?.[room.area.area_id];
    return p ? p.y * 1000 + p.x : Infinity;
  };

  return model
    .map((group) => {
      const cards = group.rooms
        .map((room, index) => ({ room, index }))
        .sort((a, b) => rank(a.room) - rank(b.room) || a.index - b.index)
        .map(({ room }) => {
          const sizeName = sizeOf(layout, room.area.area_id);
          return { room, sizeName, size: fittedSize(sizeName, cols) };
        });
      const boxes = arrange(
        cards.map((c) => ({ id: c.room.area.area_id, w: c.size.w, h: gridRows(c.size) })),
        cols,
        grid,
      );
      const byId = new Map(cards.map((c) => [c.room.area.area_id, c]));
      return {
        key: group.floor?.floor_id ?? "_none",
        name: group.floor?.name,
        rooms: boxes.map((b) => {
          const card = byId.get(b.id)!;
          return { ...card, x: b.x, y: b.y, items: cardItems(card.room, card.size) };
        }),
      };
    })
    .filter((floor) => floor.rooms.length > 0);
}
