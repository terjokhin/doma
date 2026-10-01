import type { HassEntity } from "home-assistant-js-websocket";
import i18n from "../i18n";

export const isUnavailable = (s: HassEntity | undefined) => !s || s.state === "unavailable" || s.state === "unknown";

/** A number in the current language, e.g. 21.5 → "21.5" / "21,5". */
export function formatNumber(value: unknown, maxDigits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return new Intl.NumberFormat(i18n.language, { maximumFractionDigits: maxDigits }).format(n);
}

/** "21.5 °C", "48 %", or a translated state ("On", "Open", …). */
export function formatState(s: HassEntity | undefined): { value: string; unit?: string } {
  if (!s) return { value: "—" };
  if (s.state === "unavailable" || s.state === "unknown") return { value: i18n.t(`state.${s.state}`) };
  const unit = s.attributes.unit_of_measurement as string | undefined;
  if (unit !== undefined) return { value: formatNumber(s.state), unit };
  if (s.entity_id.startsWith("binary_sensor.")) return { value: i18n.t(binaryState(s)) };
  const key = `state.${s.state}`;
  return { value: i18n.exists(key) ? i18n.t(key) : s.state };
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
