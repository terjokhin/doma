<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { roomName } from "../layout/layoutStore.svelte";
  import { domainOf } from "../model/home";
  import { timerOf } from "../model/model.svelte";
  import { Countdown } from "./countdown.svelte";
  import { formatTime } from "./format";
  import { entityIcon, HEAT_ICONS, iconName } from "./icons";
  import { isPending } from "./pending.svelte";
  import { formatSpan, formatWhen, lastRun, parseDuration, routineName, runRoutine, setAutomation, stopTimer, triggerAutomation } from "./routine";
  import SheetFrame from "./SheetFrame.svelte";

  /**
   * The pop-up of a routine or an automation (LAYOUTS.md, "Routines"). A routine (a script, a button, a timer): Run,
   * and while its timer runs, what's left, until when, and Stop, which finishes the timer so HA does what it does when
   * the time is up. An automation: on or off, Run now, and when it last ran.
   */
  let { entityId, area }: { entityId: string; area: AreaEntry } = $props();

  const domain = $derived(domainOf(entityId));
  const automation = $derived(domain === "automation");
  const timerId = $derived(domain === "script" ? timerOf(entityId) : domain === "timer" ? entityId : undefined);
  watchEntities(() => [entityId, timerId]);
  const s = $derived(home.entity(entityId));
  const timer = $derived(timerId ? home.entity(timerId) : undefined);
  const countdown = new Countdown(() => timer);
  const left = $derived(countdown.left);
  const name = $derived(s ? routineName(entityId, area) : "");
  const on = $derived(automation ? s?.state === "on" : left !== undefined || (domain === "script" && s?.state === "on"));
  const tint = $derived(automation ? "tint-device" : s && HEAT_ICONS.has(iconName(s, "routine")) ? "tint-heat" : "tint-scene");
  const ran = $derived(s && lastRun(s));
  const duration = $derived(parseDuration(timer?.attributes.duration));
  const finishes = $derived(typeof timer?.attributes.finishes_at === "string" ? timer.attributes.finishes_at : undefined);

  const run = () => s && runRoutine(s, name, domain === "script" ? timerId : undefined);
  const flip = () => s && setAutomation(s, name, !on);
  const stop = () => timerId && stopTimer(timerId, name, entityId);

  const sub = $derived.by(() => {
    if (automation) return t(on ? "state.on" : "state.off");
    if (left !== undefined) return t(timer?.state === "paused" ? "routine.paused" : "routine.left", { time: formatSpan(left) });
    if (domain === "script" && s?.state === "on") return t("routine.running");
    return duration ? t("routine.runsFor", { time: formatSpan(duration) }) : t("routine.title");
  });
</script>

{#if s}
  <SheetFrame
    icon={entityIcon(s)}
    {tint}
    active={on}
    {name}
    sub="{roomName(area)} · {sub}"
    chipLabel={automation ? t(on ? "tile.turnOff" : "tile.turnOn", { name }) : t("tile.run", { name })}
    chipDisabled={s.state === "unavailable"}
    pending={isPending(entityId)}
    onChip={automation ? flip : run}
    areaId={area.area_id}
    roomName={roomName(area)}
  >
    {#if automation}
      <button class="sheet-big" class:on disabled={s.state === "unavailable"} onclick={flip}>
        {isPending(entityId) ? "…" : t(on ? "sheet.turnOff" : "sheet.turnOn")}
      </button>
      <button class="sheet-wide" onclick={() => s && triggerAutomation(s, name)}>{t("routine.runNow")}</button>
    {:else if left !== undefined}
      <div class="sheet-countdown">
        <b>{formatSpan(left)}</b>
        <span>{finishes ? t("routine.until", { time: formatTime(finishes) }) : t("state.paused")}</span>
      </div>
      <button class="sheet-big on" onclick={stop}>{isPending(entityId) ? "…" : t("routine.stop")}</button>
      <button class="sheet-wide" onclick={run}>
        {duration ? t("routine.restart", { time: formatSpan(duration) }) : t("routine.runAgain")}
      </button>
    {:else}
      <button class="sheet-big" disabled={s.state === "unavailable"} onclick={run}>
        {isPending(entityId) ? "…" : domain === "timer" ? t("routine.start") : t("routine.run")}
      </button>
    {/if}
    <p class="sheet-note">
      {ran ? t("routine.lastRan", { time: formatWhen(ran, Date.now()) }) : t("routine.neverRan")}
    </p>
  </SheetFrame>
{/if}
