<script lang="ts">
  import { mdiMinus, mdiPlus, mdiPower } from "@mdi/js";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { entityName } from "../model/home";
  import { formatNumber, formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";

  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const a = $derived(s?.attributes ?? {});
  const target = $derived(typeof a.temperature === "number" ? a.temperature : undefined);
  const step = $derived(typeof a.target_temp_step === "number" ? a.target_temp_step : 0.5);
  const min = $derived(typeof a.min_temp === "number" ? a.min_temp : 7);
  const max = $derived(typeof a.max_temp === "number" ? a.max_temp : 35);

  // ClimateEntityFeature flags: devices that support them restore their last mode on turn_on.
  const TURN_ON = 128;
  const TURN_OFF = 256;
  const features = $derived(Number(a.supported_features ?? 0));
  const off = $derived(s?.state === "off");
  const firstMode = $derived(((a.hvac_modes as string[] | undefined) ?? []).find((m) => m !== "off"));

  function togglePower() {
    const target = { entity_id: entityId };
    if (off) {
      if (features & TURN_ON) void callService("climate", "turn_on", {}, target);
      else if (firstMode) void callService("climate", "set_hvac_mode", { hvac_mode: firstMode }, target);
    } else if (features & TURN_OFF) {
      void callService("climate", "turn_off", {}, target);
    } else {
      void callService("climate", "set_hvac_mode", { hvac_mode: "off" }, target);
    }
  }

  function setTarget(delta: number) {
    if (target === undefined) return;
    const temperature = Math.min(max, Math.max(min, Math.round((target + delta) / step) * step));
    void callService("climate", "set_temperature", { temperature }, { entity_id: entityId });
  }
</script>

{#if s}
  <div class="tile climate {s.state}" class:active={!off} class:unavailable={isUnavailable(s)}>
    <button
      class="tile-icon"
      aria-pressed={!off}
      aria-label={off ? t("climate.turnOn") : t("climate.turnOff")}
      disabled={isUnavailable(s) || (off && !(features & TURN_ON) && !firstMode)}
      onclick={togglePower}
    >
      <Icon path={mdiPower} />
    </button>
    <span class="tile-body">
      <div class="tile-name">{entityName(s, home.registry[entityId], area)}</div>
      <div class="tile-state">{t(`hvac.${s.state}`, { defaultValue: formatState(s).value })}</div>
      {#if a.current_temperature != null}
        <div class="climate-temp">{formatNumber(a.current_temperature)}°</div>
      {/if}
    </span>
    {#if target !== undefined && s.state !== "off"}
      <div class="stepper">
        <button class="round-btn" aria-label="−" onclick={() => setTarget(-step)}>
          <Icon path={mdiMinus} />
        </button>
        <div class="stepper-value">{formatNumber(target)}°</div>
        <button class="round-btn" aria-label="+" onclick={() => setTarget(step)}>
          <Icon path={mdiPlus} />
        </button>
      </div>
    {/if}
  </div>
{/if}
