<script lang="ts">
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { domainOf, entityName } from "../model/home";
  import { climateOf, togglePower } from "./climate";
  import { formatNumber, formatState, isUnavailable } from "./format";
  import { entityIcon, modeIcon } from "./icons";
  import { lightOf, toggle } from "./light";
  import { sheet } from "./sheet.svelte";
  import Tile from "./Tile.svelte";
  import { isActive, tintOf } from "./tint";

  /**
   * One entity as a tile on a room card: lights, switches and fans switch from the chip; a climate device's chip is
   * its power, and its ring shows the target; a scene runs from anywhere on the tile. The rest of the tile opens the
   * entity's pop-up.
   */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const domain = $derived(domainOf(entityId));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
  const open = () => sheet.open({ kind: "entity", entityId, area });
  const runScene = () => void callService("scene", "turn_on", {}, { entity_id: entityId });

  const view = $derived.by(() => {
    if (!s) return undefined;
    if (domain === "scene") {
      return { icon: entityIcon(s), state: t("home.scene"), active: false, tint: "tint-scene", ring: undefined, unavailable: s.state === "unavailable" };
    }
    const unavailable = isUnavailable(s);
    if (domain === "climate") {
      const c = climateOf(s);
      return {
        icon: c.off ? entityIcon(s) : modeIcon(s.state),
        state: t(`hvac.${s.state}`, { defaultValue: formatState(s).value }),
        active: isActive(s),
        tint: tintOf(s),
        ring: c.target === undefined ? undefined : { value: 0, label: `${formatNumber(c.target)}°` },
        unavailable: unavailable || !c.canTogglePower,
      };
    }
    const light = lightOf(s);
    return {
      icon: entityIcon(s),
      state: formatState(s).value,
      active: isActive(s),
      tint: tintOf(s),
      ring: light.brightness === undefined ? undefined : { value: light.brightness / 100, label: `${light.brightness}%` },
      unavailable,
    };
  });

  function chip() {
    if (!s) return;
    if (domain === "scene") runScene();
    else if (domain === "climate") togglePower(s);
    else toggle(s);
  }
</script>

{#if s && view}
  <Tile
    icon={view.icon}
    {name}
    state={view.state}
    active={view.active}
    tint={view.tint}
    ring={view.ring}
    unavailable={view.unavailable}
    chipLabel={domain === "scene" ? t("tile.run", { name }) : view.active ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
    bodyLabel={domain === "scene" ? t("tile.run", { name }) : t("tile.more", { name })}
    onChip={chip}
    onBody={domain === "scene" ? runScene : open}
  />
{/if}
