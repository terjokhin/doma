import type { LensId } from "../model/lenses";
import type { AreaEntry } from "../ha/types";
import { DEFAULT_CARD_SIZE, EMPTY_LAYOUT, newRoutineCardId, ROOM_NAME_MAX, type CardSize, type HomeLayout } from "./homeLayout";
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
  /**
   * Home back to the generated layout, keeping the room template, icons and routine cards with what they hold and
   * their names (they're made, not arranged); saved on Done like any other change.
   */
  reset() {
    if (!draft) return;
    const { room, icons, routineCards } = draft;
    const mine = <T>(record: Record<string, T> | undefined) =>
      Object.fromEntries(Object.entries(record ?? {}).filter(([id]) => routineCards?.includes(id)));
    draft = {
      ...EMPTY_LAYOUT,
      ...(room && { room }),
      ...(icons && { icons }),
      ...(routineCards?.length && { routineCards, cards: mine(draft.cards), roomNames: mine(draft.roomNames) }),
    };
  },
  /** Home's rows of room cards; the same on every screen width. (A layout's old floor-grouping fields go.) */
  setRows(rows: readonly string[][]) {
    if (!draft) return;
    const { floors: _, flatRows: __, ...rest } = draft;
    draft = { ...rest, rows: rows.map((r) => [...r]) };
  },
  /** A room card's size. The default size isn't stored. */
  setSize(areaId: string, size: CardSize) {
    if (!draft) return;
    const { [areaId]: _, ...sizes } = draft.sizes ?? {};
    if (size !== DEFAULT_CARD_SIZE) sizes[areaId] = size;
    draft = { ...draft, sizes };
  },
  /** A room's name in Doma; empty, or HA's own name, goes back to HA's. */
  setRoomName(area: AreaEntry, name: string) {
    if (!draft) return;
    const given = name.trim().slice(0, ROOM_NAME_MAX);
    const { [area.area_id]: _, ...roomNames } = draft.roomNames ?? {};
    if (given && given !== area.name) roomNames[area.area_id] = given;
    draft = { ...draft, roomNames };
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
  /** An entity's icon, by name (ui/icons.ts), or undefined to go back to HA's or the default. */
  setIcon(entityId: string, name: string | undefined) {
    if (!draft) return;
    const { [entityId]: _, ...icons } = draft.icons ?? {};
    if (name) icons[entityId] = name;
    draft = { ...draft, icons };
  },
  /** A new routine card, empty, after the ones there are; its ID, to place and select it. */
  addRoutineCard(): string | undefined {
    if (!draft) return undefined;
    const id = newRoutineCardId();
    draft = { ...draft, routineCards: [...(draft.routineCards ?? []), id], cards: { ...draft.cards, [id]: [] } };
    return id;
  },
  /** Remove a routine card, and everything kept about it. */
  removeRoutineCard(id: string) {
    if (!draft) return;
    const drop = <T>(record: Record<string, T> | undefined) => {
      const { [id]: _, ...rest } = record ?? {};
      return rest;
    };
    draft = {
      ...draft,
      routineCards: (draft.routineCards ?? []).filter((x) => x !== id),
      cards: drop(draft.cards),
      roomNames: drop(draft.roomNames),
      sizes: drop(draft.sizes),
      rows: draft.rows?.map((row) => row.filter((x) => x !== id)).filter((row) => row.length > 0),
    };
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
