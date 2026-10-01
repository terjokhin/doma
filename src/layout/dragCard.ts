import { tick } from "svelte";
import { GAP } from "./grid.svelte";

/**
 * Drag a card in edit mode (LAYOUTS.md, "Edit mode"). Only the dragged card moves, with `transform`. Where it is,
 * snapped to the floor grid, is its target cell: when that changes, `onCell` re-places the cards, and once the
 * grid has re-rendered the card is re-based on its new slot (measured once per change of cell, never per pointer
 * move). `onEnd` runs when it's let go. Near the top or bottom edge, the page scrolls.
 *
 * Call from a `pointerdown` on an element inside `card`. The pointer is followed on `window`, not through pointer
 * capture: re-placing can move the card's element in the DOM, which releases any capture, and the release would
 * then never reach the handle.
 */
export function dragCard(
  e: PointerEvent,
  card: HTMLElement,
  floor: HTMLElement,
  grid: { cols: number; cell: number; w: number },
  onCell: (x: number, y: number) => void,
  onEnd: () => void,
) {
  const id = e.pointerId;
  e.preventDefault();

  // Page coordinates, so scrolling while dragging needs no special care.
  const page = (r: DOMRect) => ({ x: r.left + scrollX, y: r.top + scrollY });
  const origin = page(floor.getBoundingClientRect()); // the floor grid's top left; floors above don't change
  let base = page(card.getBoundingClientRect()); // the card's slot, without the transform
  const grab = { x: e.pageX - base.x, y: e.pageY - base.y };
  const pitchX = grid.cell * (1 + GAP); // a column and a gap
  const pitchY = pitchX / 2; // a row of half a cell and a gap
  let pointer = { x: e.clientX, y: e.clientY };
  let cell = { x: Math.round((base.x - origin.x) / pitchX), y: Math.round((base.y - origin.y) / pitchY) };
  let frame = 0;
  let ended = false;
  card.classList.add("dragging");

  const place = () => {
    const x = pointer.x + scrollX - grab.x - base.x;
    const y = pointer.y + scrollY - grab.y - base.y;
    card.style.transform = `translate(${x}px, ${y}px)`;
  };

  const rebase = () => {
    if (ended || !card.isConnected) return;
    card.style.transform = "";
    base = page(card.getBoundingClientRect());
    place();
  };

  const snap = () => {
    const left = pointer.x + scrollX - grab.x - origin.x;
    const top = pointer.y + scrollY - grab.y - origin.y;
    const x = Math.max(0, Math.min(Math.round(left / pitchX), grid.cols - grid.w));
    const y = Math.max(0, Math.round(top / pitchY));
    if (x === cell.x && y === cell.y) return;
    cell = { x, y };
    onCell(x, y);
    void tick().then(rebase);
  };

  // Scroll while the pointer is within the outer 10% of the screen, faster closer to the edge.
  const scroll = () => {
    const edge = innerHeight * 0.1;
    const depth = pointer.y < edge ? pointer.y - edge : pointer.y > innerHeight - edge ? pointer.y - (innerHeight - edge) : 0;
    if (!depth) {
      frame = 0;
      return;
    }
    scrollBy(0, (depth / edge) * 20);
    place();
    snap();
    frame = requestAnimationFrame(scroll);
  };

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    pointer = { x: ev.clientX, y: ev.clientY };
    place();
    snap();
    if (!frame) frame = requestAnimationFrame(scroll);
  };

  const end = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    ended = true;
    cancelAnimationFrame(frame);
    removeEventListener("pointermove", move);
    removeEventListener("pointerup", end);
    removeEventListener("pointercancel", end);
    card.classList.remove("dragging");
    card.style.transform = "";
    onEnd();
  };

  addEventListener("pointermove", move);
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
}
