import type { Size } from "./pack";

/**
 * Element sizes in cells (LAYOUTS.md, "Element sizes"), in a card's columns and rows of tiles (model/roomCard.ts):
 * every control on every board is a slim tile two cells wide (ui/Tile.svelte), and so is "+N".
 */
export const SIZES = {
  tile: { w: 2, h: 1 },
  more: { w: 2, h: 1 },
} satisfies Record<string, Size>;
