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

  /** A 2×1 climate control for room cards: power, and the target temperature while it's on. */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const c = $derived(s && climateOf(s));
</script>

{#if s && c}
  <div class="compact climate {s.state}" class:active={!c.off} class:unavailable={isUnavailable(s)}>
    <button
      class="mini-icon"
      aria-pressed={!c.off}
      aria-label={c.off ? t("climate.turnOn") : t("climate.turnOff")}
      disabled={isUnavailable(s) || !c.canTogglePower}
      onclick={() => togglePower(s)}
    >
      <Icon path={mdiPower} size={20} />
    </button>
    <div class="compact-body">
      <div class="mini-name">{entityName(s, home.registry[entityId], area)}</div>
      {#if !c.off && c.target !== undefined}
        <div class="compact-stepper">
          <button class="round-btn small" aria-label="−" onclick={() => stepTarget(s, -c.step)}>
            <Icon path={mdiMinus} size={18} />
          </button>
          <span>{formatNumber(c.target)}°</span>
          <button class="round-btn small" aria-label="+" onclick={() => stepTarget(s, c.step)}>
            <Icon path={mdiPlus} size={18} />
          </button>
        </div>
      {:else}
        <div class="mini-state">{t(`hvac.${s.state}`, { defaultValue: formatState(s).value })}</div>
      {/if}
    </div>
  </div>
{/if}
