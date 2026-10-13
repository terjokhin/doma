import { home } from "../ha/store.svelte";
import { t } from "../i18n/index.svelte";
import { isRoutineCard } from "../layout/homeLayout";
import { homeLayout } from "../layout/layoutStore.svelte";
import { buildHome, linkTimers, type Room } from "./home";
import { routineRooms } from "./routineCards";

/**
 * The home model. It's built from the registries and the state catalog, so it only rebuilds when those
 * are reloaded, not on state updates: which room an entity is in and its device class don't change.
 */
const timerLinks = $derived(linkTimers(home.catalog));
const model = $derived(
  buildHome(home.floors, home.areas, home.devices, home.registry, home.catalog, t("home.routines"), timerLinks),
);

/** The timer a script runs, if any (`linkTimers`): its tile shows the countdown. */
export const timerOf = (scriptId: string) => timerLinks.get(scriptId);

export const homeModel = () => model;

/** The first weather entity, for the outside temperature in the header. */
export const weatherEntityId = () => Object.keys(home.catalog).find((id) => id.startsWith("weather."));

/** A room by its area ID, or a routine card made on Home by its ID. */
export const findRoom = (areaId: string): Room | undefined =>
  isRoutineCard(areaId)
    ? routineRooms(model, homeLayout()).find((r) => r.area.area_id === areaId)
    : model.flatMap((g) => g.rooms).find((r) => r.area.area_id === areaId);
