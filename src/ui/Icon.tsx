import {
  mdiBatteryMedium,
  mdiBrightness5,
  mdiDoorOpen,
  mdiEyeOutline,
  mdiFan,
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
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { deviceClass, domainOf, isLight } from "../model/home";

export function Icon({ path, size = 24 }: { path: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

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
  weather: mdiWeatherPartlyCloudy,
};

/** Icons are bundled per use; HA's `mdi:` icon names would need the whole set (~3 MB). */
export function entityIcon(s: HassEntity) {
  if (isLight(s.entity_id)) return s.state === "on" ? mdiLightbulb : mdiLightbulbOutline;
  return BY_CLASS[deviceClass(s)] ?? BY_DOMAIN[domainOf(s.entity_id)] ?? mdiEyeOutline;
}
