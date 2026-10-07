import { roomName } from "../layout/layoutStore.svelte";
import { allRooms, LENS_IDS, LENSES, type Chip, type LensId } from "./lenses";
import { homeModel } from "./model.svelte";

/**
 * Each lens's status chip, computed once however many screens show it. Home and each kept lens screen have their own
 * navigation band (App.svelte keeps them built); with a chip computed per band, every update of a device's entity
 * recomputed the Devices chip once per kept screen.
 */
function chipOf(lens: LensId) {
  const chip = $derived(LENSES[lens].chip(allRooms(homeModel()), (room) => roomName(room.area)));
  return () => chip;
}

const chips = Object.fromEntries(LENS_IDS.map((lens) => [lens, chipOf(lens)])) as Record<
  LensId,
  () => Omit<Chip, "lens"> | undefined
>;

/** A lens's chip, or undefined when it has nothing to say. Reactive. */
export const lensChip = (lens: LensId) => chips[lens]();
