# ha-ui

A modern, calm UI for [Home Assistant](https://www.home-assistant.io/), made for big screens:
a laptop browser, a wall-mounted tablet, a kiosk display. It's a static web app that talks
to Home Assistant directly over its WebSocket API. There's no server of its own.

- Builds itself from your HA **floors, areas and devices**: no dashboard YAML to maintain.
- Live updates; each tile re-renders only when its own entity changes.
- Touch-first: large tap targets, no hover-only controls.
- English UI, with Russian included; translations live in `src/i18n/*.json`.

## Quick start

```sh
npm install
npm run dev            # http://localhost:5173 (also on your LAN, for a tablet)
```

Open the app, enter your Home Assistant URL and log in on HA's own sign-in page.
The app keeps HA's refresh token in the browser's local storage; it never sees your password.
To skip the URL prompt, copy `.env.example` to `.env.local` and set `VITE_HA_URL`.

**No Home Assistant at hand?** Open <http://localhost:5173/?fixture=demo>.

## Developing against a snapshot

Designing against live HA flips real lights. A fixture is a snapshot of states and registries
that the app runs on instead; toggles only change the snapshot in memory.

```sh
HA_URL=http://homeassistant.local:8123 HA_TOKEN=<long-lived token> npm run fixture:capture
# then open http://localhost:5173/?fixture=local
```

`fixtures/local*.json` is git-ignored and never included in a production build: it describes
a real home. `fixtures/demo.json` is a made-up home.

## Architecture

```
src/
  ha/         connection (OAuth + WebSocket, or a fixture) and the store
  model/      HA registries → floors → rooms → lights / climate / sensors …
  ui/         tiles, header, icons, formatting
  screens/    Home, Room, Setup
  i18n/       en.json is the source; other languages translate it
  styles/     design tokens + styles (dark first, no heavy blur effects)
```

- **Connection**: [`home-assistant-js-websocket`](https://github.com/home-assistant/home-assistant-js-websocket),
  the library HA's own frontend uses. It handles auth, token refresh and reconnects.
- **Store**: one small external store read with `useSyncExternalStore`. Components select
  single entities, so a sensor update re-renders one tile, not the screen.
- **Model**: rooms come from HA areas and floors. An entity's area is its own, or else its
  device's. Hidden and config/diagnostic entities are left out. `switch` entities whose ID
  names a light (`…_light`, `…_lamp`, `…_sconce`) count as lights.
- **Routing**: hash-based (`#/room/kitchen`), so the build can be served from any path.

## Running on a wall tablet

1. Build (`npm run build`) and serve `dist/` from any static web server on your network.
2. On an Android tablet, [Fully Kiosk Browser](https://www.fully-kiosk.com/) gives full-screen
   mode, keeps the screen on, and can wake it on motion.
3. For a login that never expires on the panel, create a non-admin HA user for it. Optionally
   add HA's `trusted_networks` auth provider for the tablet's IP.

## Status

Early. Next up: a curation layer (room order, favourites, per-home overrides), media controls,
energy view, alerts, idle/ambient mode.
