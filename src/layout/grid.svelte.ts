/**
 * The screen grid (LAYOUTS.md): square cells, a column count that's a multiple of 4, and gap and padding
 * as fractions of the cell. The only code that reads the viewport size; everything else uses the CSS
 * variables it sets (--cols, --cell, --gap, --pad) or `grid` below.
 */

/** Cells aim for about this many CSS px. */
const CELL_TARGET = 100;
/** Gap between cells, in cells. */
export const GAP = 0.1;
/** Page padding left and right, in cells. */
export const PAD = 0.25;
/** A section is this many cells wide. */
export const SECTION_WIDTH = 4;

interface Grid {
  cols: number;
  cell: number;
}

function measure(): Grid {
  // clientWidth leaves out a classic scrollbar; `scrollbar-gutter: stable` keeps it from changing.
  const width = document.documentElement.clientWidth;
  const cols = Math.max(SECTION_WIDTH, SECTION_WIDTH * Math.floor(width / (SECTION_WIDTH * CELL_TARGET)));
  const cell = width / (cols + (cols - 1) * GAP + 2 * PAD);
  return { cols, cell };
}

function apply({ cols, cell }: Grid) {
  const root = document.documentElement.style;
  root.setProperty("--cols", String(cols));
  root.setProperty("--cell", `${cell}px`);
  root.setProperty("--gap", `${cell * GAP}px`);
  root.setProperty("--pad", `${cell * PAD}px`);
}

let current = $state(measure());
apply(current); // before the first render, so nothing jumps

let pending = false;
window.addEventListener("resize", () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    const next = measure();
    if (next.cols === current.cols && Math.abs(next.cell - current.cell) < 0.01) return;
    apply(next);
    current = next;
  });
});

export const grid = {
  /** Columns of cells across the screen. */
  get cols() {
    return current.cols;
  },
  /** Cell size in CSS px. */
  get cell() {
    return current.cell;
  },
  /** Sections side by side: 1 on a phone, 2 on a portrait tablet, 3 on a landscape tablet. */
  get sectionColumns() {
    return current.cols / SECTION_WIDTH;
  },
};
