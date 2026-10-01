import { home } from "../ha/store.svelte";
import { buildHome, type Room } from "./home";

/**
 * The home model. It's built from the registries and the state catalog, so it only rebuilds when those
 * are reloaded, not on state updates: which room an entity is in and its device class don't change.
 */
const model = $derived(buildHome(home.floors, home.areas, home.devices, home.registry, home.catalog));

export const homeModel = () => model;

/** The first weather entity, for the outside temperature in the header. */
export const weatherEntityId = () => Object.keys(home.catalog).find((id) => id.startsWith("weather."));

export const findRoom = (areaId: string): Room | undefined =>
  model.flatMap((g) => g.rooms).find((r) => r.area.area_id === areaId);
