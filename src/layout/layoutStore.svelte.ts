import type { Backend } from "../ha/store.svelte";
import type { AreaEntry } from "../ha/types";
import { EMPTY_LAYOUT, parseLayout, roomNameOf, type HomeLayout } from "./homeLayout";

/**
 * The logged-in user's home layout, kept in sync with HA: it's read through a subscription, so a change saved on
 * one screen shows up on every other screen of the same user at once.
 */

let current = $state.raw<HomeLayout>(EMPTY_LAYOUT);
let backend: Backend | undefined;
let stop: (() => void) | undefined;

/** The current home layout. Reactive. */
export const homeLayout = () => current;

/** A room's name, as given in Doma or else HA's. Reactive. */
export const roomName = (area: AreaEntry) => roomNameOf(current, area);

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
        console.error("Reading the home layout failed; using the generated one:", err);
        resolve();
      },
    );
  });
}

/** Save a new home layout for the logged-in user. */
export async function saveLayout(next: HomeLayout) {
  if (!backend) throw new Error("Not connected");
  await backend.saveLayout(next);
  current = next; // the subscription confirms it a moment later
}
