import { t } from "../i18n/index.svelte";
import { routineCardsOf, slotsOf, type HomeLayout } from "../layout/homeLayout";
import { domainOf, type FloorGroup, type Room } from "./home";

/**
 * Routine cards made on Home (LAYOUTS.md, "Routines"): each is a room of its own to the board, holding what was put
 * on it from every routine and automation of the house, whichever room HA gives them. Its card shows its list in
 * order; its screen splits it into Routines and Automations like any room's.
 */

const cache = new WeakMap<FloorGroup[], Map<string, { slots: readonly string[] | undefined; room: Room }>>();

/** The routine cards of this layout, as rooms. The same room object while its list doesn't change. */
export function routineRooms(model: FloorGroup[], layout: HomeLayout): Room[] {
  const ids = routineCardsOf(layout);
  if (!ids.length) return [];
  let byId = cache.get(model);
  if (!byId) cache.set(model, (byId = new Map()));
  const rooms = model.flatMap((g) => g.rooms);
  const all = [...new Set([...rooms.flatMap((r) => r.routines), ...rooms.flatMap((r) => r.automations)])];
  return ids.map((id) => {
    const slots = slotsOf(layout, id);
    const cached = byId.get(id);
    if (cached && cached.slots === slots) return cached.room;
    const picked = (slots ?? []).filter((x) => all.includes(x));
    const room: Room = {
      area: { area_id: id, name: t("home.routines"), floor_id: null, icon: null, picture: null, aliases: [], labels: [] },
      lights: [],
      climate: [],
      switches: [],
      media: [],
      sensors: [],
      scenes: [],
      safety: [],
      heating: [],
      routines: picked.filter((x) => domainOf(x) !== "automation"),
      automations: picked.filter((x) => domainOf(x) === "automation"),
      devices: [],
      pickFrom: all,
    };
    byId.set(id, { slots, room });
    return room;
  });
}

/** Home's rooms with the routine cards first, as one more group: what Home's rows and cards are made of. */
export const withRoutineCards = (model: FloorGroup[], layout: HomeLayout): FloorGroup[] => {
  const cards = routineRooms(model, layout);
  return cards.length ? [{ rooms: cards }, ...model] : model;
};
