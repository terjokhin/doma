import { SECTION_WIDTH } from "./grid.svelte";

/** An element's size in cells. */
export interface Size {
  w: number;
  h: number;
}

/** Where an item went: its column and row, from the top left. */
export interface Cell {
  x: number;
  y: number;
}

/**
 * Where `sizes` go when placed like CSS `grid-auto-flow: row dense` does: each item goes into the first free spot
 * scanning rows from the top and columns from the left.
 */
export function densePlaces(sizes: Size[], columns = SECTION_WIDTH): Cell[] {
  const used: boolean[][] = [];
  const free = (row: number, col: number, { w, h }: Size) => {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) if (used[r]?.[c]) return false;
    return true;
  };
  return sizes.map((size) => {
    const item = { w: Math.min(size.w, columns), h: size.h };
    for (let row = 0; ; row++) {
      const col = [...Array(columns - item.w + 1).keys()].find((c) => free(row, c, item));
      if (col === undefined) continue;
      for (let r = row; r < row + item.h; r++) {
        used[r] ??= [];
        for (let c = col; c < col + item.w; c++) used[r][c] = true;
      }
      return { x: col, y: row };
    }
  });
}

/**
 * Rows that `sizes` take when placed like CSS `grid-auto-flow: row dense` does (`densePlaces`). Lets us know a
 * section's height before rendering it.
 */
export function denseRows(sizes: Size[], columns = SECTION_WIDTH): number {
  return densePlaces(sizes, columns).reduce((rows, p, i) => Math.max(rows, p.y + sizes[i].h), 0);
}
