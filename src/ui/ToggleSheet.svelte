<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { roomName } from "../layout/layoutStore.svelte";
  import { entityName } from "../model/home";
  import { formatState, formatTime, isUnavailable } from "./format";
  import { entityIcon } from "./icons";
  import { toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import SheetFrame from "./SheetFrame.svelte";
  import { isActive, tintOf } from "./tint";

  /** The pop-up of anything that only switches (a socket, a fan, a heater): one big button, and since when. */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
  const on = $derived(!!s && isActive(s));
  const flip = () => s && send(entityId, [entityId], name, () => toggle(s!));
</script>

{#if s}
  <SheetFrame
    icon={entityIcon(s)}
    tint={tintOf(s)}
    active={on}
    {name}
    sub="{roomName(area)} · {formatState(s).value}"
    chipLabel={on ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
    chipDisabled={isUnavailable(s)}
    pending={isPending(entityId)}
    onChip={flip}
    areaId={area.area_id}
    roomName={roomName(area)}
  >
    <button class="sheet-big" class:on disabled={isUnavailable(s)} onclick={flip}>
      {isPending(entityId) ? "…" : on ? t("sheet.turnOff") : t("sheet.turnOn")}
    </button>
    <p class="sheet-note">{t(on ? "sheet.onSince" : "sheet.offSince", { time: formatTime(s.last_changed) })}</p>
  </SheetFrame>
{/if}
