import { callService, home } from "../ha/store.svelte";
import { t } from "../i18n/index.svelte";
import { send } from "./pending.svelte";
import { toast } from "./toast.svelte";

/** The scene `scene.create` keeps the states from before the last scene in, for Undo. Never in the entity registry. */
const UNDO = "doma_undo";

/**
 * Run a scene, and offer to undo it: first the states of what it changes are kept with `scene.create`, then the
 * scene runs, then "Undo" brings the kept states back. A scene that doesn't list what it changes, or an HA that
 * won't keep them, still runs, without Undo.
 */
export async function runScene(entityId: string, name: string) {
  const s = home.entity(entityId) ?? home.catalog[entityId];
  const members = (s?.attributes.entity_id as string[] | undefined) ?? [];
  const kept = members.length
    ? await callService("scene", "create", { scene_id: UNDO, snapshot_entities: members }).then(
        () => true,
        (err: unknown) => (console.warn("Couldn't keep the states for Undo:", err), false),
      )
    : false;
  const ran = await send(entityId, [entityId, ...members], name, () =>
    callService("scene", "turn_on", {}, { entity_id: entityId }),
  );
  if (!ran) return;
  toast.show({
    text: t("feedback.sceneOn", { name }),
    action: kept
      ? { label: t("feedback.undo"), run: () => void callService("scene", "turn_on", {}, { entity_id: `scene.${UNDO}` }) }
      : undefined,
  });
}
