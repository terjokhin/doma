import type { HassEntity } from "home-assistant-js-websocket";
import { callService, home } from "../ha/store.svelte";
import { language, t } from "../i18n/index.svelte";
import type { AreaEntry } from "../ha/types";
import { domainOf, entityName } from "../model/home";
import { timerOf } from "../model/model.svelte";
import { send } from "./pending.svelte";
import { toast } from "./toast.svelte";

/**
 * Routines and automations (LAYOUTS.md, "Routines"): running a script or a button, a timer's countdown, stopping it,
 * and switching an automation on or off or running it now. A script that runs a timer (`timerOf`) is shown and
 * stopped through that timer.
 */

/**
 * What a tile calls an entity. A script that runs a timer goes by the timer's name, which is the start of the script's
 * ("Heating floors" for "Heating floors for 1 hour"): the tile says how long under it.
 */
export function routineName(entityId: string, area?: AreaEntry): string {
  const timer = domainOf(entityId) === "script" ? timerOf(entityId) : undefined;
  const id = timer && (home.entity(timer) ?? home.catalog[timer]) ? timer : entityId;
  return entityName(home.entity(id) ?? home.catalog[id], home.registry[id], area);
}

/** "1:00:00" → milliseconds. */
export function parseDuration(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return undefined;
  return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
}

/**
 * What's left of a running or paused timer at `now`, in ms; undefined while it's idle. A running timer says when it
 * finishes; an older HA only says what was left when it last changed.
 */
export function timeLeft(timer: HassEntity | undefined, now: number): number | undefined {
  if (!timer) return undefined;
  if (timer.state === "paused") return parseDuration(timer.attributes.remaining);
  if (timer.state !== "active") return undefined;
  const finishes = Date.parse(String(timer.attributes.finishes_at ?? ""));
  if (Number.isFinite(finishes)) return Math.max(0, finishes - now);
  const remaining = parseDuration(timer.attributes.remaining);
  return remaining === undefined ? undefined : Math.max(0, Date.parse(timer.last_changed) + remaining - now);
}

/** A span of time as a tile says it: "1 h 5 min", "42 min", rounded up; under a minute, "45 s". */
export function formatSpan(ms: number): string {
  if (ms < 60_000) return t("time.s", { s: Math.ceil(ms / 1000) });
  const minutes = Math.ceil(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return t("time.min", { m });
  return m ? `${t("time.h", { h })} ${t("time.min", { m })}` : t("time.h", { h });
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();
const timeFormats = new Map<string, Intl.DateTimeFormat>();

/** When something last happened: the time today, else the day ("12 Oct"). */
export function formatWhen(iso: string, now: number): string {
  const lang = language();
  const date = new Date(iso);
  if (new Date(now).toDateString() === date.toDateString()) {
    let time = timeFormats.get(lang);
    if (!time) timeFormats.set(lang, (time = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })));
    return time.format(date);
  }
  let day = dayFormats.get(lang);
  if (!day) dayFormats.set(lang, (day = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" })));
  return day.format(date);
}

/** When a routine last ran: a script's or an automation's last trigger, a button's last press. */
export function lastRun(s: HassEntity): string | undefined {
  const domain = domainOf(s.entity_id);
  if (domain === "button" || domain === "input_button") return Number.isFinite(Date.parse(s.state)) ? s.state : undefined;
  const at = s.attributes.last_triggered;
  return typeof at === "string" ? at : undefined;
}

/** Run a script or press a button; a timer starts. `timer` is the timer it runs, whose countdown shows it ran. */
export async function runRoutine(s: HassEntity, name: string, timer?: string) {
  const id = s.entity_id;
  const domain = domainOf(id);
  const call =
    domain === "script"
      ? () => callService("script", "turn_on", {}, { entity_id: id })
      : domain === "timer"
        ? () => callService("timer", "start", {}, { entity_id: id })
        : () => callService(domain, "press", {}, { entity_id: id });
  const ran = await send(id, timer ? [id, timer] : [id], name, call);
  // Without a countdown nothing on screen says it ran.
  if (ran && !timer && domain !== "timer") toast.show({ text: t("feedback.ran", { name }) });
}

/**
 * Stop a running timer by finishing it: HA then does what it does when the time is up (the automation that switches
 * the heating off), so Doma needn't know what the routine turned on. `key` is the tile that shows it.
 */
export function stopTimer(timer: string, name: string, key = timer) {
  return send(key, [timer], name, () => callService("timer", "finish", {}, { entity_id: timer }));
}

/** Switch an automation on or off. */
export const setAutomation = (s: HassEntity, name: string, on: boolean) =>
  send(s.entity_id, [s.entity_id], name, () =>
    callService("automation", on ? "turn_on" : "turn_off", {}, { entity_id: s.entity_id }),
  );

/** Run an automation's actions now, as if it had been triggered. */
export async function triggerAutomation(s: HassEntity, name: string) {
  const ran = await send(s.entity_id, [s.entity_id], name, () =>
    callService("automation", "trigger", {}, { entity_id: s.entity_id }),
  );
  if (ran) toast.show({ text: t("feedback.ran", { name }) });
}
