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
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
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

const BY_DOMAIN: Record<string, string> = {
  switch: mdiPower,
  input_boolean: mdiPower,
  fan: mdiFan,
  climate: mdiThermostat,
  media_player: mdiSpeaker,
  scene: mdiPalette,
  weather: mdiWeatherPartlyCloudy,
};

/** Icons are bundled per use; HA's `mdi:` icon names would need the whole set (~3 MB). */
export function entityIcon(s: HassEntity) {
  if (isLight(s.entity_id)) return s.state === "on" ? mdiLightbulb : mdiLightbulbOutline;
  if (isHeatingSwitch(s.entity_id)) return mdiHeatingCoil;
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
