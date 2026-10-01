/**
 * The home layout: the user's changes to the home screen generated from HA's floors and areas (LAYOUTS.md,
 * "Layout model"): the order of room cards and their sizes. It only stores differences, never a full copy, so
 * new rooms still appear by themselves. Rooms are referenced by area ID, which doesn't change when a room is
 * renamed. Each HA user has their own, in HA's per-user frontend storage under LAYOUT_KEY.
 */

/** Key in HA's per-user frontend data (`frontend/subscribe_user_data` / `set_user_data`). */
export const LAYOUT_KEY = "ha-ui.layout";

/** A room card's size on the home screen (LAYOUTS.md, "Room cards"); the cells are in `CARD_CELLS`. */
export const CARD_SIZES = ["s", "m", "l", "wide"] as const;
export type CardSize = (typeof CARD_SIZES)[number];

/** A card's size when the layout doesn't say. */
export const DEFAULT_CARD_SIZE: CardSize = "m";

export interface HomeLayout {
  version: 1;
  /** Room card order, by area ID, applied within each floor. Unlisted rooms follow, in default order. */
  order?: string[];
  /** Room card sizes, by area ID. Unlisted rooms: DEFAULT_CARD_SIZE. */
  sizes?: Record<string, CardSize>;
}

export const EMPTY_LAYOUT: HomeLayout = { version: 1 };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Read a stored layout defensively: storage may hold anything (nothing yet, another app version, a hand edit).
 * Unknown fields and values are dropped; anything unusable gives the empty layout.
 */
export function parseLayout(value: unknown): HomeLayout {
  if (value == null) return EMPTY_LAYOUT;
  if (!isObject(value) || value.version !== 1) {
    console.warn("Ignoring a stored layout this version doesn't understand:", value);
    return EMPTY_LAYOUT;
  }
  const layout: HomeLayout = { version: 1 };
  if (Array.isArray(value.order)) layout.order = value.order.filter((v): v is string => typeof v === "string");
  if (isObject(value.sizes)) {
    layout.sizes = {};
    for (const [areaId, size] of Object.entries(value.sizes)) {
      if ((CARD_SIZES as readonly unknown[]).includes(size)) layout.sizes[areaId] = size as CardSize;
    }
  }
  return layout;
}
