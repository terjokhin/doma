/**
 * Room cards on Home, in rows (LAYOUTS.md, "The floor grid"). Each row is a room on its own or a stack of rooms side
 * by side, each at its own width; the rows are kept in the home layout, one under another. A stack wider than the
 * screen wraps inside itself, and the next row still starts below it. Like ha-fusion's horizontal stacks, but with
 * the rooms' own widths. Pure arithmetic, nothing is measured. Positions are in grid units: `x` in columns, `y` in
 * rows of a quarter cell.
 */

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Lay one row's `cards` out on a grid `cols` columns wide: in order, left to right, a new line when the next card
 * doesn't fit; each line starts below the tallest card of the line above, so the titles in a line line up.
 */
export function flow(cards: { id: string; w: number; h: number }[], cols: number): Box[] {
  const boxes: Box[] = [];
  let x = 0;
  let y = 0;
  let tallest = 0;
  for (const card of cards) {
    const w = Math.min(card.w, cols);
    if (x > 0 && x + w > cols) {
      y += tallest;
      x = 0;
      tallest = 0;
    }
    boxes.push({ id: card.id, x, y, w, h: card.h });
    x += w;
    tallest = Math.max(tallest, card.h);
  }
  return boxes;
}

/** Where a dragged card goes: next to another card, at the end of a row, or into a new row before or after one. */
export type Drop =
  | { kind: "card"; id: string }
  | { kind: "end"; row: string }
  | { kind: "before"; row: string }
  | { kind: "after"; row: string };

const rowOf = (rows: readonly string[][], id: string) => rows.findIndex((r) => r.includes(id));

/** `rows` without `id`; a row it leaves empty goes too. */
const without = (rows: readonly string[][], id: string) =>
  rows.map((r) => r.filter((x) => x !== id)).filter((r) => r.length > 0);

/**
 * `rows` with the card `id` dropped at `drop`; rooms are named by area ID, and a row by any room in it. Next to a card
 * of its own row it takes that card's place; next to a card of another row it joins that row, before the card when
 * coming from below, else after it. A card that takes the whole row (`full`) shares it with no other: dropping on it
 * makes a new row before or after it. Returns `rows` itself when nothing changes.
 */
export function dropCard(rows: readonly string[][], id: string, drop: Drop, full: (id: string) => boolean): readonly string[][] {
  const from = rowOf(rows, id);
  if (from < 0) return rows;
  let next: string[][];
  if (drop.kind === "card") {
    const to = rowOf(rows, drop.id);
    if (to < 0 || drop.id === id) return rows;
    if (to === from) {
      const row = rows[from].filter((x) => x !== id);
      row.splice(rows[from].indexOf(drop.id), 0, id);
      next = rows.map((r, i) => (i === from ? row : r));
    } else if (full(drop.id) || full(id)) {
      return dropCard(rows, id, { kind: from > to ? "before" : "after", row: drop.id }, full);
    } else {
      next = without(rows, id);
      const row = next[rowOf(next, drop.id)];
      row.splice(row.indexOf(drop.id) + (from > to ? 0 : 1), 0, id);
    }
  } else {
    if (rowOf(rows, drop.row) < 0) return rows;
    next = without(rows, id);
    const at = rowOf(next, drop.row);
    if (at < 0) {
      // The row was the dragged card alone: it stays where it is.
      return rows;
    } else if (drop.kind === "end") {
      if (full(id) || next[at].some(full)) return rows;
      next[at].push(id);
    } else {
      next.splice(drop.kind === "before" ? at : at + 1, 0, [id]);
    }
  }
  return same(rows, next) ? rows : next;
}

/** `rows` with `id` in a row of its own, where it was: the cards before it and after it stay in their own rows. */
export function ownRow(rows: readonly string[][], id: string): readonly string[][] {
  const at = rowOf(rows, id);
  if (at < 0 || rows[at].length === 1) return rows;
  const row = rows[at];
  const i = row.indexOf(id);
  const parts = [row.slice(0, i), [id], row.slice(i + 1)].filter((r) => r.length > 0);
  return [...rows.slice(0, at), ...parts, ...rows.slice(at + 1)];
}

function same(a: readonly string[][], b: readonly string[][]) {
  return a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((id, j) => id === b[i][j]));
}
