#!/usr/bin/env node
// Put the demo Home Assistant's devices into floors and areas, as a made-up house, since Doma's rooms are areas.
// Run it once HA is onboarded; running it again changes nothing.
//
//   node --env-file=.env.hademo docker/demo-ha/seed-areas.mjs
//
// The demo's media players and locks have no unique ID, so HA can't give them an area; configuration.yaml wraps them
// in ones that have (the TV, speakers and door locks below). Its humidifiers and sirens stay out of rooms.
const { HA_URL, HA_TOKEN } = process.env;
if (!HA_URL || !HA_TOKEN) {
  console.error("Set HA_URL and HA_TOKEN (see .env.hademo).");
  process.exit(1);
}

/** Floors by level, each with its areas; an area's entries are devices' or entities' entity IDs. */
const HOUSE = [
  {
    floor: "Basement",
    level: -1,
    areas: {
      Basement: ["binary_sensor.basement_floor_wet", "water_heater.demo_water_heater", "sensor.total_gas_m3"],
    },
  },
  {
    floor: "Ground floor",
    level: 0,
    areas: {
      Hallway: ["light.entrance_color_white_lights", "cover.hall_window", "alarm_control_panel.security", "lock.front_door_lock"],
      "Living Room": [
        "light.living_room_rgbww_lights",
        "light.ceiling_lights",
        "switch.decorative_lights",
        "fan.living_room_fan",
        "climate.hvac",
        "cover.living_room_window",
        "sensor.carbon_dioxide",
        "media_player.living_room_tv",
        "media_player.living_room_speaker",
      ],
      Kitchen: [
        "light.kitchen_lights",
        "switch.ac",
        "cover.kitchen_window",
        "sensor.carbon_monoxide",
        "sensor.power_consumption",
        "media_player.kitchen_speaker",
        "lock.kitchen_back_door",
      ],
      Garage: ["cover.garage_door", "vacuum.demo_vacuum_0_ground_floor", "sensor.total_energy_kwh", "lock.garage_side_door"],
    },
  },
  {
    floor: "First floor",
    level: 1,
    areas: {
      Bedroom: ["light.bed_light", "climate.heatpump", "fan.ceiling_fan", "media_player.bedroom_speaker"],
      Office: ["light.office_rgbw_lights", "climate.ecobee", "fan.percentage_full_fan", "media_player.office_walkman"],
    },
  },
  {
    // Outside, on no floor.
    areas: {
      Garden: [
        "sensor.outside_temperature",
        "sensor.outside_humidity",
        "binary_sensor.movement_backyard",
        "cover.pergola_roof",
        "valve.front_garden",
        "valve.back_garden",
        "lock.garden_gate",
      ],
    },
  },
];

/** The sensors an area shows as its temperature and humidity. */
const AREA_SENSORS = {
  Garden: { temperature_entity_id: "sensor.outside_temperature", humidity_entity_id: "sensor.outside_humidity" },
};

const ws = new WebSocket(HA_URL.replace(/\/+$/, "").replace(/^http/, "ws") + "/api/websocket");
let id = 0;
const pending = new Map();
const call = (type, data = {}) =>
  new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, type, ...data }));
  });

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "auth_required") ws.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
  else if (msg.type === "auth_invalid") fail("authentication failed");
  else if (msg.type === "auth_ok") seed().then(() => ws.close(), (e) => fail(e.message));
  else if (msg.type === "result") {
    const { resolve, reject } = pending.get(msg.id);
    msg.success ? resolve(msg.result) : reject(new Error(msg.error.message));
  }
};
ws.onerror = () => fail(`cannot connect to ${HA_URL}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function seed() {
  const floors = await call("config/floor_registry/list");
  const areas = await call("config/area_registry/list");
  const entities = await call("config/entity_registry/list");

  for (const { floor, level, areas: rooms } of HOUSE) {
    let floorId = null;
    if (floor) {
      floorId = floors.find((f) => f.name === floor)?.floor_id;
      floorId ??= (await call("config/floor_registry/create", { name: floor, level })).floor_id;
    }
    for (const [name, ids] of Object.entries(rooms)) {
      let area = areas.find((a) => a.name === name);
      area ??= await call("config/area_registry/create", { name });
      await call("config/area_registry/update", { area_id: area.area_id, floor_id: floorId, ...AREA_SENSORS[name] });
      for (const entityId of ids) {
        const entry = entities.find((e) => e.entity_id === entityId);
        if (!entry) console.warn(`not found: ${entityId}`);
        // A device's entities follow its area; an entity without a device gets one of its own.
        else if (entry.device_id) await call("config/device_registry/update", { device_id: entry.device_id, area_id: area.area_id });
        else await call("config/entity_registry/update", { entity_id: entityId, area_id: area.area_id });
      }
      console.log(`${floor ?? "(no floor)"} / ${name}: ${ids.length}`);
    }
  }
}
