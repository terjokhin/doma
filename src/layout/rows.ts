/**
 * Room cards on Home, in rows (LAYOUTS.md, "The floor grid"): in order, left to right, a new row when the next card
 * doesn't fit; each row starts below the tallest card of the row above, so the titles in a row line up. Like HA's
 * sections view: predictable on every screen width, at the cost of some space under shorter cards. Pure
 * arithmetic, nothing is measured. Positions are in grid units: `x` in columns, `y` in rows of half a cell.
 */

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lay `cards` out in rows on a grid `cols` columns wide. */
export function rows(cards: { id: string; w: number; h: number }[], cols: number): Box[] {
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

/** `ids` with `id` moved into the place of `target`: before it when coming from after it, else after it. */
export function moveTo(ids: readonly string[], id: string, target: string): string[] {
  const from = ids.indexOf(id);
  const to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...ids];
  const next = ids.filter((x) => x !== id);
  next.splice(to, 0, id);
  return next;
}
