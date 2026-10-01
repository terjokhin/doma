import { sizeOf, type CardSize, type HomeLayout } from "../layout/homeLayout";
import type { Size } from "../layout/pack";
import type { FloorGroup, Room } from "./home";
import { CARD_CELLS, fitCard, roomCardItems, type CardItem } from "./roomCard";

export interface RoomCardView {
  room: Room;
  /** The card's size as the layout names it. */
  sizeName: CardSize;
  /** The card's size in cells, fitted to the screen. */
  size: Size;
  items: CardItem[];
}

export interface FloorView {
  key: string;
  /** undefined: rooms without a floor. */
  name?: string;
  rooms: RoomCardView[];
}

/**
 * The home screen on a screen `cols` cells wide: the generated model with the home layout applied. Listed rooms
 * come first in the layout's order and the rest follow in their default order (so a new room shows up at the end
 * of its floor), and each room's card has the layout's size, fitted to the screen. Floors without rooms are
 * dropped.
 */
export function homeView(model: FloorGroup[], layout: HomeLayout, cols: number): FloorView[] {
  const rank = new Map((layout.order ?? []).map((id, i) => [id, i]));
  const position = (room: Room) => rank.get(room.area.area_id) ?? Infinity;

  return model
    .map((group) => ({
      key: group.floor?.floor_id ?? "_none",
      name: group.floor?.name,
      rooms: group.rooms
        .map((room, index) => ({ room, index }))
        .sort((a, b) => position(a.room) - position(b.room) || a.index - b.index)
        .map(({ room }) => {
          const sizeName = sizeOf(layout, room.area.area_id);
          const size = fitCard(CARD_CELLS[sizeName], cols);
          return { room, sizeName, size, items: roomCardItems(room, size) };
        }),
    }))
    .filter((floor) => floor.rooms.length > 0);
}
