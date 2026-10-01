import type { Backend } from "../ha/store.svelte";
import { EMPTY_LAYOUT, parseLayout, type HouseLayout } from "./houseLayout";

/**
 * The house layout, kept in sync with HA: it's read through a subscription, so a change saved on one screen
 * shows up on every other screen at once.
 */

let current = $state.raw<HouseLayout>(EMPTY_LAYOUT);
let backend: Backend | undefined;
let stop: (() => void) | undefined;

/** The current house layout. Reactive. */
export const houseLayout = () => current;

/**
 * Follow the stored layout through this backend. Resolves once the first value arrived (so the home screen
 * doesn't rearrange itself right after showing), or when reading failed: then the generated layout is used.
 */
export function useLayoutBackend(b: Backend): Promise<void> {
  stop?.();
  backend = b;
  current = EMPTY_LAYOUT;
  return new Promise((resolve) => {
    b.subscribeLayout((value) => {
      current = parseLayout(value);
      resolve();
    }).then(
      (unsubscribe) => (stop = unsubscribe),
      (err) => {
        console.error("Reading the house layout failed; using the generated one:", err);
        resolve();
      },
    );
  });
}

/** Save a new house layout for everyone. Needs an admin login on a live HA. */
export async function saveLayout(next: HouseLayout) {
  if (!backend) throw new Error("Not connected");
  await backend.saveLayout(next);
  current = next; // the subscription confirms it a moment later
}
