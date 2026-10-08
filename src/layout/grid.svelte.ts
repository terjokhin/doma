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
/** The column count is a multiple of this: an M card (and the phone's whole width) is this many cells. */
export const SECTION_WIDTH = 4;
/**
 * From this screen width there's a sidebar (ui/Sidebar.svelte) this wide, and the grid is what's left: on the Fire
 * HD in landscape, 8 columns of about 106 px. A tablet in portrait and phones keep the header and the tab band.
 */
const SIDEBAR_FROM = 1100;
const SIDEBAR_WIDTH = 300;

interface Grid {
  cols: number;
  cell: number;
  /** The sidebar's width in CSS px; 0 without one. */
  sidebar: number;
}

function measure(): Grid {
  // clientWidth leaves out a classic scrollbar; `scrollbar-gutter: stable` keeps it from changing.
  const screen = document.documentElement.clientWidth;
  const sidebar = screen >= SIDEBAR_FROM ? SIDEBAR_WIDTH : 0;
  const width = screen - sidebar;
  const cols = Math.max(SECTION_WIDTH, SECTION_WIDTH * Math.floor(width / (SECTION_WIDTH * CELL_TARGET)));
  const cell = width / (cols + (cols - 1) * GAP + 2 * PAD);
  return { cols, cell, sidebar };
}

function apply({ cols, cell, sidebar }: Grid) {
  const root = document.documentElement.style;
  root.setProperty("--sidebar", `${sidebar}px`);
  root.setProperty("--cols", String(cols));
  root.setProperty("--cell", `${cell}px`);
  root.setProperty("--gap", `${cell * GAP}px`);
  root.setProperty("--pad", `${cell * PAD}px`);
}

const initial = measure();
apply(initial); // before the first render, so nothing jumps
let current = $state(initial);

let pending = false;
window.addEventListener("resize", () => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    const next = measure();
    if (next.cols === current.cols && next.sidebar === current.sidebar && Math.abs(next.cell - current.cell) < 0.01) return;
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
  /** Whether the screen has the sidebar, in place of the header and the tab band. */
  get sidebar() {
    return current.sidebar > 0;
  },
};
