import { DEFAULT_CARD, type CardKind, type RoomLayout } from "../layout/houseLayout";
import { denseRows, type Size } from "../layout/pack";
import { SIZES } from "../layout/sizes";
import type { Room } from "./home";

/**
 * A room card's size in whole cells (LAYOUTS.md, "Room cards"): its top cell row is the title band, each row
 * below holds one row of `w` controls. The default, M: a title row and 2 rows of 4.
 */
export const DEFAULT_CARD_SIZE: Size = { w: 4, h: 3 };

/** A card's size on a screen `cols` cells wide: never wider than the screen. */
export const fitCard = (size: Size, cols: number): Size => ({ w: Math.min(size.w, cols), h: size.h });

/** How an entity appears on a card. */
export type CardItem =
  | { kind: "toggle"; id: string; size: Size }
  | { kind: "climate"; id: string; size: Size }
  | { kind: "sensor"; id: string; size: Size }
  | { kind: "more"; count: number; size: Size };

type Control = Exclude<CardItem, { kind: "more" }>;

/** The room's entities of each card kind, and how they appear. */
const SOURCES: Record<CardKind, { ids: (room: Room) => string[]; item: (id: string) => Control }> = {
  lights: { ids: (r) => r.lights, item: (id) => ({ kind: "toggle", id, size: SIZES.toggleButton }) },
  switches: { ids: (r) => r.switches, item: (id) => ({ kind: "toggle", id, size: SIZES.toggleButton }) },
  climate: { ids: (r) => r.climate, item: (id) => ({ kind: "climate", id, size: SIZES.climateCompact }) },
  sensors: { ids: (r) => r.sensors, item: (id) => ({ kind: "sensor", id, size: SIZES.sensorButton }) },
};

/**
 * The controls on a room's card of `size`: pinned entities first, then the card's kinds in order (default:
 * lights, then climate), without hidden ones. What doesn't fit in the card's rows is replaced by a "+N" button that opens the room;
 * when something has to go, pinned entities are kept first, then climate, then the rest. The order on screen
 * stays as listed.
 */
export function roomCardItems(room: Room, size: Size, layout?: RoomLayout): CardItem[] {
  const hidden = new Set(layout?.hide);
  const seen = new Set<string>();
  const all: Control[] = [];
  const add = (item: Control) => {
    if (hidden.has(item.id) || seen.has(item.id)) return;
    seen.add(item.id);
    all.push(item);
  };

  // A pinned entity shows whatever its kind; it must be in this room.
  const kindOf = (id: string) => (Object.keys(SOURCES) as CardKind[]).find((k) => SOURCES[k].ids(room).includes(id));
  for (const id of layout?.pin ?? []) {
    const kind = kindOf(id);
    if (kind) add(SOURCES[kind].item(id));
  }
  const pinned = all.length;
  for (const kind of layout?.card ?? DEFAULT_CARD) for (const id of SOURCES[kind].ids(room)) add(SOURCES[kind].item(id));

  const fits = (items: { size: Size }[]) => denseRows(items.map((i) => i.size), size.w) <= size.h - 1;
  if (fits(all)) return all;

  const more = { size: SIZES.more };
  const kept = new Set<Control>();
  const byPriority = [
    ...all.slice(0, pinned),
    ...all.slice(pinned).filter((i) => i.kind === "climate"),
    ...all.slice(pinned).filter((i) => i.kind !== "climate"),
  ];
  for (const item of byPriority) {
    const next = all.filter((i) => kept.has(i) || i === item); // in display order
    if (fits([...next, more])) kept.add(item);
  }
  const shown = all.filter((i) => kept.has(i));
  return [...shown, { kind: "more", count: all.length - shown.length, size: SIZES.more }];
}
