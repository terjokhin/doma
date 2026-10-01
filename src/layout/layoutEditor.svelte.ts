import { DEFAULT_CARD_SIZE, EMPTY_LAYOUT, type CardSize, type HomeLayout, type Position } from "./homeLayout";
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
  /** Every card's position on a screen `cols` columns wide; the home screen passes all of them after a change. */
  place(cols: number, positions: Record<string, Position>) {
    if (draft) draft = { ...draft, grids: { ...draft.grids, [cols]: positions } };
  },
  /** A room card's size. The default size isn't stored. */
  setSize(areaId: string, size: CardSize) {
    if (!draft) return;
    const { [areaId]: _, ...sizes } = draft.sizes ?? {};
    if (size !== DEFAULT_CARD_SIZE) sizes[areaId] = size;
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
