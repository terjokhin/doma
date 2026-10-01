# ha-ui

A modern, calm UI for [Home Assistant](https://www.home-assistant.io/), made for big screens:
a laptop browser, a wall-mounted tablet, a kiosk display. It's a static web app that talks
to Home Assistant directly over its WebSocket API. There's no server of its own.

- Builds itself from your HA **floors, areas and devices**: no dashboard YAML to maintain.
- **Fast on old tablets**: about 33 KB of gzipped JavaScript, and it only subscribes to the
  entities on screen. Each tile re-renders only when its own entity changes.
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

## Browser support

Chrome / Android WebView **108+**, Safari 16+, Firefox 115+. The oldest target is the WebView of
a 2017 Fire HD 10 (Fire OS 5), which is Chrome 108. Not available there, so not used:
CSS `color-mix()` and `oklch()`, `Array.prototype.toSorted()` and other ES2023 built-ins, the
Wake Lock API. `tsconfig.json` uses the ES2022 library, so newer built-ins fail the type check.
[ROADMAP.md](ROADMAP.md) has the performance budgets and what was measured on that tablet.

## Developing against a snapshot

Designing against live HA flips real lights. A fixture is a snapshot of states and registries
that the app runs on instead; toggles only change the snapshot in memory.

```sh
HA_URL=http://homeassistant.local:8123 HA_TOKEN=<long-lived token> npm run fixture:capture
# then open http://localhost:5173/?fixture=local
```

`fixtures/local*.json` is git-ignored and never included in a production build: it describes
a real home. `fixtures/demo.json` is a made-up home.

## Testing on a tablet

`npm run dev` listens on your LAN, so a tablet can open `http://<your-computer's-ip>:5173`
over Wi-Fi (no USB needed). If it can't connect, check your computer's firewall.

- **Device probe**: open `/probe.html` on the tablet. It reports the browser version, which
  features it supports and how fast it renders, and saves the result to `.probe/` on your
  computer. Run it inside the kiosk browser you'll use: that's the engine that counts.
- **Debug overlay**: add `?debug` to the app URL for FPS, slow frames, update and screen-change
  timings and the number of subscribed entities. Against the dev server it also posts a report
  every 5 seconds, including any JS errors, which the dev server prints and saves to
  `.probe/perf-*.jsonl`. `?debug&subscribe=all` subscribes to every entity instead, for
  comparison. The overlay is a separate 1 KB chunk, loaded only with `?debug`.
- Between device tests, Chrome DevTools with 6× CPU throttling is a rough stand-in.

## Running on a wall tablet

1. Build (`npm run build`) and serve `dist/` from any static web server on your network.
2. Install [Fully Kiosk Browser](https://www.fully-kiosk.com/): full screen, screen always on,
   launch on boot, optional wake on motion. Its settings are behind a swipe from the left edge
   of the screen (**Settings → Web Content Settings → Start URL**).
   - **Old Android / Fire tablets**: current Fully needs Android 6+. The last version for
     Android 5 (Fire OS 5) is **1.59.2**, available as an APK in the download section of
     fully-kiosk.com. On Fire OS 5, enable **Settings → Security → Apps from Unknown Sources**,
     download the APK in Silk and open it from the Docs app (**Local Storage → Download**).
   - Fully renders with the system WebView, not with Silk or Chrome, so check its version with
     `probe.html` inside Fully.
3. Give the panel its own Home Assistant user: **Settings → People → Add person**, allow login,
   turn on **Can only log in from the local network**, leave **Administrator** off. A non-admin
   user can see and control entities but can't open HA's settings. HA has no per-entity
   permissions, though: the user can control every entity, so use Fully's kiosk lock to keep
   people inside the app. The panel stays logged in through its refresh token. Optionally, HA's
   `trusted_networks` auth provider can log in the tablet's IP without a password.
4. Old Android devices (5.x) don't trust current Let's Encrypt certificates. On a home network,
   plain `http://` to Home Assistant avoids that.

## Architecture

```
src/
  ha/         connection (OAuth + WebSocket, or a fixture), subscriptions and the store
  model/      HA registries → floors → rooms → lights / climate / sensors …
  ui/         tiles, header, icons, formatting
  screens/    Home, Room, Setup
  i18n/       en.json is the source; other languages translate it
  debug/      performance counters and the ?debug overlay
  styles/     design tokens + styles (dark first, no heavy blur effects)
```

- **UI**: [Svelte 5](https://svelte.dev/) with plain CSS. `npm run build` type-checks, builds and
  fails if the JavaScript loaded on start exceeds 100 KB gzipped.
- **Connection**: [`home-assistant-js-websocket`](https://github.com/home-assistant/home-assistant-js-websocket),
  the library HA's own frontend uses, for auth, token refresh and reconnects.
- **Subscriptions**: each component declares the entities it shows (`watchEntities`), and the
  app subscribes to exactly that set with `subscribe_entities` and an `entity_ids` filter. The
  library's own `subscribeEntities()` can't filter, so the app sends the message itself and
  decodes HA's compressed updates (`ha/entities.ts`). On navigation, the new subscription starts
  before the old one stops. An empty list is never sent: HA reads it as "everything".
- **Store**: registries, plus a reactive state per entity (`home.entity(id)`), so a sensor
  update re-renders one tile, not the screen.
- **Model**: rooms come from HA areas and floors, built from the registries and one `get_states`
  snapshot (loaded at start and after registry changes), not from live updates. An entity's
  area is its own, or else its device's. Hidden and config/diagnostic entities are left out.
  `switch` entities whose ID names a light (`…_light`, `…_lamp`, `…_sconce`) count as lights.
- **i18n**: a tiny `t()` over the JSON files, with i18next-style `{{name}}` and plural keys
  (`_zero`, `_one`, `_few`, `_many`, `_other`).
- **Routing**: hash-based (`#/room/kitchen`), so the build can be served from any path.
- **Rendering on weak hardware**: no backdrop blur or large shadows; tiles and cards use CSS
  `contain`; full-screen effects sit on their own fixed layer, so scrolling and screen changes
  don't repaint them.

## Development notes

- `npm run typecheck` runs `svelte-check`. TypeScript is pinned to 6.x, because `svelte-check`
  doesn't support TypeScript 7 (the native compiler) yet.
- Don't add UI component or animation libraries; check `npm run build`'s size report when adding
  any dependency.

## Status

Early. See [ROADMAP.md](ROADMAP.md) for the plan, target devices and performance budgets.
