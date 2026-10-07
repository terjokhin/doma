import type { CardSize } from "../layout/homeLayout";
import { denseRows, type Size } from "../layout/pack";
import { SIZES } from "../layout/sizes";
import type { Room } from "./home";

/** The title band, in cells: the same on every card. */
export const TITLE_CELLS = 0.5;

/**
 * A row of tiles, in cells: three quarters of a cell and its gap, so a tile is three of Home's quarter-cell rows
 * and the two gaps between them tall (LAYOUTS.md, "The floor grid").
 */
export const ROW_CELLS = 0.75;

/** The most rows of tiles a card has. */
const MAX_ROWS = 3;

/**
 * Each room card size in cells at its largest (LAYOUTS.md, "Room cards"): a size is a width; every card has a title
 * band of half a cell over up to three rows of tiles, and is only as tall as its tiles (`shownSize`).
 */
export const CARD_CELLS: Record<CardSize, Size> = {
  xs: { w: 2, h: TITLE_CELLS + MAX_ROWS * ROW_CELLS },
  m: { w: 4, h: TITLE_CELLS + MAX_ROWS * ROW_CELLS },
  // Next to an S, the Fire HD's row beside the sidebar (8 columns); half a 12-column row.
  wide: { w: 6, h: TITLE_CELLS + MAX_ROWS * ROW_CELLS },
  // The whole row, however wide the screen (`fitCard` narrows it).
  full: { w: 64, h: TITLE_CELLS + MAX_ROWS * ROW_CELLS },
};

/** Rows of tiles on a card of `size`. Item sizes on a card are in columns and these rows. */
export const cardRows = (size: Size) => Math.round((size.h - TITLE_CELLS) / ROW_CELLS);

/**
 * The size a card shows, at most `max`: its width, and only as tall as its tiles need, with `spare` free cells
 * where the size allows (edit mode, for the "+" that adds one). A card without tiles is just its title.
 */
export function shownSize(max: Size, items: CardItem[], spare = 0): Size {
  const cells = items.map((i) => i.size).concat(Array.from({ length: spare }, () => SIZES.tile));
  const rows = Math.min(cardRows(max), denseRows(cells, max.w));
  return { w: max.w, h: TITLE_CELLS + rows * ROW_CELLS };
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
