<script lang="ts">
  import { mdiMinus, mdiPlus } from "@mdi/js";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { roomName } from "../layout/layoutStore.svelte";
  import { entityName } from "../model/home";
  import { climateOf, setMode, stepTarget, togglePower } from "./climate";
  import { formatNumber, formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon, modeIcon } from "./icons";
  import { isPending, send } from "./pending.svelte";
  import SheetFrame from "./SheetFrame.svelte";
  import { isActive, tintOf } from "./tint";

  /** A climate device's pop-up: the target with − and +, the room's temperature, its modes (off among them) and fan. */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const c = $derived(s && climateOf(s));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
  const modes = $derived((s?.attributes.hvac_modes as string[] | undefined) ?? []);
  const fans = $derived((s?.attributes.fan_modes as string[] | undefined) ?? []);
  const current = $derived(s?.attributes.current_temperature);
  const label = (mode: string) => t(`hvacMode.${mode}`, { defaultValue: mode });
  const power = () => s && send(entityId, [entityId], name, () => togglePower(s!));
  const pick = (mode: string) => s && mode !== s.state && send(entityId, [entityId], name, () => setMode(s!, mode));
</script>

{#if s && c}
  <SheetFrame
    icon={entityIcon(s)}
    tint={tintOf(s)}
    active={isActive(s)}
    {name}
    sub="{roomName(area)} · {t(`hvac.${s.state}`, { defaultValue: formatState(s).value })}"
    chipLabel={c.off ? t("climate.turnOn") : t("climate.turnOff")}
    chipDisabled={isUnavailable(s) || !c.canTogglePower}
    pending={isPending(entityId)}
    onChip={power}
    areaId={area.area_id}
    roomName={roomName(area)}
  >
    {#if c.target !== undefined}
      <div class="sheet-temp">
        <button class="round-btn big" aria-label={t("climate.cooler")} disabled={c.off} onclick={() => stepTarget(s, -c.step)}>
          <Icon path={mdiMinus} size={28} />
        </button>
        <div class="sheet-target" class:dim={c.off}>
          <b>{formatNumber(c.target)}°</b>
          {#if current !== undefined}<span>{t("sheet.now", { value: `${formatNumber(current)}°` })}</span>{/if}
        </div>
        <button class="round-btn big" aria-label={t("climate.warmer")} disabled={c.off} onclick={() => stepTarget(s, c.step)}>
          <Icon path={mdiPlus} size={28} />
        </button>
      </div>
    {/if}
    {#if modes.length > 1}
      <div>
        <div class="sheet-label">{t("sheet.mode")}</div>
        <div class="sheet-modes">
          {#each modes as mode (mode)}
            <button class="sheet-mode {mode}" aria-pressed={s.state === mode} disabled={isUnavailable(s)} onclick={() => pick(mode)}>
              <Icon path={modeIcon(mode)} size={20} />
              {label(mode)}
            </button>
          {/each}
        </div>
      </div>
    {/if}
    {#if fans.length > 1}
      <div>
        <div class="sheet-label">{t("sheet.fan")}</div>
        <div class="segmented">
          {#each fans as fan (fan)}
            <button
              aria-pressed={s.attributes.fan_mode === fan}
              onclick={() => void callService("climate", "set_fan_mode", { fan_mode: fan }, { entity_id: entityId })}
            >
              {t(`fanMode.${fan}`, { defaultValue: fan })}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </SheetFrame>
{/if}
