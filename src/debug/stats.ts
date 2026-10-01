import { tick } from "svelte";

/**
 * Performance counters for the debug overlay (`?debug`). Collected only when it's on;
 * otherwise every hook returns at once, so the app pays nothing for them.
 */

export const debugEnabled = new URLSearchParams(location.search).has("debug");
/** `?subscribe=all`: subscribe to every entity, as before filtered subscriptions, to compare the two. */
export const subscribeAll = new URLSearchParams(location.search).get("subscribe") === "all";

export interface UpdateTiming {
  /** From the message arriving to the DOM being updated: decoding, store, components. */
  script: number;
  /** Length of the frame that showed the update: ~16.7 ms on time, ~33 ms or more if frames were dropped. */
  frame: number;
}

export interface NavigationTiming {
  /** From the route change to the new screen in the DOM. */
  script: number;
  /** Length of the frame that painted the new screen. */
  frame: number;
  /** From the route change until that frame was done: roughly how long the tap took to show. */
  total: number;
}

export const stats = {
  messages: 0,
  entityChanges: 0,
  subscribed: 0 as number | "all",
  updates: [] as UpdateTiming[],
  navigations: [] as NavigationTiming[],
};

/** Called by the subscription for each state message, after the store took it. */
export function recordUpdate(receivedAt: number, changes: number) {
  if (!debugEnabled) return;
  stats.messages++;
  stats.entityChanges += changes;
  void tick().then(() => {
    const script = performance.now() - receivedAt;
    // The next frame paints the change; the one after it starts when that paint is done.
    requestAnimationFrame((first) =>
      requestAnimationFrame((second) => stats.updates.push({ script, frame: second - first })),
    );
  });
}

/** Called by the router when the route changes. */
export function recordNavigation(startedAt: number) {
  if (!debugEnabled) return;
  void tick().then(() => {
    const script = performance.now() - startedAt;
    requestAnimationFrame((first) =>
      requestAnimationFrame((second) =>
        stats.navigations.push({ script, frame: second - first, total: second - startedAt }),
      ),
    );
  });
}

export function recordSubscription(count: number | "all") {
  if (debugEnabled) stats.subscribed = count;
}
