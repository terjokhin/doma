<script lang="ts">
  import { mdiLightbulbGroup, mdiLightbulbGroupOutline } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import type { Room } from "../model/home";
  import { switchAll } from "./light";
  import { isPending, send } from "./pending.svelte";
  import { sheet } from "./sheet.svelte";
  import Tile from "./Tile.svelte";

  /** All of a room's lights as one tile: the chip switches them all, the rest opens them in one pop-up. */
  let { room }: { room: Room } = $props();

  watchEntities(() => room.lights);
  const on = $derived(room.lights.filter((id) => home.entity(id)?.state === "on").length);
  const name = $derived(t("home.roomLights"));
  const key = $derived(`lights:${room.area.area_id}`);
</script>

<Tile
  icon={on ? mdiLightbulbGroup : mdiLightbulbGroupOutline}
  {name}
  state={on ? t("home.lightsOn", { count: on }) : t("state.off")}
  active={on > 0}
  tint="tint-light"
  pending={isPending(key)}
  chipLabel={on ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
  bodyLabel={t("tile.more", { name })}
  onChip={() => send(key, room.lights, `${room.area.name}: ${name}`, () => switchAll(room.lights, on > 0))}
  onBody={() => sheet.open({ kind: "lights", room })}
/>
