import type { HassEntity } from "home-assistant-js-websocket";
import { domainOf, isHeatingSwitch, isLight } from "../model/home";

/**
 * The colour a tile's icon takes while on, as a class (app.css, "Tiles"): lights warm, heating and heat mode
 * orange, cooling blue, fans teal, other devices blue-grey. The card itself never changes colour.
 */
export function tintOf(s: HassEntity): string {
  const id = s.entity_id;
  if (isLight(id)) return "tint-light";
  if (isHeatingSwitch(id)) return "tint-heat";
  const domain = domainOf(id);
  if (domain === "climate") return s.state === "heat" ? "tint-heat" : s.state === "cool" ? "tint-cool" : "tint-neutral";
  if (domain === "fan") return "tint-air";
  return "tint-device";
}

/** Whether a tile shows its entity as on. */
export const isActive = (s: HassEntity) =>
  domainOf(s.entity_id) === "climate" ? s.state !== "off" && s.state !== "unavailable" && s.state !== "unknown" : s.state === "on";
