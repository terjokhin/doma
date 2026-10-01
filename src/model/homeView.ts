import type { HouseLayout } from "../layout/houseLayout";
import type { FloorGroup, Room } from "./home";
import { roomCardItems, type CardItem } from "./roomCard";

export interface RoomCardView {
  room: Room;
  items: CardItem[];
}

export interface FloorView {
  key: string;
  /** undefined: rooms without a floor. */
  name?: string;
  rooms: RoomCardView[];
}

/**
 * The home screen: the generated model with the house layout applied. Hidden rooms are left out, listed rooms
 * come first in the layout's order and the rest follow in their default order (so a new room shows up at the
 * end of its floor), and each room's card follows its room layout. Floors with no rooms left are dropped.
 */
export function homeView(model: FloorGroup[], layout: HouseLayout): FloorView[] {
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
        .map(({ room }) => ({ room, items: roomCardItems(room, layout.rooms?.[room.area.area_id]) })),
    }))
    .filter((floor) => floor.rooms.length > 0);
}
