# Home Assistant dashboards in the wild: comparison

Compiled 2026-10-01 from the research of 2026-09-30 (sources in ha-dashboard-builders.md and own-dashboard-angles.md). Status = latest release found then.

## Standalone apps (own frontend, talk to HA over WebSocket)

| Dashboard | Strengths | Weaknesses | Status | What ours must do better |
|---|---|---|---|---|
| **ha-fusion (knowald fork)** | Drag-and-drop editor for views, sections, sidebar; layout saved as plain YAML; HA add-on + Docker; Svelte 5 | Every card bound to a specific entity ID; small community (≈30 stars); you still place every device by hand | Active, 2026.8.2 (Aug 2026) | Layouts that fill themselves from rooms and roles, so new devices appear without editing |
| ha-fusion (original, matt8707) | Big community (≈3k stars), the reference for "standalone HA dashboard" | Not maintained since Oct 2024 | Abandoned | Be the maintained, modern answer for its users; offer an importer from its YAML |
| **Tunet** | React + Tailwind, drag-and-drop masonry grid, PIN-protected settings, layouts synced across devices, add-on + Docker, strong energy/EV cards | Fixed set of ~23 cards, no plugin system; React stack is heavier on old tablets | Active, v1.20.8 (Aug 2026) | Faster on weak tablets; extensible card types |
| **GlassHome** | Most polished out of the box, themes, widget hub, kiosk pairing, guest access | Closed source; PRO costs $39.99; glass/blur look is expensive on old hardware | Active commercial | Free and open, just as polished, and smooth on a Fire HD |
| Magic Frame | Dashboard + Immich photo frame in one, 24-column drag-and-drop grid, live sync between screens, 20 snapshots for undo | Needs Postgres + Caddy + Next.js stack; non-commercial licence | v1.0 (May 2026) | One light container or add-on, no database; version history built in |
| HA Studio Pro | Native iPad/Android editor app, drag and resize, layouts stored in HA | Closed source, paid, editor only on its own app | v1.2.1 (Aug 2026) | Edit from any browser, including on the wall tablet itself |
| Dashboard 3.0 (hiddevanbrussel) | Simple drag-and-drop web app, screensaver, Music Assistant | Early, small feature set | Early (Feb 2026) | Depth: heating, Zigbee health, organiser |
| CasaBoard | Self-hosted builder, no cloud, HACS sidebar panel | Very early (0 stars), Next.js server needed | Very early | Ship a complete, stable product rather than a framework |
| TileBoard / AppDaemon HADashboard | Lightweight, kiosk-oriented, long history | Config-file only, no visual editor, dated look | Not verified, appear stale | Visual editing with the same lightness |

## Inside Home Assistant

| Dashboard | Strengths | Weaknesses | Status | What ours must do better |
|---|---|---|---|---|
| **HA Home dashboard** (default since 2026.2) | Zero setup: auto-built from areas, favourites, summaries, prompts to assign new devices to rooms | Fixed design you can only tweak; overwrote people's customised Overview in 2026.2.1; slow on old tablets (open issue: 10–60 s renders on Fire HD) | Core | Same zero setup, but with your own design on top, and fast on weak hardware |
| **Sections view** + Mushroom | Native drag-and-drop grid, visual editor, large card ecosystem | Manual placement per entity; full-house state stream makes tablets slow | Core / maintained | Auto-placement by room and role; only load what's on screen |
| **Bubble Card** | Pop-ups, mobile-first, visual editor, Module Store with 100+ modules, per-domain card suggestions | Lives inside HA, so inherits HA's performance and update breakage | Active, v3.3.0 (Aug 2026) | Never break on HA updates; same "suggest a card for this device" idea at the layout level |
| **Ultra Card** | No-YAML visual card builder, conditions, Jinja templates, animations, AI layout generation | Builds single cards, not a whole home; heavy for weak devices | Active, v3.5.0 (Jun 2026) | Whole-home layouts, not card-by-card building |
| Drag & Drop Card (Prosono) | Freeform canvas inside HA: move, resize, layer cards; per-device layouts; template store | Templates must be re-pointed at your own entity IDs; inherits HA performance | Active, v2.0.3 (Jun 2026) | Shareable templates that map onto any home automatically |
| Dwains Dashboard | Auto-generated area/floor dashboard, long-running | Limited design control, inside HA | Active, v3.10.0 (Aug 2026) | Auto-generation plus full design freedom |
| Card-mod / custom-card stacks (ULM, Hemma, Mobile-First) | Beautiful results, lots of shared configs | Break after HA frontend updates; hours of YAML; entity IDs hard-coded | Varies | Zero maintenance, no YAML |

## What ours must stand out on (the build list)

1. **Fast on weak hardware.** Subscribe only to entities on screen (`subscribe_entities` with `entity_ids`), re-render only the changed tile, no blur, small bundle. Target: smooth on an old Fire HD. Beats: HA dashboards, Tunet, GlassHome, all in-HA cards.
2. **Layouts bound to meaning, not entity IDs.** Cards target "lights in this room" or "TRV in this room"; new devices appear automatically; renames never break; templates are shareable between homes. Beats: everyone; nobody does this for hand-designed layouts.
3. **Zero setup with full design freedom.** Start from an auto-generated layout built from HA areas (like HA's Home dashboard), then rearrange freely. Beats: HA Home dashboard (fixed design) and ha-fusion/Tunet (blank start).
4. **Built-in organiser.** Suggest and bulk-apply names, areas and labels, e.g. from Zigbee2MQTT `area.function` names. Beats: everyone; all tools assume your HA registry is already tidy.
5. **Zero maintenance.** Independent from HA frontend internals; version history with undo. Beats: card-mod setups, in-HA cards, HA's own migrations.
6. **Showcase screens.** Per-room heating (current vs target, valve position, open window, schedule) and Zigbee health (link quality, battery, offline). Beats: nobody covers these well.
7. **Light to run.** Static app as an HA add-on or Docker image, no database. Beats: Magic Frame, CasaBoard.
8. Later: per-person and per-tablet views with real limits, edit on the tablet itself, importer from Lovelace / ha-fusion YAML, e-ink PNG output.

Suggested order: 1 and 2 are the foundation (data layer and layout model), then 3, 6, 4, 5, 7, then 8.
