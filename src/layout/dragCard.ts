import { tick } from "svelte";

/**
 * Drag a card in edit mode (LAYOUTS.md, "Edit mode"). Only the dragged card moves, with `transform`. When the
 * pointer comes over another card of the same `group` (an element with `data-card` and `data-group`), `onOver`
 * reorders the layout; once the grid has re-flowed, the card is re-based on its new slot, which measures it
 * once per change of target, never per pointer move. Near the top or bottom edge, the page scrolls.
 *
 * Call from a `pointerdown` on an element inside `card`; it captures the pointer until it's released.
 */
export function dragCard(e: PointerEvent, card: HTMLElement, onOver: (key: string) => void) {
  const handle = e.currentTarget as HTMLElement;
  handle.setPointerCapture(e.pointerId);
  e.preventDefault();

  // Page coordinates, so scrolling while dragging needs no special care.
  const start = card.getBoundingClientRect();
  let base = { x: start.left + scrollX, y: start.top + scrollY }; // the card's slot, without the transform
  const grab = { x: e.pageX - base.x, y: e.pageY - base.y };
  let pointer = { x: e.clientX, y: e.clientY };
  let last: string | undefined; // the card the pointer was last over: no reorder until it leaves it
  let frame = 0;
  card.classList.add("dragging");

  const place = () => {
    const x = pointer.x + scrollX - grab.x - base.x;
    const y = pointer.y + scrollY - grab.y - base.y;
    card.style.transform = `translate(${x}px, ${y}px)`;
  };

  const rebase = () => {
    if (!card.isConnected) return;
    card.style.transform = "";
    const r = card.getBoundingClientRect();
    base = { x: r.left + scrollX, y: r.top + scrollY };
    place();
  };

  const hit = () => {
    // The dragged card has pointer-events: none, so this finds the card underneath.
    const over = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>("[data-card]");
    const key = over?.dataset.card;
    if (!key || key === last || over.dataset.group !== card.dataset.group) return;
    last = key;
    if (key === card.dataset.card) return;
    onOver(key);
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
    hit();
    frame = requestAnimationFrame(scroll);
  };

  const move = (ev: PointerEvent) => {
    pointer = { x: ev.clientX, y: ev.clientY };
    place();
    hit();
    if (!frame) frame = requestAnimationFrame(scroll);
  };

  const end = () => {
    cancelAnimationFrame(frame);
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    card.classList.remove("dragging");
    card.style.transform = "";
  };

  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
