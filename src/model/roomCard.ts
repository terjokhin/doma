import type { CardSize } from "../layout/homeLayout";
import { denseRows, type Size } from "../layout/pack";
import { SIZES } from "../layout/sizes";
import type { Room } from "./home";

/**
 * Each room card size in cells (LAYOUTS.md, "Room cards"). Heights come in half cells: the floor grid has
 * half-cell rows, so two S cards stack exactly as tall as one M.
 */
export const CARD_CELLS: Record<CardSize, Size> = {
  xs: { w: 2, h: 1.5 },
  s: { w: 4, h: 1.5 },
  m: { w: 4, h: 3 },
  l: { w: 4, h: 4 },
  wide: { w: 8, h: 3 },
};

/**
 * Rows of controls on a card: one per cell below the title band. The title band takes the rest: one cell, or
 * half a cell on an S card.
 */
export const cardRows = (size: Size) => Math.ceil(size.h) - 1;

/** A card's size on a screen `cols` cells wide: never wider than the screen. */
export const fitCard = (size: Size, cols: number): Size => ({ w: Math.min(size.w, cols), h: size.h });

/** How an entity appears on a card. */
export type CardItem =
  | { kind: "toggle"; id: string; size: Size }
  | { kind: "climate"; id: string; size: Size }
  | { kind: "more"; count: number; size: Size };

type Control = Exclude<CardItem, { kind: "more" }>;

/**
 * The controls on a room's card of `size`: its lights, then its climate devices, then its heating switches
 * (underfloor heating, a radiator). What doesn't fit in the card's rows is replaced by a "+N" button that opens
 * the room; when something has to go, climate and heating are kept before lights. The order on screen stays
 * lights first.
 */
export function roomCardItems(room: Room, size: Size): CardItem[] {
  const all: Control[] = [
    ...room.lights.map((id): Control => ({ kind: "toggle", id, size: SIZES.toggleButton })),
    ...room.climate.map((id): Control => ({ kind: "climate", id, size: SIZES.climateCompact })),
    ...room.heating.map((id): Control => ({ kind: "toggle", id, size: SIZES.toggleButton })),
  ];
  const heating = new Set(room.heating);
  const keepFirst = (i: Control) => i.kind === "climate" || heating.has(i.id);

  const fits = (items: { size: Size }[]) => denseRows(items.map((i) => i.size), size.w) <= cardRows(size);
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
