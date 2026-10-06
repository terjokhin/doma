import type { AreaEntry } from "../ha/types";
import type { Room } from "../model/home";

/**
 * The pop-up open over the screen, if any (ui/SheetHost.svelte): one entity's controls, or all the lights of a
 * room. Opened by tapping a tile's body; one at a time.
 */
export type SheetTarget = { kind: "entity"; entityId: string; area: AreaEntry } | { kind: "lights"; room: Room };

let current = $state.raw<SheetTarget | null>(null);

export const sheet = {
  /** Reactive. */
  get current() {
    return current;
  },
  open(target: SheetTarget) {
    current = target;
  },
  close() {
    current = null;
  },
};
