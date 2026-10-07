import type { Size } from "./pack";

/** Element sizes in cells (LAYOUTS.md, "Element sizes"). */
export const SIZES = {
  // Room screen
  toggle: { w: 2, h: 1 },
  sensor: { w: 2, h: 1 },
  media: { w: 2, h: 1 },
  scene: { w: 2, h: 1 },
  climate: { w: 4, h: 2 },
  // Room cards on the home screen, in a card's rows (model/roomCard.ts): every control is a slim tile two cells wide
  // (ui/Tile.svelte), and so is "+N"
  tile: { w: 2, h: 1 },
  more: { w: 2, h: 1 },
} satisfies Record<string, Size>;

