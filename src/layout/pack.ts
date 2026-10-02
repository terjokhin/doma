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

/** Where a packed section sits: its column, and its top in cells from the top of the columns. */
export interface Slot {
  column: number;
  top: number;
}

/**
 * Masonry packing: put each section, in order, into the currently shortest column (the leftmost on a tie).
 * Returns each section's slot and the height of the tallest column, in cells. Pure arithmetic: nothing is measured.
 */
export function packSections(heights: number[], columns: number): { slots: Slot[]; height: number } {
  const filled = new Array<number>(columns).fill(0);
  const slots = heights.map((height) => {
    const column = filled.indexOf(Math.min(...filled));
    const slot = { column, top: filled[column] };
    filled[column] += height + GAP;
    return slot;
  });
  return { slots, height: Math.max(0, Math.max(...filled) - GAP) };
}

/**
 * Sections in the columns they were given (`columns` holds section indexes, top to bottom), stacked with a gap between
 * them. Returns each section's slot and the height of the tallest column, in cells, like `packSections`.
 */
export function stackSections(heights: number[], columns: number[][]): { slots: Slot[]; height: number } {
  const slots: Slot[] = [];
  let height = 0;
  columns.forEach((column, k) => {
    let top = 0;
    for (const index of column) {
      slots[index] = { column: k, top };
      top += heights[index] + GAP;
    }
    height = Math.max(height, top - GAP);
  });
  return { slots, height: Math.max(0, height) };
}
