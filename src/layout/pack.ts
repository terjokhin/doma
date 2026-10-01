import { GAP, SECTION_WIDTH } from "./grid.svelte";

/** An element's size in cells. */
export interface Size {
  w: number;
  h: number;
}

/** Height of a section's title band, in cells. */
export const TITLE = 0.5;

/**
 * Rows that `sizes` take when placed like CSS `grid-auto-flow: row dense` does: each item goes into the
 * first free spot scanning rows from the top and columns from the left. Lets us know a section's height
 * before rendering it.
 */
export function denseRows(sizes: Size[], columns = SECTION_WIDTH): number {
  const used: boolean[][] = [];
  const free = (row: number, col: number, { w, h }: Size) => {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) if (used[r]?.[c]) return false;
    return true;
  };
  let rows = 0;
  for (const size of sizes) {
    const w = Math.min(size.w, columns);
    const item = { w, h: size.h };
    for (let row = 0; ; row++) {
      const col = [...Array(columns - w + 1).keys()].find((c) => free(row, c, item));
      if (col === undefined) continue;
      for (let r = row; r < row + item.h; r++) {
        used[r] ??= [];
        for (let c = col; c < col + w; c++) used[r][c] = true;
      }
      rows = Math.max(rows, row + item.h);
      break;
    }
  }
  return rows;
}

/** A section's height in cells: its title band plus its rows and the gaps between them. */
export function sectionHeight(sizes: Size[]): number {
  const rows = denseRows(sizes);
  return TITLE + rows + Math.max(0, rows - 1) * GAP;
}

/**
 * Masonry packing: put each section, in order, into the currently shortest column (the leftmost on a tie).
 * Returns the section indexes for each column. Pure arithmetic: nothing is measured.
 */
export function packColumns(heights: number[], columns: number): number[][] {
  const result: number[][] = Array.from({ length: columns }, () => []);
  const filled = new Array<number>(columns).fill(0);
  heights.forEach((height, index) => {
    const k = filled.indexOf(Math.min(...filled));
    result[k].push(index);
    filled[k] += height + GAP;
  });
  return result;
}
