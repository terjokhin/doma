<script lang="ts">
  import { mdiLightbulbGroup, mdiLightbulbGroupOutline } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import { entityName, type Room } from "../model/home";
  import BrightnessBar from "./BrightnessBar.svelte";
  import { formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";
  import { lightOf, setBrightness, switchAll, toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import SheetFrame from "./SheetFrame.svelte";

  /** All of a room's lights in one pop-up, each with its switch and brightness (like hass-config's light groups). */
  let { room }: { room: Room } = $props();

  watchEntities(() => room.lights);
  const lights = $derived(
    room.lights.flatMap((id) => {
      const s = home.entity(id);
      return s ? [{ s, light: lightOf(s), name: entityName(s, home.registry[id], room.area) }] : [];
    }),
  );
  const on = $derived(lights.filter((l) => l.light.on).length);
  const name = $derived(t("home.roomLights"));
  const key = $derived(`lights:${room.area.area_id}`);
</script>

<SheetFrame
  icon={on ? mdiLightbulbGroup : mdiLightbulbGroupOutline}
  tint="tint-light"
  active={on > 0}
  {name}
  sub="{room.area.name} · {on ? t('home.lightsOn', { count: on }) : t('state.off')}"
  chipLabel={on ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
  pending={isPending(key)}
  onChip={() => send(key, room.lights, `${room.area.name}: ${name}`, () => switchAll(room.lights, on > 0))}
  areaId={room.area.area_id}
  roomName={room.area.name}
>
  {#each lights as { s, light, name: lightName } (s.entity_id)}
    <div class="sheet-light tint-light" class:on={light.on}>
      <div class="sheet-light-head">
        <button
          class="tile-chip"
          class:pending={isPending(s.entity_id)}
          aria-label={light.on ? t("tile.turnOff", { name: lightName }) : t("tile.turnOn", { name: lightName })}
          aria-pressed={light.on}
          disabled={isUnavailable(s)}
          onclick={() => send(s.entity_id, [s.entity_id], lightName, () => toggle(s))}
        >
          <Icon path={entityIcon(s)} size={22} />
        </button>
        <b>{lightName}</b>
        <span>{light.brightness !== undefined ? `${light.brightness}%` : formatState(s).value}</span>
      </div>
      {#if light.dimmable}
        <BrightnessBar value={light.brightness ?? 0} on={light.on} label={t("sheet.brightnessOf", { name: lightName })} onChange={(p) => setBrightness(s, p)} />
      {/if}
    </div>
  {/each}
</SheetFrame>
