/**
 * Free placement of room cards on a floor grid (LAYOUTS.md, "The floor grid"): pure arithmetic, nothing is
 * measured. Positions are in grid units: `x` in columns, `y` in rows of half a cell; `w` and `h` likewise.
 */

export interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const readingOrder = (a: Box, b: Box) => a.y - b.y || a.x - b.x;

/**
 * Float every box up as far as it goes, in reading order, pushing it down below anything it still overlaps.
 * The box `fixed` (the one being dragged) stays where it is and the others make room around it.
 */
export function compact(boxes: Box[], fixed?: string): Box[] {
  const placed: Box[] = [];
  const pinned = boxes.find((b) => b.id === fixed);
  if (pinned) placed.push(pinned);
  for (const b of [...boxes].sort(readingOrder)) {
    if (b === pinned) continue;
    const box = { ...b };
    while (box.y > 0 && !placed.some((p) => overlaps({ ...box, y: box.y - 1 }, p))) box.y--;
    for (let hit = placed.find((p) => overlaps(box, p)); hit; hit = placed.find((p) => overlaps(box, p))) {
      box.y = hit.y + hit.h;
    }
    placed.push(box);
  }
  return placed.sort(readingOrder);
}

/** The first spot, in reading order, where a box of this size overlaps nothing. */
function firstFit(box: Omit<Box, "x" | "y">, placed: Box[], cols: number): Box {
  for (let y = 0; ; y++) {
    for (let x = 0; x + box.w <= cols; x++) {
      const at = { ...box, x, y };
      if (!placed.some((p) => overlaps(at, p))) return at;
    }
  }
}

/**
 * Place a floor's cards on a grid `cols` columns wide: cards with a stored position go there (moved left if the
 * screen is narrower, down if they overlap) and float up; the rest fill the first free spots, in the given order.
 */
export function arrange(
  cards: { id: string; w: number; h: number }[],
  cols: number,
  stored?: Record<string, { x: number; y: number }>,
): Box[] {
  const known: Box[] = [];
  const loose: typeof cards = [];
  for (const card of cards) {
    const p = stored?.[card.id];
    if (p) known.push({ ...card, x: Math.max(0, Math.min(p.x, cols - card.w)), y: Math.max(0, p.y) });
    else loose.push(card);
  }
  const placed = compact(known);
  for (const card of loose) placed.push(firstFit(card, placed, cols));
  return placed.sort(readingOrder);
}

/** Put box `id` at (x, y), kept inside the grid; the others make room and float up. */
export function moveBox(boxes: Box[], id: string, x: number, y: number, cols: number): Box[] {
  return compact(
    boxes.map((b) => (b.id === id ? { ...b, x: Math.max(0, Math.min(x, cols - b.w)), y: Math.max(0, y) } : b)),
    id,
  );
}

/** Give box `id` a new size where it is (moved left if it no longer fits); the others make room and float up. */
export function resizeBox(boxes: Box[], id: string, w: number, h: number, cols: number): Box[] {
  const resized = boxes.map((b) => (b.id === id ? { ...b, w, h, x: Math.min(b.x, cols - w) } : b));
  return compact(compact(resized, id));
}
