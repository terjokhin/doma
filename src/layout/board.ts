import type { Size } from "./pack";
import { flow, type Drop } from "./rows";

/**
 * A board: cards in rows, each row a card on its own or a stack of cards side by side at their own widths (LAYOUTS.md,
 * "Boards"). Home's rooms, a room screen's sections and a lens's rooms are all laid out this way. Pure arithmetic:
 * positions are in grid units, `x` in columns and `y` in rows of a quarter cell (see `.floor-grid`).
 */

/** A card to place: its ID and its size in cells, fitted to the screen and to its tiles. */
export interface BoardItem {
  id: string;
  size: Size;
}

/** A card where it sits on the board, and whether other cards share its row (a stack). */
export type Placed<T extends BoardItem> = T & { x: number; y: number; stacked: boolean };

export interface Board<T extends BoardItem> {
  /** In reading order. */
  cards: Placed<T>[];
  /** Its rows: `y` and `h` in rows of a quarter cell, `first` the card ID that names the row. */
  rows: { first: string; y: number; h: number }[];
  /** In edit mode, the gaps before, between and after its rows (`BAND_ROWS` tall): a card dropped there gets a row. */
  bands: { y: number; drop: Drop }[];
}

const sizes = new Map<string, Size>();

/**
 * The same object for the same size: a card whose size didn't change gets the very size it had, so it doesn't
 * re-render when the board is laid out again (each step of a drag re-places every card).
 */
export function sameSize(size: Size): Size {
  const key = `${size.w}/${size.h}`;
  let known = sizes.get(key);
  if (!known) sizes.set(key, (known = size));
  return known;
}

/**
 * Grid rows a card spans: its height in cells, in rows of a quarter cell (four of them and the gaps between make a
 * cell). A title band is two, a row of tiles three (model/roomCard.ts).
 */
export const gridRows = (size: Size) => Math.round(size.h * 4);

/** In edit mode, the band between rows where a card gets a row of its own: half a cell, in grid rows. */
export const BAND_ROWS = 2;

/**
 * The cards of `rows` (card IDs, in order) on a board `cols` columns wide, one row under another; a row wider than
 * the screen wraps inside itself. IDs without a card in `cards` are left out, and so is a row left empty. In edit
 * mode the rows are a band apart, to drop a card into a new row.
 */
export function boardView<T extends BoardItem>(
  rows: readonly (readonly string[])[],
  cards: ReadonlyMap<string, T>,
  cols: number,
  editing = false,
): Board<T> {
  const band = editing ? BAND_ROWS : 0;
  const placed: Placed<T>[] = [];
  const out: Board<T>["rows"] = [];
  let y = band;
  for (const ids of rows) {
    const here = ids.flatMap((id) => cards.get(id) ?? []);
    if (!here.length) continue;
    const boxes = flow(
      here.map((c) => ({ id: c.id, w: c.size.w, h: gridRows(c.size) })),
      cols,
    );
    boxes.forEach((b, i) => placed.push({ ...here[i], x: b.x, y: y + b.y, stacked: here.length > 1 }));
    const h = Math.max(...boxes.map((b) => b.y + b.h));
    out.push({ first: boxes[0].id, y, h });
    y += h + band;
  }
  const bands: Board<T>["bands"] = !editing
    ? []
    : out.map((row, i) => ({ y: i === 0 ? 0 : out[i - 1].y + out[i - 1].h, drop: { kind: "before" as const, row: row.first } }));
  if (editing && out.length) {
    const last = out[out.length - 1];
    bands.push({ y: last.y + last.h, drop: { kind: "after", row: last.first } });
  }
  return { cards: placed, rows: out, bands };
}
