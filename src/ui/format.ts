import type { HassEntity } from "home-assistant-js-websocket";
import { exists, language, t } from "../i18n/index.svelte";

export const isUnavailable = (s: HassEntity | undefined) => !s || s.state === "unavailable" || s.state === "unknown";

// Building an Intl.NumberFormat is slow on old tablets; keep one per language and precision.
const numberFormats = new Map<string, Intl.NumberFormat>();

/** A number in the current language, e.g. 21.5 → "21.5" / "21,5". */
export function formatNumber(value: unknown, maxDigits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  const lang = language();
  let format = numberFormats.get(`${lang}/${maxDigits}`);
  if (!format) {
    format = new Intl.NumberFormat(lang, { maximumFractionDigits: maxDigits });
    numberFormats.set(`${lang}/${maxDigits}`, format);
  }
  return format.format(n);
}

/** "21.5 °C", "48 %", or a translated state ("On", "Open", …). */
export function formatState(s: HassEntity | undefined): { value: string; unit?: string } {
  if (!s) return { value: "—" };
  if (s.state === "unavailable" || s.state === "unknown") return { value: t(`state.${s.state}`) };
  const unit = s.attributes.unit_of_measurement as string | undefined;
  if (unit !== undefined) return { value: formatNumber(s.state), unit };
  if (s.entity_id.startsWith("binary_sensor.")) return { value: t(binaryState(s)) };
  const key = `state.${s.state}`;
  return { value: exists(key) ? t(key) : s.state };
}

function binaryState(s: HassEntity) {
  const on = s.state === "on";
  switch (s.attributes.device_class) {
    case "door":
    case "window":
    case "opening":
      return on ? "state.open" : "state.closed";
    case "motion":
    case "occupancy":
    case "smoke":
    case "moisture":
      return on ? "state.detected" : "state.clear";
    default:
      return on ? "state.on" : "state.off";
  }
}

export const formatTemperature = (s: HassEntity | undefined) =>
  isUnavailable(s) ? "—" : `${formatNumber(s!.state)}°`;

export const formatHumidity = (s: HassEntity | undefined) =>
  isUnavailable(s) ? "—" : `${formatNumber(s!.state, 0)}%`;
