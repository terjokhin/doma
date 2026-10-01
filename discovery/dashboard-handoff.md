# HA dashboard: project brief

Context handed over from research on 2026-09-30. Full notes: ha-dashboard-builders.md and own-dashboard-angles.md.

## Goal
A standalone Home Assistant dashboard (own frontend over HA's WebSocket API) for wall tablets and phones, with a real edge over ha-fusion, Tunet, GlassHome and HA's own auto-generated Home dashboard.

## What makes it different
1. **Layouts bound to meaning, not entity IDs.** Cards target "lights in this room", "the TRV in this room", using HA areas, floors, labels, domains and device classes. New devices appear in the right place, renames never break a layout, layouts can be shared between homes.
2. **Built-in organiser.** Suggest and bulk-apply names, areas and labels (e.g. from Zigbee2MQTT `area.function` friendly names).
3. **Fast on weak hardware.** Must feel instant on an old Amazon Fire HD.
4. **Zero maintenance.** Does not depend on HA frontend internals, so HA updates cannot break it. Version history and undo for layouts.
- Showcase screens: per-room heating (current vs target, valve position, open-window state, schedule) for Aqara TRVs, and Zigbee health (link quality, battery, offline devices).
- Not an edge on its own anymore: zero-config setup (HA 2026.2 Home dashboard) and alerts-only sections (HA 2026.9 Security dashboard).

## Build order
1. Data layer: filtered `subscribe_entities`, per-entity reactive store (fast on weak hardware).
2. Layout model bound to meaning (area/role/domain/device class), not entity IDs.
3. Auto-generated starting layout from HA areas, freely rearrangeable.
4. Showcase screens: per-room heating, Zigbee health.
5. Organiser for names, areas, labels.
6. Version history and undo; package as HA add-on / Docker, no database.
7. Later: per-person/per-tablet views, on-tablet editing, Lovelace/ha-fusion importer, e-ink PNG output.

Competitor table: dashboard-comparison.md.

## Stack
- Svelte 5 + Vite. Static files, no backend at first (serve from an HA add-on or `/config/www` as `/local/`).
- `home-assistant-js-websocket` for connection and auth only.
- Subscribe with `{"type": "subscribe_entities", "entity_ids": [...]}` for the entities in the current view only; re-subscribe on view change. HA core supports the `entity_ids` filter (homeassistant/components/websocket_api/commands.py); the JS library's `subscribeEntities` does not pass it, so send the message yourself.
- Store: map of entity_id -> reactive state, so one entity change re-renders one tile.
- Plain CSS with CSS variables. Animate only transform/opacity. No backdrop blur, no large shadows.
- Icons: individual MDI SVG paths (`@mdi/js`), never the whole font.
- Charts: uPlot.
- Avoid: React/HAKit, UI component libraries, animation libraries.

## Performance budget (targets, verify on device)
- Under ~100 KB JS gzipped on first load.
- One entity update rendered in under 16 ms on the Fire HD.

## Testing on the Fire HD (USB port is broken)
- `vite --host`, open `http://<pc-ip>:5173` in Fully Kiosk or Silk over Wi-Fi.
- Check `navigator.userAgent` on the tablet first and set Vite `build.target` to its Chrome version.
- Eruda in dev builds only for an on-device console.
- Build a debug overlay: FPS, render time per update, state messages per second, reported back to the dev server.
- Chrome DevTools with 6x CPU throttling for quick checks between device tests.

## Owner's setup
Zigbee2MQTT, Aqara TRVs, device names follow `area.function`.
