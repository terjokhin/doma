import { tick } from "svelte";

/**
 * Drag an element in edit mode: a room card on its floor, a section on a room screen (LAYOUTS.md, "Edit mode").
 * Only the dragged element moves, with `transform`. On every move, `onMove` gets where the element's top left is,
 * in px from the container's top left, and returns whether that re-placed things; if so, once the screen has
 * re-rendered, the element is re-based on its new slot (measured once per change, never per pointer move).
 * `onEnd` runs when it's let go. Near the top or bottom edge, the page scrolls.
 *
 * Call from a `pointerdown` on an element inside `item`. The pointer is followed on `window`, not through pointer
 * capture: re-placing can move the element in the DOM, which releases any capture, and the release would then never
 * reach the handle.
 */
export function dragItem(
  e: PointerEvent,
  item: HTMLElement,
  container: HTMLElement,
  onMove: (left: number, top: number) => boolean,
  onEnd: () => void,
) {
  const id = e.pointerId;
  e.preventDefault();

  // Page coordinates, so scrolling while dragging needs no special care.
  const page = (r: DOMRect) => ({ x: r.left + scrollX, y: r.top + scrollY });
  const origin = page(container.getBoundingClientRect()); // what's above the container doesn't change
  let base = page(item.getBoundingClientRect()); // the element's slot, without the transform
  const grab = { x: e.pageX - base.x, y: e.pageY - base.y };
  let pointer = { x: e.clientX, y: e.clientY };
  let frame = 0;
  let ended = false;
  item.classList.add("dragging");

  const place = () => {
    const x = pointer.x + scrollX - grab.x - base.x;
    const y = pointer.y + scrollY - grab.y - base.y;
    item.style.transform = `translate(${x}px, ${y}px)`;
  };

  const rebase = () => {
    if (ended || !item.isConnected) return;
    item.style.transform = "";
    base = page(item.getBoundingClientRect());
    place();
  };

  const snap = () => {
    if (onMove(pointer.x + scrollX - grab.x - origin.x, pointer.y + scrollY - grab.y - origin.y)) {
      void tick().then(rebase);
    }
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
    item.classList.remove("dragging");
    item.style.transform = "";
    onEnd();
  };

  addEventListener("pointermove", move);
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
}
