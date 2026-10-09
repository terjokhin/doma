import {
  mdiBatteryHeartVariant,
  mdiBatteryMedium,
  mdiHomeOutline,
  mdiLightbulbGroupOutline,
  mdiShieldHomeOutline,
  mdiBrightness5,
  mdiDoorOpen,
  mdiEyeOutline,
  mdiFan,
  mdiHeatingCoil,
  mdiLightbulb,
  mdiLightbulbOutline,
  mdiMoleculeCo2,
  mdiMotionSensor,
  mdiPower,
  mdiSmokeDetector,
  mdiSpeaker,
  mdiThermometer,
  mdiThermostat,
  mdiWaterPercent,
  mdiWeatherPartlyCloudy,
  mdiBlur,
  mdiWater,
  mdiPalette,
  mdiFire,
  mdiSnowflake,
  mdiSunSnowflakeVariant,
  mdiThermostatAuto,
  mdiCeilingLight,
  mdiCeilingLightMultiple,
  mdiChandelier,
  mdiLightRecessed,
  mdiTrackLight,
  mdiWallSconce,
  mdiWallSconceRound,
  mdiWallSconceFlat,
  mdiVanityLight,
  mdiFloorLamp,
  mdiFloorLampTorchiere,
  mdiLamp,
  mdiDeskLamp,
  mdiLedStripVariant,
  mdiStringLights,
  mdiCeilingFanLight,
  mdiOutdoorLamp,
  mdiPostLamp,
  mdiCoachLamp,
  mdiThermostatBox,
  mdiAirConditioner,
  mdiHeatPump,
  mdiRadiator,
  mdiWaterBoiler,
  mdiFireplace,
  mdiAirPurifier,
  mdiAirHumidifier,
  mdiHomeThermometer,
  mdiPowerSocketEu,
  mdiPowerPlug,
  mdiKettle,
  mdiCoffeeMaker,
  mdiWashingMachine,
  mdiTumbleDryer,
  mdiDishwasher,
  mdiRobotVacuum,
  mdiTelevision,
  mdiGamepadVariant,
  mdiDesktopTowerMonitor,
  mdiRouterWireless,
  mdiPrinter3d,
  mdiEvStation,
  mdiPump,
  mdiSprinklerVariant,
  mdiFishbowl,
  mdiPineTree,
  mdiBell,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { home } from "../ha/store.svelte";
import type { HomeLayout } from "../layout/homeLayout";
import { editor } from "../layout/layoutEditor.svelte";
import { deviceClass, domainOf, isHeatingSwitch, isLight } from "../model/home";
import type { LensId } from "../model/lenses";

const BY_CLASS: Record<string, string> = {
  temperature: mdiThermometer,
  humidity: mdiWaterPercent,
  carbon_dioxide: mdiMoleculeCo2,
  pm25: mdiBlur,
  pm10: mdiBlur,
  volatile_organic_compounds: mdiBlur,
  illuminance: mdiBrightness5,
  moisture: mdiWater,
  smoke: mdiSmokeDetector,
  door: mdiDoorOpen,
  window: mdiDoorOpen,
  opening: mdiDoorOpen,
  motion: mdiMotionSensor,
  occupancy: mdiMotionSensor,
  battery: mdiBatteryMedium,
};

/** Lights, climate and switches have their own (`iconKind`). */
const BY_DOMAIN: Record<string, string> = {
  media_player: mdiSpeaker,
  scene: mdiPalette,
  weather: mdiWeatherPartlyCloudy,
};

/**
 * The icons an entity can be given in edit mode (LAYOUTS.md, "Room screens"), per kind, in the picker's order, by
 * their names in Material Design Icons: HA's `mdi:` names without the prefix. The first is the default, and the
 * defaults change with the state: the bulb is outlined when off, the thermostat shows the mode it's running in.
 */
export const LIGHT_ICONS: Record<string, string> = {
  lightbulb: mdiLightbulb,
  "ceiling-light": mdiCeilingLight,
  "ceiling-light-multiple": mdiCeilingLightMultiple,
  chandelier: mdiChandelier,
  "light-recessed": mdiLightRecessed,
  "track-light": mdiTrackLight,
  "wall-sconce": mdiWallSconce,
  "wall-sconce-round": mdiWallSconceRound,
  "wall-sconce-flat": mdiWallSconceFlat,
  "vanity-light": mdiVanityLight,
  "floor-lamp": mdiFloorLamp,
  "floor-lamp-torchiere": mdiFloorLampTorchiere,
  lamp: mdiLamp,
  "desk-lamp": mdiDeskLamp,
  "led-strip-variant": mdiLedStripVariant,
  "string-lights": mdiStringLights,
  "ceiling-fan-light": mdiCeilingFanLight,
  "outdoor-lamp": mdiOutdoorLamp,
  "post-lamp": mdiPostLamp,
  "coach-lamp": mdiCoachLamp,
};

const CLIMATE_ICONS: Record<string, string> = {
  thermostat: mdiThermostat,
  "thermostat-box": mdiThermostatBox,
  "air-conditioner": mdiAirConditioner,
  "heat-pump": mdiHeatPump,
  radiator: mdiRadiator,
  "heating-coil": mdiHeatingCoil,
  "water-boiler": mdiWaterBoiler,
  fireplace: mdiFireplace,
  fan: mdiFan,
  "air-purifier": mdiAirPurifier,
  "air-humidifier": mdiAirHumidifier,
  "home-thermometer": mdiHomeThermometer,
};

/** Switches, fans and helpers. A heating switch starts at the coil, a fan at the fan, the rest at the power sign. */
const SWITCH_ICONS: Record<string, string> = {
  power: mdiPower,
  "power-socket-eu": mdiPowerSocketEu,
  "power-plug": mdiPowerPlug,
  fan: mdiFan,
  "heating-coil": mdiHeatingCoil,
  radiator: mdiRadiator,
  "water-boiler": mdiWaterBoiler,
  fireplace: mdiFireplace,
  "air-purifier": mdiAirPurifier,
  "air-humidifier": mdiAirHumidifier,
  kettle: mdiKettle,
  "coffee-maker": mdiCoffeeMaker,
  "washing-machine": mdiWashingMachine,
  "tumble-dryer": mdiTumbleDryer,
  dishwasher: mdiDishwasher,
  "robot-vacuum": mdiRobotVacuum,
  television: mdiTelevision,
  speaker: mdiSpeaker,
  "gamepad-variant": mdiGamepadVariant,
  "desktop-tower-monitor": mdiDesktopTowerMonitor,
  "router-wireless": mdiRouterWireless,
  "printer-3d": mdiPrinter3d,
  "ev-station": mdiEvStation,
  pump: mdiPump,
  "sprinkler-variant": mdiSprinklerVariant,
  fishbowl: mdiFishbowl,
  "pine-tree": mdiPineTree,
  bell: mdiBell,
};

export const ICON_SETS = { light: LIGHT_ICONS, climate: CLIMATE_ICONS, switch: SWITCH_ICONS };
export type IconKind = keyof typeof ICON_SETS;

const SWITCH_DOMAINS = new Set(["switch", "fan", "input_boolean"]);

/** Which icons an entity can be given; undefined for one that keeps its own (a sensor, a media player). */
export function iconKind(entityId: string): IconKind | undefined {
  if (isLight(entityId)) return "light";
  const domain = domainOf(entityId);
  if (domain === "climate") return "climate";
  return SWITCH_DOMAINS.has(domain) ? "switch" : undefined;
}

function defaultIcon(entityId: string, kind: IconKind): string {
  if (kind === "light") return "lightbulb";
  if (kind === "climate") return "thermostat";
  return isHeatingSwitch(entityId) ? "heating-coil" : domainOf(entityId) === "fan" ? "fan" : "power";
}

/** The icon an entity has in HA (set on the entity, or by its integration), when it's one Doma has for its kind. */
function haIcon(s: HassEntity, kind: IconKind): string | undefined {
  const icon = home.registry[s.entity_id]?.ic ?? s.attributes.icon;
  const name = typeof icon === "string" && icon.startsWith("mdi:") ? icon.slice(4) : undefined;
  return name && name in ICON_SETS[kind] ? name : undefined;
}

/** What it shows when nothing is given in Doma: HA's icon, else the default for its kind. */
const startingIcon = (s: HassEntity, kind: IconKind) => haIcon(s, kind) ?? defaultIcon(s.entity_id, kind);

/** An entity's icon, by name: the one given in Doma, else HA's, else the default. Reads the draft while editing. */
export function iconName(s: HassEntity, kind: IconKind, layout: HomeLayout = editor.layout): string {
  const given = layout.icons?.[s.entity_id];
  return given && given in ICON_SETS[kind] ? given : startingIcon(s, kind);
}

/** Give an entity an icon, in the editor's draft; the one it starts from (HA's, else the default) isn't stored. */
export function setIcon(s: HassEntity, kind: IconKind, name: string) {
  editor.setIcon(s.entity_id, name === startingIcon(s, kind) ? undefined : name);
}

/** Icons are bundled per use; HA's `mdi:` icon names would need the whole set (~3 MB). */
export function entityIcon(s: HassEntity) {
  const kind = iconKind(s.entity_id);
  if (kind) {
    const name = iconName(s, kind);
    if (name === "lightbulb") return s.state === "on" ? mdiLightbulb : mdiLightbulbOutline;
    if (name === "thermostat" && kind === "climate") return modeIcon(s.state === "off" ? "" : s.state);
    return ICON_SETS[kind][name];
  }
  return BY_CLASS[deviceClass(s)] ?? BY_DOMAIN[domainOf(s.entity_id)] ?? mdiEyeOutline;
}

/** Icons of the views the tabs lead to. */
export const VIEW_ICONS: Record<"home" | LensId, string> = {
  home: mdiHomeOutline,
  lights: mdiLightbulbGroupOutline,
  climate: mdiThermostat,
  security: mdiShieldHomeOutline,
  devices: mdiBatteryHeartVariant,
};

/** Icons of HVAC modes (`hvac_modes`); a mode not listed uses the thermostat. */
export const MODE_ICONS: Record<string, string> = {
  off: mdiPower,
  heat: mdiFire,
  cool: mdiSnowflake,
  heat_cool: mdiSunSnowflakeVariant,
  auto: mdiThermostatAuto,
  dry: mdiWaterPercent,
  fan_only: mdiFan,
};

export const modeIcon = (mode: string) => MODE_ICONS[mode] ?? mdiThermostat;
