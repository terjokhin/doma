/**
 * Dimming a light by dragging across its tile (LAYOUTS.md, "Room cards"): a drag starts once the finger has moved
 * 8 px sideways, and moves the brightness from where it was by how far it went across the tile, like Apple Home's
 * sliders. A move up or down first is left to scrolling (the tile has `touch-action: pan-y`), and a tap still opens
 * the pop-up. The new brightness goes to HA when the finger lifts; until HA reports it (or for 8 s), the tile keeps
 * showing what was asked for.
 */
export class Dimmer {
  /** The brightness being dragged to, in %; null while not dragging. */
  dragging = $state<number | null>(null);
  /** The brightness last asked for, until HA reports a new state. */
  sent = $state<number | null>(null);

  #start: { x: number; y: number; width: number; from: number; pointer: number } | null = null;
  #dragged = false;
  #timer = 0;

  /** The light's brightness in % (0 while off). */
  readonly #level: () => number;
  readonly #onLevel: (percent: number) => void;

  constructor(level: () => number, onLevel: (percent: number) => void) {
    this.#level = level;
    this.#onLevel = onLevel;
  }

  /** The brightness the tile shows, in %. */
  get shown() {
    return this.dragging ?? this.sent ?? this.#level();
  }

  /** HA reported a new state: show it. */
  reset() {
    clearTimeout(this.#timer);
    this.sent = null;
  }

  down = (e: PointerEvent) => {
    if (e.button > 0) return;
    const el = e.currentTarget as HTMLElement;
    this.#start = { x: e.clientX, y: e.clientY, width: el.offsetWidth, from: this.shown, pointer: e.pointerId };
    this.#dragged = false;
  };

  move = (e: PointerEvent) => {
    const start = this.#start;
    if (!start || e.pointerId !== start.pointer) return;
    const dx = e.clientX - start.x;
    if (this.dragging === null) {
      if (Math.abs(e.clientY - start.y) > 8) this.#start = null; // scrolling
      if (Math.abs(dx) < 8 || !this.#start) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    this.dragging = Math.max(0, Math.min(100, Math.round(start.from + (dx / start.width) * 100)));
  };

  up = () => {
    this.#start = null;
    const percent = this.dragging;
    if (percent === null) return;
    this.sent = percent;
    this.dragging = null;
    this.#dragged = true;
    clearTimeout(this.#timer);
    this.#timer = window.setTimeout(() => (this.sent = null), 8000);
    this.#onLevel(percent);
  };

  cancel = () => {
    this.#start = null;
    this.dragging = null;
  };

  /** Whether a click is the end of a drag, not a tap: then it doesn't open the pop-up. */
  dragged() {
    const was = this.#dragged;
    this.#dragged = false;
    return was;
  }
}
