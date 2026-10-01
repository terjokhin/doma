/**
 * The house layout: the user's changes on top of the layout generated from HA's floors and areas
 * (LAYOUTS.md, "Layout model"). It only stores differences, never a full copy, so new rooms and devices
 * still appear by themselves. Rooms are referenced by area ID, which doesn't change when a room is renamed.
 * There is one layout per house, stored in HA's shared frontend storage under LAYOUT_KEY.
 */

/** Key in HA's frontend system data (`frontend/get_system_data` / `set_system_data`). */
export const LAYOUT_KEY = "ha-ui.layout";

/** What a room's card on the home screen can show, by kind of entity. */
export const CARD_KINDS = ["lights", "climate", "switches", "sensors"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** What a room card shows when the layout doesn't say. */
export const DEFAULT_CARD: CardKind[] = ["lights", "climate"];

export interface RoomLayout {
  /** The kinds of controls on the room's card, in this order. Default: DEFAULT_CARD. */
  card?: CardKind[];
  /** Entities shown first on the card, in this order, whatever their kind. */
  pin?: string[];
  /** Entities never shown on the card. */
  hide?: string[];
}

export interface HouseLayout {
  version: 1;
  /** Room order on the home screen, by area ID, applied within each floor. Unlisted rooms follow, in default order. */
  order?: string[];
  /** Rooms left off the home screen, by area ID. Their room screens still work. */
  hidden?: string[];
  /** Per-room changes, by area ID. */
  rooms?: Record<string, RoomLayout>;
}

export const EMPTY_LAYOUT: HouseLayout = { version: 1 };

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Read a stored layout defensively: shared storage may hold anything (nothing yet, another app version, a
 * hand edit). Unknown fields and values are dropped; anything unusable gives the empty layout.
 */
export function parseLayout(value: unknown): HouseLayout {
  if (value == null) return EMPTY_LAYOUT;
  if (!isObject(value) || value.version !== 1) {
    console.warn("Ignoring a stored layout this version doesn't understand:", value);
    return EMPTY_LAYOUT;
  }
  const layout: HouseLayout = { version: 1 };
  const order = strings(value.order);
  const hidden = strings(value.hidden);
  if (order) layout.order = order;
  if (hidden) layout.hidden = hidden;
  if (isObject(value.rooms)) {
    layout.rooms = {};
    for (const [areaId, room] of Object.entries(value.rooms)) {
      if (!isObject(room)) continue;
      const parsed: RoomLayout = {};
      const card = strings(room.card)?.filter((k): k is CardKind => (CARD_KINDS as readonly string[]).includes(k));
      const pin = strings(room.pin);
      const hide = strings(room.hide);
      if (card) parsed.card = card;
      if (pin) parsed.pin = pin;
      if (hide) parsed.hide = hide;
      layout.rooms[areaId] = parsed;
    }
  }
  return layout;
}
