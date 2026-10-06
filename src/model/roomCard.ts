import type { CardSize } from "../layout/homeLayout";
import { denseRows, type Size } from "../layout/pack";
import { SIZES } from "../layout/sizes";
import type { Room } from "./home";

/**
 * Each room card size in cells at its largest (LAYOUTS.md, "Room cards"): its width, and a title band of half a
 * cell over as many rows of tiles as it may hold. A card is only as tall as its tiles (`shownSize`). Heights come in
 * half cells: the floor grid has half-cell rows.
 */
export const CARD_CELLS: Record<CardSize, Size> = {
  xs: { w: 2, h: 1.5 },
  s: { w: 4, h: 1.5 },
  m: { w: 4, h: 2.5 },
  l: { w: 4, h: 3.5 },
  wide: { w: 8, h: 2.5 },
};

/** The title band, in cells: the same on every card. */
export const TITLE_CELLS = 0.5;

/** Rows of tiles on a card of `size`: one per cell below the title band. */
export const cardRows = (size: Size) => Math.ceil(size.h - TITLE_CELLS);

/**
 * The size a card shows, at most `max`: its width, and only as tall as its tiles need; `spare` rows more where the
 * size allows (edit mode, so there's room to add one). A card without tiles is just its title.
 */
export function shownSize(max: Size, items: CardItem[], spare = 0): Size {
  const rows = Math.min(cardRows(max), denseRows(items.map((i) => i.size), max.w) + spare);
  return { w: max.w, h: TITLE_CELLS + rows };
}

/** A card's size on a screen `cols` cells wide: never wider than the screen. */
export const fitCard = (size: Size, cols: number): Size => ({ w: Math.min(size.w, cols), h: size.h });

/**
 * A slot in a card's own list of controls (`cards` in the home layout): an entity ID, or ROOM_LIGHTS, one button
 * for all the room's lights. Not an entity ID, since those always have a dot.
 */
export const ROOM_LIGHTS = "lights";

/** How a control appears on a card. `id` is its slot. */
export type CardItem =
  | { kind: "toggle"; id: string; size: Size }
  | { kind: "climate"; id: string; size: Size }
  | { kind: "scene"; id: string; size: Size }
  | { kind: "lights"; id: typeof ROOM_LIGHTS; size: Size }
  | { kind: "more"; count: number; size: Size };

export type Control = Exclude<CardItem, { kind: "more" }>;

/** The control for one slot on this room's card, or undefined when the room no longer has it. */
export function slotControl(room: Room, slot: string): Control | undefined {
  if (slot === ROOM_LIGHTS) return room.lights.length ? { kind: "lights", id: ROOM_LIGHTS, size: SIZES.tile } : undefined;
  if (room.climate.includes(slot)) return { kind: "climate", id: slot, size: SIZES.tile };
  if (room.scenes.includes(slot)) return { kind: "scene", id: slot, size: SIZES.tile };
  if (room.lights.includes(slot) || room.switches.includes(slot)) return { kind: "toggle", id: slot, size: SIZES.tile };
  return undefined;
}

/** What a room's card can hold, in the order a picker lists it: all its lights, then lights, climate, switches, scenes. */
export function slotChoices(room: Room): string[] {
  return [
    ...(room.lights.length ? [ROOM_LIGHTS] : []),
    ...room.lights,
    ...room.climate,
    ...room.switches.filter((id) => !room.lights.includes(id)),
    ...room.scenes,
  ];
}

/** The controls of a card's own list that the room still has, each once, in order. */
export function ownControls(room: Room, slots: readonly string[]): Control[] {
  const controls: Control[] = [];
  for (const slot of new Set(slots)) {
    const control = slotControl(room, slot);
    if (control) controls.push(control);
  }
  return controls;
}

const fitsCard = (items: { size: Size }[], size: Size) => denseRows(items.map((i) => i.size), size.w) <= cardRows(size);

/**
 * The controls on a card of `size` with its own list: in the list's order, as many as fit, then a "+N" button for
 * the rest.
 */
function ownCardItems(room: Room, slots: readonly string[], size: Size): CardItem[] {
  const all = ownControls(room, slots);
  if (fitsCard(all, size)) return all;
  const more = { size: SIZES.more };
  let shown = 0;
  while (shown < all.length && fitsCard([...all.slice(0, shown + 1), more], size)) shown++;
  return [...all.slice(0, shown), { kind: "more", count: all.length - shown, size: SIZES.more }];
}

/**
 * The controls on a room's card of `size`: its own list (`slots`) if it has one, else the generated controls.
 */
export function roomCardItems(room: Room, size: Size, slots?: readonly string[]): CardItem[] {
  return slots ? ownCardItems(room, slots, size) : generatedCardItems(room, size);
}

/**
 * The generated controls on a room's card of `size`: its lights, then its climate devices, then its heating switches
 * (underfloor heating, a radiator). What doesn't fit in the card's rows is replaced by a "+N" button that opens
 * the room; when something has to go, climate and heating are kept before lights. The order on screen stays
 * lights first.
 */
function generatedCardItems(room: Room, size: Size): CardItem[] {
  const all: Control[] = [
    ...room.lights.map((id): Control => ({ kind: "toggle", id, size: SIZES.tile })),
    ...room.climate.map((id): Control => ({ kind: "climate", id, size: SIZES.tile })),
    ...room.heating.map((id): Control => ({ kind: "toggle", id, size: SIZES.tile })),
  ];
  const heating = new Set(room.heating);
  const keepFirst = (i: Control) => i.kind === "climate" || heating.has(i.id);

  const fits = (items: { size: Size }[]) => fitsCard(items, size);
  if (fits(all)) return all;

  const more = { size: SIZES.more };
  const kept = new Set<Control>();
  const byPriority = [...all.filter(keepFirst), ...all.filter((i) => !keepFirst(i))];
  for (const item of byPriority) {
    const next = all.filter((i) => kept.has(i) || i === item); // in display order
    if (fits([...next, more])) kept.add(item);
  }
  const shown = all.filter((i) => kept.has(i));
  return [...shown, { kind: "more", count: all.length - shown.length, size: SIZES.more }];
}
