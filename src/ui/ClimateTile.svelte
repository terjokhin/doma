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

  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const c = $derived(s && climateOf(s));
</script>

{#if s && c}
  <div class="tile climate {s.state}" class:active={!c.off} class:unavailable={isUnavailable(s)}>
    <button
      class="tile-icon"
      aria-pressed={!c.off}
      aria-label={c.off ? t("climate.turnOn") : t("climate.turnOff")}
      disabled={isUnavailable(s) || !c.canTogglePower}
      onclick={() => togglePower(s)}
    >
      <Icon path={mdiPower} />
    </button>
    <span class="tile-body">
      <div class="tile-name">{entityName(s, home.registry[entityId], area)}</div>
      <div class="tile-state">{t(`hvac.${s.state}`, { defaultValue: formatState(s).value })}</div>
      {#if s.attributes.current_temperature != null}
        <div class="climate-temp">{formatNumber(s.attributes.current_temperature)}°</div>
      {/if}
    </span>
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
