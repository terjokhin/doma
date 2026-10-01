import type { HassEntity } from "home-assistant-js-websocket";

// The compressed format of HA's `subscribe_entities` events (homeassistant/core.py: CompressedState).

interface CompressedState {
  s: string; // state
  a: HassEntity["attributes"]; // attributes
  c: string | Partial<HassEntity["context"]>; // context, or just its id
  lc: number; // last_changed, unix seconds
  lu?: number; // last_updated, when it differs from last_changed
}

interface EntityDiff {
  "+"?: Partial<CompressedState>;
  "-"?: { a?: string[] };
}

export interface EntitiesEvent {
  a?: Record<string, CompressedState>; // added: full states
  c?: Record<string, EntityDiff>; // changed: diffs against the previous state
  r?: string[]; // removed
}

export interface EntityChanges {
  changed: Record<string, HassEntity>;
  removed: string[];
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

const toContext = (c: CompressedState["c"], base?: HassEntity["context"]): HassEntity["context"] =>
  typeof c === "string" ? { ...(base ?? { parent_id: null, user_id: null }), id: c } : { ...base!, ...c };

/**
 * Turn one event into new state objects, reading the previous state of changed entities from `previous`.
 * Unchanged entities keep their objects, so consumers can compare by identity.
 */
export function decodeEntitiesEvent(ev: EntitiesEvent, previous: (id: string) => HassEntity | undefined): EntityChanges {
  const changed: Record<string, HassEntity> = {};

  for (const id in ev.a) {
    const s = ev.a[id];
    const lastChanged = iso(s.lc);
    changed[id] = {
      entity_id: id,
      state: s.s,
      attributes: s.a,
      context: toContext(s.c),
      last_changed: lastChanged,
      last_updated: s.lu ? iso(s.lu) : lastChanged,
    };
  }

  for (const id in ev.c) {
    const base = changed[id] ?? previous(id);
    if (!base) continue; // a diff for an entity we never had: HA sends the full state again on resubscribe
    const { "+": add, "-": remove } = ev.c[id];
    const next: HassEntity = { ...base };
    if (add?.a || remove?.a) {
      const attributes = { ...base.attributes, ...add?.a };
      for (const key of remove?.a ?? []) delete attributes[key];
      next.attributes = attributes;
    }
    if (add) {
      if (add.s !== undefined) next.state = add.s;
      if (add.c) next.context = toContext(add.c, base.context);
      if (add.lc) next.last_changed = next.last_updated = iso(add.lc);
      else if (add.lu) next.last_updated = iso(add.lu);
    }
    changed[id] = next;
  }

  return { changed, removed: ev.r ?? [] };
}
