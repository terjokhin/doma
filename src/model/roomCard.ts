import { GAP } from "../layout/grid.svelte";
import { denseRows, TITLE, type Size } from "../layout/pack";
import { SIZES } from "../layout/sizes";
import type { Room } from "./home";

/** A room card on the home screen shows at most this many rows of controls; the rest is behind "+N". */
export const CARD_ROWS = 2;

/**
 * Every room card has the same height, in cells, whatever it shows: a title band of half a cell, CARD_ROWS rows
 * with a gap between them, and a gap below. Must match `.room-card` in app.css.
 */
export const CARD_HEIGHT = TITLE + CARD_ROWS + CARD_ROWS * GAP;

export type CardItem =
  | { kind: "light"; id: string; size: Size }
  | { kind: "climate"; id: string; size: Size }
  | { kind: "more"; count: number; size: Size };

/**
 * The controls on a room's card, in order: its lights as 1×1 buttons, then its climate devices as compact 2×1
 * controls. What doesn't fit in CARD_ROWS is replaced by a "+N" button that opens the room; when something has
 * to go, climate is kept before lights.
 */
export function roomCardItems(room: Room): CardItem[] {
  const all: CardItem[] = [
    ...room.lights.map((id) => ({ kind: "light" as const, id, size: SIZES.lightButton })),
    ...room.climate.map((id) => ({ kind: "climate" as const, id, size: SIZES.climateCompact })),
  ];
  const fits = (items: { size: Size }[]) => denseRows(items.map((i) => i.size)) <= CARD_ROWS;
  if (fits(all)) return all;

  const more = { size: SIZES.more };
  const kept = new Set<CardItem>();
  const byPriority = [...all.filter((i) => i.kind === "climate"), ...all.filter((i) => i.kind !== "climate")];
  for (const item of byPriority) {
    const next = all.filter((i) => kept.has(i) || i === item); // in display order
    if (fits([...next, more])) kept.add(item);
  }
  const shown = all.filter((i) => kept.has(i));
  return [...shown, { kind: "more", count: all.length - shown.length, size: SIZES.more }];
}
