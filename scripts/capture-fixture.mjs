#!/usr/bin/env node
// Snapshot a live Home Assistant into fixtures/<name>.json, to develop the UI without touching HA.
//
//   HA_URL=http://homeassistant.local:8123 HA_TOKEN=<long-lived token> npm run fixture:capture [-- name]
//
// The default name is "local", which is git-ignored: a snapshot of a real home is private.
import { writeFileSync } from "node:fs";

const { HA_URL, HA_TOKEN } = process.env;
if (!HA_URL || !HA_TOKEN) {
  console.error("Set HA_URL and HA_TOKEN (a long-lived access token from your HA profile).");
  process.exit(1);
}
const name = process.argv[2] ?? "local";

const ws = new WebSocket(HA_URL.replace(/\/+$/, "").replace(/^http/, "ws") + "/api/websocket");
let id = 0;
const pending = new Map();

ws.onmessage = ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.type === "auth_required") ws.send(JSON.stringify({ type: "auth", access_token: HA_TOKEN }));
  else if (msg.type === "auth_invalid") fail("authentication failed");
  else if (msg.type === "auth_ok") capture().catch((e) => fail(e.message));
  else if (msg.type === "result") {
    const { resolve, reject } = pending.get(msg.id);
    msg.success ? resolve(msg.result) : reject(new Error(msg.error.message));
  }
};
ws.onerror = () => fail(`cannot connect to ${HA_URL}`);

function call(type) {
  return new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, type }));
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function capture() {
  const [config, states, floors, areas, devices, display] = await Promise.all([
    call("get_config"),
    call("get_states"),
    call("config/floor_registry/list"),
    call("config/area_registry/list"),
    call("config/device_registry/list"),
    call("config/entity_registry/list_for_display"),
  ]);
  // Drop per-session secrets (camera/media tokens) that are useless in a snapshot anyway.
  for (const s of states) delete s.attributes.access_token;
  const fixture = {
    config: { version: config.version, language: config.language, unit_system: config.unit_system, time_zone: config.time_zone },
    states,
    floors,
    areas,
    devices: devices.map(({ id, name, name_by_user, area_id, manufacturer, model, disabled_by }) => ({
      id, name, name_by_user, area_id, manufacturer, model, disabled_by,
    })),
    entities: display.entities,
  };
  const path = new URL(`../fixtures/${name}.json`, import.meta.url);
  writeFileSync(path, JSON.stringify(fixture));
  console.log(`Wrote fixtures/${name}.json: ${states.length} states, ${areas.length} areas, ${devices.length} devices`);
  ws.close();
}
