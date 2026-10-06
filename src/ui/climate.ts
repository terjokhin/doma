import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "../ha/store.svelte";

/** Climate controls shared by the full tile and the compact one on room cards. */

// ClimateEntityFeature flags: devices that support them restore their last mode on turn_on.
const TURN_ON = 128;
const TURN_OFF = 256;

const num = (value: unknown, fallback: number) => (typeof value === "number" ? value : fallback);

export interface Climate {
  off: boolean;
  /** Target temperature, if the device has one. */
  target?: number;
  step: number;
  /** Whether the power button can do anything: a device that's off needs a way to turn on. */
  canTogglePower: boolean;
}

export function climateOf(s: HassEntity): Climate {
  const a = s.attributes;
  const features = Number(a.supported_features ?? 0);
  const off = s.state === "off";
  const hasMode = ((a.hvac_modes as string[] | undefined) ?? []).some((m) => m !== "off");
  return {
    off,
    target: typeof a.temperature === "number" ? a.temperature : undefined,
    step: num(a.target_temp_step, 0.5),
    canTogglePower: !off || !!(features & TURN_ON) || hasMode,
  };
}

/** Off: turn on into the last mode (or the first available one). On: turn off. Resolves when HA has the command. */
export function togglePower(s: HassEntity): Promise<unknown> | undefined {
  const a = s.attributes;
  const features = Number(a.supported_features ?? 0);
  const target = { entity_id: s.entity_id };
  if (s.state === "off") {
    const firstMode = ((a.hvac_modes as string[] | undefined) ?? []).find((m) => m !== "off");
    if (features & TURN_ON) return callService("climate", "turn_on", {}, target);
    if (firstMode) return callService("climate", "set_hvac_mode", { hvac_mode: firstMode }, target);
    return undefined;
  }
  if (features & TURN_OFF) return callService("climate", "turn_off", {}, target);
  return callService("climate", "set_hvac_mode", { hvac_mode: "off" }, target);
}

/** Switch to `mode`; a device that's off turns on in it. */
export const setMode = (s: HassEntity, mode: string) =>
  callService("climate", "set_hvac_mode", { hvac_mode: mode }, { entity_id: s.entity_id });

/** Move the target temperature by `delta`, within the device's limits and on its step. */
export function stepTarget(s: HassEntity, delta: number) {
  const a = s.attributes;
  if (typeof a.temperature !== "number") return;
  const step = num(a.target_temp_step, 0.5);
  const temperature = Math.min(
    num(a.max_temp, 35),
    Math.max(num(a.min_temp, 7), Math.round((a.temperature + delta) / step) * step),
  );
  void callService("climate", "set_temperature", { temperature }, { entity_id: s.entity_id });
}
