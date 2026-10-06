<script lang="ts">
  import { mdiMinus, mdiPlus, mdiPower } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { entityName } from "../model/home";
  import { climateOf, stepTarget, togglePower } from "./climate";
  import { formatNumber, formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { isPending, send } from "./pending.svelte";
  import { sheet } from "./sheet.svelte";
  import { tintOf } from "./tint";

  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const c = $derived(s && climateOf(s));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
</script>

<!-- Split like the other tiles: the power button switches it, its name and temperatures open its pop-up. -->

{#if s && c}
  <div class="tile climate {s.state} {tintOf(s)}" class:active={!c.off} class:unavailable={isUnavailable(s)}>
    <button
      class="tile-icon"
      class:pending={isPending(entityId)}
      aria-pressed={!c.off}
      aria-label={c.off ? t("climate.turnOn") : t("climate.turnOff")}
      disabled={isUnavailable(s) || !c.canTogglePower}
      onclick={() => send(entityId, [entityId], name, () => togglePower(s))}
    >
      <Icon path={mdiPower} />
    </button>
    <button
      class="tile-body"
      aria-label={t("tile.more", { name })}
      disabled={!area}
      onclick={() => area && sheet.open({ kind: "entity", entityId, area })}
    >
      <div class="tile-name">{name}</div>
      <div class="tile-state">{t(`hvac.${s.state}`, { defaultValue: formatState(s).value })}</div>
      {#if s.attributes.current_temperature != null}
        <div class="climate-temp">{formatNumber(s.attributes.current_temperature)}°</div>
      {/if}
    </button>
    {#if c.target !== undefined && !c.off}
      <div class="stepper">
        <button class="round-btn" aria-label="−" onclick={() => stepTarget(s, -c.step)}>
          <Icon path={mdiMinus} />
        </button>
        <div class="stepper-value">{formatNumber(c.target)}°</div>
        <button class="round-btn" aria-label="+" onclick={() => stepTarget(s, c.step)}>
          <Icon path={mdiPlus} />
        </button>
      </div>
    {/if}
  </div>
{/if}
