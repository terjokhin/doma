<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { ALARM_CLASSES, deviceClass, domainOf } from "../model/home";
  import { timerOf } from "../model/model.svelte";
  import { climateOf, togglePower } from "./climate";
  import { Countdown } from "./countdown.svelte";
  import { formatNumber, formatState, isUnavailable } from "./format";
  import { entityIcon, HEAT_ICONS, iconName } from "./icons";
  import { formatSpan, formatWhen, lastRun, parseDuration, routineName, runRoutine, setAutomation } from "./routine";
  import { lightOf, setLevel, toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import { runScene } from "./scene";
  import { sheet } from "./sheet.svelte";
  import Tile from "./Tile.svelte";
  import { isActive, tintOf } from "./tint";

  /**
   * One entity as a slim tile (ui/Tile.svelte), on any board: lights, switches and fans switch from the chip, and a
   * dimmable light dims by dragging across the tile; a climate device's chip is its power, and its target is at the
   * right while it runs (− and + are in its pop-up); a scene runs from anywhere on the tile. A routine (a script, a
   * button, a timer) runs from the chip and shows its countdown while its timer runs; an automation switches on and
   * off from the chip (LAYOUTS.md, "Routines"). The rest of the tile opens the entity's pop-up. Anything else (a
   * sensor, a door, a lock, a media player) is a reading: its state, lit while it needs a look (open, detected,
   * unlocked, playing).
   */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  const domain = $derived(domainOf(entityId));
  /** The timer whose countdown the tile shows: a script's (`timerOf`), or the timer's own. */
  const timerId = $derived(domain === "script" ? timerOf(entityId) : domain === "timer" ? entityId : undefined);
  watchEntities(() => [entityId, timerId]);
  const s = $derived(home.entity(entityId));
  const timer = $derived(timerId ? home.entity(timerId) : undefined);

  const countdown = new Countdown(() => timer);
  const left = $derived(countdown.left);
  /** A script that runs a timer goes by the timer's name ("Heating floors", not "Heating floors for 1 hour"). */
  const name = $derived(s ? routineName(entityId, area) : "");
  const open = () => sheet.open({ kind: "entity", entityId, area });
  const run = () => void runScene(entityId, name);

  /** Domains a tile switches; the rest, apart from climate, scenes, routines and automations, are readings. */
  const SWITCHES = new Set(["light", "switch", "fan", "input_boolean"]);
  const ROUTINES = new Set(["script", "button", "input_button", "timer"]);

  /** A routine's state line: its countdown, that it's running, how long its timer runs, or when it last ran. */
  function routineState(state: NonNullable<typeof s>) {
    if (left !== undefined) return t(timer?.state === "paused" ? "routine.paused" : "routine.left", { time: formatSpan(left) });
    if (domain === "script" && state.state === "on") return t("routine.running");
    const duration = parseDuration(timer?.attributes.duration);
    if (duration) return formatSpan(duration);
    const at = lastRun(state);
    return at ? t("routine.ranAt", { time: formatWhen(at, Date.now()) }) : t("routine.notRun");
  }

  /** A reading's value with its unit: "403 ppm", but "48 %" and "21.5 °C" read better close up. */
  function reading(state: NonNullable<typeof s>) {
    const { value, unit } = formatState(state);
    return unit ? `${value}${unit === "%" || unit.startsWith("°") ? "" : " "}${unit}` : value;
  }

  const view = $derived.by(() => {
    if (!s) return undefined;
    if (ROUTINES.has(domain)) {
      const running = left !== undefined || (domain === "script" && s.state === "on");
      return {
        icon: entityIcon(s),
        state: routineState(s),
        active: running,
        tint: HEAT_ICONS.has(iconName(s, "routine")) ? "tint-heat" : "tint-scene",
        // A button that was never pressed is "unknown", and still works.
        unavailable: s.state === "unavailable",
      };
    }
    if (domain === "automation") {
      // Never lit: an automation that's on is the usual thing. One that's off has its robot crossed out.
      const on = s.state === "on";
      return { icon: entityIcon(s), state: t(on ? "state.on" : "state.off"), active: false, tint: "tint-device", unavailable: s.state === "unavailable" };
    }
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
    else if (ROUTINES.has(domain)) void runRoutine(state, name, domain === "script" ? timerId : undefined);
    else if (domain === "automation") void setAutomation(state, name, state.state !== "on");
    else send(entityId, [entityId], name, () => (domain === "climate" ? togglePower(state) : toggle(state)));
  }

  const runs = $derived(domain === "scene" || ROUTINES.has(domain));
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
    chipLabel={runs ? t("tile.run", { name }) : view.active ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
    bodyLabel={domain === "scene" ? t("tile.run", { name }) : t("tile.more", { name })}
    onChip={chip}
    onBody={domain === "scene" ? run : open}
    onLevel={view.level === undefined ? undefined : dim}
  />
{/if}
