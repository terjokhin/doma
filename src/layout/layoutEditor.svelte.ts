import { CARD_SIZES, DEFAULT_CARD_SIZE, EMPTY_LAYOUT, sizeOf, type HomeLayout } from "./homeLayout";
import { homeLayout, saveLayout } from "./layoutStore.svelte";

/**
 * Edit mode for the home layout (LAYOUTS.md, "Edit mode"): changes go to a draft that the home screen shows,
 * and only Done saves it to HA. Live updates of the stored layout don't touch the draft; the last save wins.
 */

let draft = $state.raw<HomeLayout | null>(null);
let saving = $state(false);
let error = $state<string | null>(null);

export const editor = {
  /** Whether the home screen is being edited. Reactive. */
  get active() {
    return draft !== null;
  },
  /** The layout the home screen shows: the draft while editing, else the stored one. Reactive. */
  get layout() {
    return draft ?? homeLayout();
  },
  get saving() {
    return saving;
  },
  /** Why the last save failed, if it did. */
  get error() {
    return error;
  },

  start() {
    draft = homeLayout();
    error = null;
  },
  cancel() {
    draft = null;
  },
  /** Back to the generated layout; saved on Done like any other change. */
  reset() {
    draft = EMPTY_LAYOUT;
  },
  /** Room card order, by area ID; the home screen passes every room in its new order. */
  setOrder(order: string[]) {
    if (draft) draft = { ...draft, order };
  },
  /** Give a room's card the next size: S → M → L → Wide → S. The default size isn't stored. */
  cycleSize(areaId: string) {
    if (!draft) return;
    const next = CARD_SIZES[(CARD_SIZES.indexOf(sizeOf(draft, areaId)) + 1) % CARD_SIZES.length];
    const { [areaId]: _, ...sizes } = draft.sizes ?? {};
    if (next !== DEFAULT_CARD_SIZE) sizes[areaId] = next;
    draft = { ...draft, sizes };
  },
  /** Save the draft (if anything changed) and leave edit mode; on failure, stay and keep the draft. */
  async done() {
    if (!draft || saving) return;
    if (draft === homeLayout()) {
      draft = null;
      return;
    }
    saving = true;
    error = null;
    try {
      await saveLayout(draft);
      draft = null;
    } catch (err) {
      console.error("Saving the home layout failed:", err);
      error = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
    } finally {
      saving = false;
    }
  },
};
