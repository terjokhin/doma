import type { HassEntity } from "home-assistant-js-websocket";
import { callService } from "../ha/store.svelte";
import { domainOf } from "../model/home";

/** What a light can do and how it is now, for tiles and the light pop-up. */
export interface Light {
  on: boolean;
  /** Whether it dims: any colour mode but on/off. Relays counted as lights (`switch.*`) don't. */
  dimmable: boolean;
  /** Brightness in %, while it's on. */
  brightness?: number;
  /** The colour temperatures it can take, in kelvin, and the current one. */
  temperature?: { min: number; max: number; now?: number };
}

export function lightOf(s: HassEntity): Light {
  const a = s.attributes;
  const modes = (a.supported_color_modes as string[] | undefined) ?? [];
  const on = s.state === "on";
  const light: Light = { on, dimmable: domainOf(s.entity_id) === "light" && modes.some((m) => m !== "onoff") };
  if (on && light.dimmable && typeof a.brightness === "number") light.brightness = Math.max(1, Math.round((a.brightness / 255) * 100));
  if (modes.includes("color_temp") && typeof a.min_color_temp_kelvin === "number" && typeof a.max_color_temp_kelvin === "number") {
    light.temperature = {
      min: a.min_color_temp_kelvin,
      max: a.max_color_temp_kelvin,
      now: typeof a.color_temp_kelvin === "number" ? a.color_temp_kelvin : undefined,
    };
  }
  return light;
}

export const setBrightness = (s: HassEntity, percent: number) =>
  void callService("light", "turn_on", { brightness_pct: percent }, { entity_id: s.entity_id });

export const setTemperature = (s: HassEntity, kelvin: number) =>
  void callService("light", "turn_on", { color_temp_kelvin: kelvin }, { entity_id: s.entity_id });

/** Switch anything that toggles: lights, switches, fans. Resolves when HA has the command. */
export const toggle = (s: HassEntity) => callService(domainOf(s.entity_id), "toggle", {}, { entity_id: s.entity_id });

/** All of `ids` off when any is on, else all on. */
export const switchAll = (ids: string[], anyOn: boolean) =>
  ids.length ? callService("homeassistant", anyOn ? "turn_off" : "turn_on", {}, { entity_id: ids }) : undefined;

/** Set a light's brightness in %; 0 switches it off. Resolves when HA has the command. */
export const setLevel = (s: HassEntity, percent: number) =>
  percent > 0
    ? callService("light", "turn_on", { brightness_pct: percent }, { entity_id: s.entity_id })
    : callService("light", "turn_off", {}, { entity_id: s.entity_id });
