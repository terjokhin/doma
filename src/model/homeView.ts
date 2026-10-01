import { DEFAULT_CARD_SIZE, type HouseLayout } from "../layout/houseLayout";
import type { Size } from "../layout/pack";
import type { FloorGroup, Room } from "./home";
import { CARD_CELLS, fitCard, roomCardItems, type CardItem } from "./roomCard";

export interface RoomCardView {
  room: Room;
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
 * The home screen on a screen `cols` cells wide: the generated model with the house layout applied. Hidden rooms are left out, listed rooms
 * come first in the layout's order and the rest follow in their default order (so a new room shows up at the
 * end of its floor), and each room's card has the layout's size (fitted to the screen) and follows its room
 * layout. Floors with no rooms left are dropped.
 */
export function homeView(model: FloorGroup[], layout: HouseLayout, cols: number): FloorView[] {
  const sizeOf = (room: Room) => fitCard(CARD_CELLS[layout.sizes?.[room.area.area_id] ?? DEFAULT_CARD_SIZE], cols);
  const hidden = new Set(layout.hidden);
  const rank = new Map((layout.order ?? []).map((id, i) => [id, i]));
  const position = (room: Room) => rank.get(room.area.area_id) ?? Infinity;

  return model
    .map((group) => ({
      key: group.floor?.floor_id ?? "_none",
      name: group.floor?.name,
      rooms: group.rooms
        .filter((room) => !hidden.has(room.area.area_id))
        .map((room, index) => ({ room, index }))
        .sort((a, b) => position(a.room) - position(b.room) || a.index - b.index)
        .map(({ room }) => {
          const size = sizeOf(room);
          return { room, size, items: roomCardItems(room, size, layout.rooms?.[room.area.area_id]) };
        }),
    }))
    .filter((floor) => floor.rooms.length > 0);
}
