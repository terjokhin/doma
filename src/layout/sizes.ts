import type { Size } from "./pack";

/** Element sizes in cells (LAYOUTS.md, "Element sizes"). */
export const SIZES = {
  // Room screen
  toggle: { w: 2, h: 1 },
  sensor: { w: 2, h: 1 },
  media: { w: 2, h: 1 },
  climate: { w: 4, h: 2 },
  // Room cards on the home screen
  toggleButton: { w: 1, h: 1 },
  sensorButton: { w: 1, h: 1 },
  climateCompact: { w: 2, h: 1 },
  more: { w: 1, h: 1 },
} satisfies Record<string, Size>;

