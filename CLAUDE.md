# Doma

A calm, fast big-screen UI for Home Assistant: wall tablets, kiosks, a laptop browser. A static web app (Svelte 5 +
TypeScript + Vite) that talks to HA over its WebSocket API with `home-assistant-js-websocket`; no server of its own.
Meant to be open source, so everything committed stays generic: nothing about one particular home.

*Doma* is Russian for "at home". Its working name was ha-ui: data stored under the old names moves over once
(`src/migrate.ts` for the browser's login, address and language; `migrateLayout` in `src/ha/live.ts` copies the
layout in HA's per-user data from `ha-ui.layout` to `doma.layout`). Keep both until no screen can still have old data.

## Where things are

- `ROADMAP.md`: **"Where we stand"** (read it first), what sets Doma apart, the views and navigation design,
  budgets and what was measured, phases. Update "Where we stand" when a step is done.
- `LAYOUTS.md`: the cell grid, sizes, sections, room cards, lens screens, the layout model and edit mode.
- `README.md`: what exists today, how to run it, architecture.
- `discovery/`: competitor research and the original brief.

## Rules

- **Generic only.** No entity IDs, names or data of a real home in committed code, fixtures or docs. A real home's
  snapshot lives in git-ignored `fixtures/local*.json`; `fixtures/demo.json` is a made-up home.
- **English is the source language** (`src/i18n/en.json`); Russian is a translation. Add every new string to both.
- **The slowest target sets the bar:** a 2017 Fire HD 10 (Fire OS 5) in Fully Kiosk 1.59.2, WebView **Chrome 108**.
  Budgets: start-up JS < 100 KB gzipped (`npm run build` fails above it), one entity update < 16 ms script, a
  screen change < 100 ms, no frames over 25 ms while scrolling or dragging.
- Not on Chrome 108, so don't use: `color-mix()`, `oklch()`, `subgrid`, `toSorted()` and other ES2023 built-ins
  (`tsconfig.json` uses the ES2022 lib so they fail the type check). TypeScript stays on 6.x for svelte-check.
- **Painting is the bottleneck, not JavaScript.** Animate only `transform` and `opacity`; no backdrop blur or
  large shadows; keep repainted areas small. A laptop with CPU throttling does not reproduce paint costs: only
  the tablet tells.
- No UI component, animation or drag libraries; check the build's size report when adding any dependency.
- Layouts are bound to meaning (areas, floors, device classes, roles), never to entity IDs.
- Commit or push only when asked. Commit messages: a short subject, then why; end with the co-author line.

## Running and testing

- `npm run dev` (also on the LAN), then `?fixture=demo` (made-up home) or `?fixture=local` (a snapshot:
  `HA_URL=… HA_TOKEN=… npm run fixture:capture`). Without `?fixture` it connects to a real HA: toggles are real.
- `npm run build` type-checks, builds and checks the size budget; `npm run typecheck` alone runs svelte-check.
- **`?debug`** shows FPS, slow frames and update and screen-change timings, and posts a report every 5 s to the
  dev server, which saves it to `.probe/perf-<date>-chrome<version>.jsonl` (git-ignored). A tablet has no
  DevTools, so these reports are how changes are judged on it: compare before/after per screen, over several
  visits (single visits vary a lot).
- `probe.html` (dev server only) measures a device's browser and rendering speed.

## Lessons from measuring (keep)

- A new subscription makes HA send every state in full again; the store keeps a state it already has (same state
  and `last_updated`, compared as times), so screen changes don't re-render everything.
- Derived values that read many entities (status chips) are one component each, so a change recomputes only what
  reads it.
- `content-visibility: auto` made Chrome 108 slower (more slow frames, updates over budget); the screen fade-in
  made no difference either way. Both are recorded in the roadmap.
