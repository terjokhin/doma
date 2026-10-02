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

/** A section's height in cells: its title band plus its rows and the gaps between them. `columns`: its width in cells. */
export function sectionHeight(sizes: Size[], columns = SECTION_WIDTH): number {
  const rows = denseRows(sizes, columns);
  return TITLE + rows + Math.max(0, rows - 1) * GAP;
}

/**
 * Where a placed section sits: its column (the left one, when it spans several), its top in cells from the top of
 * the columns, and how many section columns wide it is.
 */
export interface Slot {
  column: number;
  top: number;
  width: number;
}

export interface Packed {
  slots: Slot[];
  /** The height of the tallest column, in cells. */
  height: number;
}

/** A section to place: its column (`x`), width (`w`) in section columns, and height (`h`) in cells. */
export interface Box {
  x: number;
  w: number;
  h: number;
}

const result = (slots: Slot[], filled: number[]): Packed => ({ slots, height: Math.max(0, Math.max(...filled) - GAP) });

/**
 * Sections in their columns, in this order: each goes right below the lowest section placed before it in any of the
 * columns it spans (so a wide one may leave a gap under a shorter column). Pure arithmetic: nothing is measured.
 */
export function placeSections(boxes: Box[], columns: number): Packed {
  const filled = new Array<number>(columns).fill(0);
  const slots = boxes.map(({ x, w, h }) => {
    const width = Math.min(w, columns);
    const column = Math.min(x, columns - width);
    const top = Math.max(...filled.slice(column, column + width));
    filled.fill(top + h + GAP, column, column + width);
    return { column, top, width };
  });
  return result(slots, filled);
}

/**
 * Masonry packing: put each section, in order, where it goes highest (the leftmost spot on a tie): for sections one
 * column wide, the shortest column.
 */
export function packSections(boxes: Omit<Box, "x">[], columns: number): Packed {
  const filled = new Array<number>(columns).fill(0);
  const slots = boxes.map(({ w, h }) => {
    const width = Math.min(w, columns);
    let column = 0;
    let top = Infinity;
    for (let x = 0; x + width <= columns; x++) {
      const t = Math.max(...filled.slice(x, x + width));
      if (t < top) [column, top] = [x, t];
    }
    filled.fill(top + h + GAP, column, column + width);
    return { column, top, width };
  });
  return result(slots, filled);
}
