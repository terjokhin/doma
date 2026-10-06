import type { LensId } from "../model/lenses";
import { byFloor, DEFAULT_CARD_SIZE, EMPTY_LAYOUT, type CardSize, type HomeLayout, type Position } from "./homeLayout";
import { homeLayout, saveLayout } from "./layoutStore.svelte";
import { DEFAULT_SECTIONS, roomSections, withRoom, withTemplate, type SectionTemplate } from "./roomTemplate";

/**
 * Edit mode for the home layout (LAYOUTS.md, "Edit mode"): changes go to a draft that the screen being edited shows,
 * and only Done saves it to HA. Live updates of the stored layout don't touch the draft; the last save wins.
 * One screen is edited at a time, named by its route ("/" Home, "/room/<area>"); the others keep showing the stored
 * layout, so a screen kept built in the background doesn't follow the draft.
 */

let draft = $state.raw<HomeLayout | null>(null);
let target = $state<string | null>(null);
let saving = $state(false);
let error = $state<string | null>(null);

export const editor = {
  /** The route of the screen being edited, or null. Reactive. */
  get target() {
    return target;
  },
  /** The layout the screen being edited shows: the draft while editing, else the stored one. Reactive. */
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

  /** Edit the screen at this route. */
  start(route: string) {
    draft = homeLayout();
    target = route;
    error = null;
  },
  cancel() {
    draft = null;
    target = null;
  },
  /** Home back to the generated layout, keeping the room template; saved on Done like any other change. */
  reset() {
    if (draft) draft = draft.room ? { ...EMPTY_LAYOUT, room: draft.room } : EMPTY_LAYOUT;
  },
  /**
   * Every card's position on a screen `cols` columns wide, on the floor grids or on the one grid, whichever Home
   * shows; the home screen passes all of them after a change.
   */
  place(cols: number, positions: Record<string, Position>) {
    if (!draft) return;
    draft = byFloor(draft)
      ? { ...draft, grids: { ...draft.grids, [cols]: positions } }
      : { ...draft, flatGrids: { ...draft.flatGrids, [cols]: positions } };
  },
  /** Whether Home groups its cards by floor. Each way keeps its own card positions. */
  setByFloor(on: boolean) {
    if (!draft) return;
    const { floors: _, ...rest } = draft;
    draft = on ? rest : { ...rest, floors: false };
  },
  /** A room card's size. The default size isn't stored. */
  setSize(areaId: string, size: CardSize) {
    if (!draft) return;
    const { [areaId]: _, ...sizes } = draft.sizes ?? {};
    if (size !== DEFAULT_CARD_SIZE) sizes[areaId] = size;
    draft = { ...draft, sizes };
  },
  /** Hide a room's card from Home, or show it again. */
  setRoomHidden(areaId: string, hidden: boolean) {
    if (!draft) return;
    const rest = (draft.hidden ?? []).filter((id) => id !== areaId);
    draft = { ...draft, hidden: hidden ? [...rest, areaId] : rest };
  },
  /** A room card's own controls, in order, or undefined to show the generated ones again. */
  setSlots(areaId: string, slots: string[] | undefined) {
    if (!draft) return;
    const { [areaId]: _, ...cards } = draft.cards ?? {};
    if (slots) cards[areaId] = slots;
    draft = { ...draft, cards };
  },
  /** The tabs after Home, in order. */
  setTabs(tabs: LensId[]) {
    if (draft) draft = { ...draft, tabs };
  },

  /** Give a room its own sections (a copy of the template's), or make it follow the template again. */
  setOwnSections(areaId: string, own: boolean) {
    if (!draft) return;
    const { own: _, ...sections } = roomSections(draft, areaId);
    setRoom(withRoom(draft.room, areaId, (r) => ({ ...r, own: own ? sections : undefined })));
  },
  /** A room's sections: its own if it has them, else the template that every such room follows. */
  setSections(areaId: string, sections: SectionTemplate) {
    if (!draft) return;
    setRoom(
      roomSections(draft, areaId).own
        ? withRoom(draft.room, areaId, (r) => ({ ...r, own: sections }))
        : withTemplate(draft.room, sections),
    );
  },
  /** Hide an entity from a room's screen, or show it again. */
  setEntityHidden(areaId: string, entityId: string, hidden: boolean) {
    if (!draft) return;
    setRoom(
      withRoom(draft.room, areaId, (r) => {
        const hide = (r.hide ?? []).filter((id) => id !== entityId);
        return { ...r, hide: hidden ? [...hide, entityId] : hide };
      }),
    );
  },
  /** A room's sections (its own, or the template) back to the default, and its hidden entities shown again. */
  resetRoom(areaId: string) {
    if (!draft) return;
    editor.setSections(areaId, DEFAULT_SECTIONS);
    setRoom(withRoom(draft.room, areaId, (r) => ({ ...r, hide: undefined })));
  },

  /** Save the draft (if anything changed) and leave edit mode; on failure, stay and keep the draft. */
  async done() {
    if (!draft || saving) return;
    if (draft === homeLayout()) {
      editor.cancel();
      return;
    }
    saving = true;
    error = null;
    try {
      await saveLayout(draft);
      editor.cancel();
    } catch (err) {
      console.error("Saving the home layout failed:", err);
      error = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
    } finally {
      saving = false;
    }
  },
};

function setRoom(room: HomeLayout["room"]) {
  if (!draft) return;
  const { room: _, ...rest } = draft;
  draft = room ? { ...rest, room } : rest;
}
