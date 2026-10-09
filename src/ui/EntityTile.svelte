<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { ALARM_CLASSES, deviceClass, domainOf, entityName } from "../model/home";
  import { climateOf, togglePower } from "./climate";
  import { formatNumber, formatState, isUnavailable } from "./format";
  import { entityIcon } from "./icons";
  import { lightOf, setLevel, toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import { runScene } from "./scene";
  import { sheet } from "./sheet.svelte";
  import Tile from "./Tile.svelte";
  import { isActive, tintOf } from "./tint";

  /**
   * One entity as a slim tile (ui/Tile.svelte), on any board: lights, switches and fans switch from the chip, and a
   * dimmable light dims by dragging across the tile; a climate device's chip is its power, and its target is at the
   * right while it runs (− and + are in its pop-up); a scene runs from anywhere on the tile. The rest of the tile opens
   * the entity's pop-up. Anything else (a sensor, a door, a lock, a media player) is a reading: its state, lit while
   * it needs a look (open, detected, unlocked, playing).
   */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const domain = $derived(domainOf(entityId));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
  const open = () => sheet.open({ kind: "entity", entityId, area });
  const run = () => void runScene(entityId, name);

  /** Domains a tile switches; the rest, apart from climate and scenes, are readings. */
  const SWITCHES = new Set(["light", "switch", "fan", "input_boolean"]);

  /** A reading's value with its unit: "403 ppm", but "48 %" and "21.5 °C" read better close up. */
  function reading(state: NonNullable<typeof s>) {
    const { value, unit } = formatState(state);
    return unit ? `${value}${unit === "%" || unit.startsWith("°") ? "" : " "}${unit}` : value;
  }

  const view = $derived.by(() => {
    if (!s) return undefined;
    if (domain !== "climate" && domain !== "scene" && !SWITCHES.has(domain)) {
      const active = domain === "media_player" ? s.state === "playing" : s.state === "on" || s.state === "unlocked" || s.state === "open";
      const tint = ALARM_CLASSES.has(deviceClass(s)) ? "tint-alert" : domain === "media_player" ? "tint-device" : "tint-light";
      return { icon: entityIcon(s), state: reading(s), active, tint, reading: true, unavailable: isUnavailable(s) };
    }
    if (domain === "scene") {
      return { icon: entityIcon(s), state: t("home.scene"), active: false, tint: "tint-scene", unavailable: s.state === "unavailable" };
    }
    const unavailable = isUnavailable(s);
    if (domain === "climate") {
      const c = climateOf(s);
      const mode = t(`hvac.${s.state}`, { defaultValue: formatState(s).value });
      const current = s.attributes.current_temperature;
      return {
        icon: entityIcon(s),
        // While it runs, the target is at the right; off, its own reading is beside "Off".
        state: !c.off || current == null || unavailable ? mode : `${mode} · ${formatNumber(current)}°`,
        active: isActive(s),
        tint: tintOf(s),
        value: c.target === undefined || c.off ? undefined : `${formatNumber(c.target)}°`,
        unavailable: unavailable || !c.canTogglePower,
      };
    }
    const light = lightOf(s);
    return {
      icon: entityIcon(s),
      state: light.brightness === undefined ? formatState(s).value : `${light.brightness}%`,
      active: isActive(s),
      tint: tintOf(s),
      level: light.dimmable ? (light.brightness ?? 0) : undefined,
      unavailable,
    };
  });

  /** Dragged to a brightness: switching on or off is followed until HA answers, a new brightness only sent. */
  function dim(percent: number) {
    if (!s || (percent === 0 && s.state !== "on")) return;
    const state = s;
    if (percent > 0 && state.state === "on") void setLevel(state, percent);
    else send(entityId, [entityId], name, () => setLevel(state, percent));
  }

  function chip() {
    if (!s) return;
    const state = s;
    if (domain === "scene") run();
    else send(entityId, [entityId], name, () => (domain === "climate" ? togglePower(state) : toggle(state)));
  }
</script>

{#if s && view && "reading" in view}
  <Tile icon={view.icon} {name} state={view.state} active={view.active} tint={view.tint} unavailable={view.unavailable} />
{:else if s && view}
  <Tile
    icon={view.icon}
    {name}
    state={view.state}
    active={view.active}
    tint={view.tint}
    level={view.level}
    value={view.value}
    unavailable={view.unavailable}
    pending={isPending(entityId)}
    chipLabel={domain === "scene" ? t("tile.run", { name }) : view.active ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
    bodyLabel={domain === "scene" ? t("tile.run", { name }) : t("tile.more", { name })}
    onChip={chip}
    onBody={domain === "scene" ? run : open}
    onLevel={view.level === undefined ? undefined : dim}
  />
{/if}
