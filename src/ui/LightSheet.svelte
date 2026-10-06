<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { entityName } from "../model/home";
  import BrightnessBar from "./BrightnessBar.svelte";
  import { formatState, formatTime, isUnavailable } from "./format";
  import { entityIcon } from "./icons";
  import { lightOf, setBrightness, setTemperature, toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import SheetFrame from "./SheetFrame.svelte";
  import { tintOf } from "./tint";

  /** A light's pop-up: brightness, and colour temperature where it has one; a relay only switches. */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const light = $derived(s && lightOf(s));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
  /** The brightness the bar shows, while dragging too. */
  let shown = $state(0);
  const flip = () => s && send(entityId, [entityId], name, () => toggle(s!));

  /** Warm, neutral and cool: the ends of the light's range and the middle. */
  const temperatures = $derived.by(() => {
    const range = light?.temperature;
    if (!range) return [];
    const kelvins = [range.min, Math.round((range.min + range.max) / 2), range.max];
    const nearest = range.now === undefined ? -1 : kelvins.reduce((best, k, i) => (Math.abs(k - range.now!) < Math.abs(kelvins[best] - range.now!) ? i : best), 0);
    return kelvins.map((kelvin, i) => ({ kelvin, label: t(["sheet.warm", "sheet.neutral", "sheet.cool"][i]), selected: light!.on && i === nearest }));
  });
</script>

{#if s && light}
  <SheetFrame
    icon={entityIcon(s)}
    tint={tintOf(s)}
    active={light.on}
    {name}
    sub="{area.name} · {formatState(s).value}"
    chipLabel={light.on ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
    chipDisabled={isUnavailable(s)}
    pending={isPending(entityId)}
    onChip={flip}
    areaId={area.area_id}
    roomName={area.name}
  >
    {#if light.dimmable}
      <div>
        <div class="sheet-label">{t("sheet.brightness")}<span>{shown ? `${shown}%` : t("state.off")}</span></div>
        <BrightnessBar
          value={light.brightness ?? 0}
          on={light.on}
          label={t("sheet.brightnessOf", { name })}
          onChange={(p) => setBrightness(s, p)}
          onShow={(p) => (shown = p)}
        />
      </div>
    {:else}
      <button class="sheet-big" class:on={light.on} onclick={flip}>
        {light.on ? t("sheet.turnOff") : t("sheet.turnOn")}
      </button>
    {/if}
    {#if temperatures.length}
      <div>
        <div class="sheet-label">{t("sheet.colour")}</div>
        <div class="segmented">
          {#each temperatures as temp (temp.kelvin)}
            <button aria-pressed={temp.selected} onclick={() => setTemperature(s, temp.kelvin)}>{temp.label}</button>
          {/each}
        </div>
      </div>
    {/if}
    <p class="sheet-note">{t(light.on ? "sheet.onSince" : "sheet.offSince", { time: formatTime(s.last_changed) })}</p>
  </SheetFrame>
{/if}
