import { recordSubscription, recordUpdate, subscribeAll } from "../debug/stats";
import type { EntityChanges } from "./entities";
import { home, type Backend } from "./store.svelte";

/**
 * Keeps one HA subscription for exactly the entities on screen. Components declare what they show
 * with `watchEntities`; the union is subscribed to, and swapped when it changes (on navigation).
 * The new subscription starts before the old one stops, so tiles never go blank in between.
 */

const needs = new Map<symbol, Set<string>>();
let backend: Backend | undefined;
let scheduled = false;
/** The entity list we want subscribed, as a key; "" when none. */
let wanted = "";

interface Subscription {
  closed: boolean;
  close(): void;
}
let active: Subscription[] = [];

/** Declare the entities a component shows, for as long as it's mounted. Call during component init. */
export function watchEntities(ids: () => Iterable<string | undefined>) {
  $effect(() => {
    const set = new Set<string>();
    for (const id of ids()) if (id) set.add(id);
    const token = Symbol();
    needs.set(token, set);
    schedule();
    return () => {
      needs.delete(token);
      schedule();
    };
  });
}

/** Start subscribing through this backend (after connecting). */
export function useBackend(b: Backend) {
  backend = b;
  wanted = "";
  schedule();
}

// Mounting a screen declares many entities at once; subscribe once after all of them.
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    void sync();
  });
}

function onChange(changes: EntityChanges, receivedAt: number) {
  home.apply(changes);
  recordUpdate(receivedAt, Object.keys(changes.changed).length + changes.removed.length);
}

async function sync() {
  if (!backend) return;
  let ids: string[] | "all";
  if (subscribeAll) {
    ids = "all";
  } else {
    const union = new Set<string>();
    for (const set of needs.values()) for (const id of set) union.add(id);
    ids = [...union].sort();
  }
  const key = ids === "all" ? "*" : ids.join(",");
  if (key === wanted) return;
  wanted = key;
  recordSubscription(ids === "all" ? "all" : ids.length);

  // HA reads an empty `entity_ids` as "everything", so with nothing on screen, just stop.
  if (ids !== "all" && ids.length === 0) {
    closeAll();
    return;
  }

  // Show what we already know (the catalog) until HA sends the current states.
  if (ids !== "all") {
    const seed: Record<string, (typeof home.catalog)[string]> = {};
    for (const id of ids) if (!home.peek(id) && home.catalog[id]) seed[id] = home.catalog[id];
    home.apply({ changed: seed, removed: [] });
  }

  const sub: Subscription = { closed: false, close() {} };
  try {
    const unsubscribe = await backend.subscribeEntities(ids, (changes, at) => sub.closed || onChange(changes, at));
    sub.close = () => {
      sub.closed = true;
      unsubscribe();
    };
  } catch (err) {
    console.error("Subscribing to entities failed:", err);
    if (wanted === key) wanted = ""; // let the next change retry
    return;
  }
  if (wanted !== key) {
    sub.close(); // superseded while subscribing; the newer one closes the rest
    return;
  }
  closeAll();
  active = [sub];
}

function closeAll() {
  for (const sub of active) sub.close();
  active = [];
}
