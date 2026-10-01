# ha-ui roadmap

Where the app is going, in order, and how each step is checked. The README covers what exists today.

## What sets it apart

1. **Fast on weak hardware.** Only the entities on screen are subscribed to, and one entity update re-renders one tile.
2. **Layouts bound to meaning, not entity IDs.** A layout says "the lights in this room" or "the thermostat in this room"
   (areas, floors, labels, domains, device classes), so new devices show up in the right place and renames never
   break it.
3. **Zero setup, full design freedom.** The first layout is generated from Home Assistant's areas and floors; you
   rearrange it from there.
4. **Zero maintenance.** No dependency on Home Assistant's frontend internals, so HA updates can't break it.

## Target devices and budgets

The slowest device we support sets the bar: a **2017 Fire HD 10** (Fire OS 5 / Android 5.1) running Fully Kiosk
Browser 1.59.2 (the last version for Android 5). Its WebView is **Chrome 108**, so that is the build target.

| Budget | Target |
|---|---|
| JavaScript loaded on start | < 100 KB gzipped (`npm run build` fails above it) |
| One entity update: script time from the WebSocket message to the updated DOM | < 16 ms at p95 on the Fire HD |
| The frame that shows an update | not dropped (~16.7 ms at p95, not 33) |
| Screen change (tap to the new screen painted) | < 100 ms on the Fire HD |
| Scrolling and animations | no frames over 25 ms on the Fire HD |

What `probe.html` measured on that tablet (1280×800 CSS px @1.5x, 4 cores):

| | Fire HD 10 (2017) | MacBook (for scale) |
|---|---|---|
| CPU benchmark | 126 ms | 26 ms |
| Parse a 271 KB state dump | 4.4 ms | 0.4 ms |
| Build and lay out 120 tiles | 64 ms | 1.5 ms |
| Update one tile incl. layout, p95 | 3.5 ms | 0.5 ms |
| Frames over 25 ms during 240 single-tile updates | 41 | 1 |

Script time is fine; **painting is the bottleneck**. Keep repainted areas small: no backdrop blur, no large
shadows, no full-screen repaints, animate only `transform` and `opacity`.

Not available on Chrome 108: CSS `color-mix()` and `oklch()`, `Array.prototype.toSorted()` and friends, the Wake Lock
API (a kiosk browser keeps the screen on instead). `tsconfig.json` uses the ES2022 library so newer built-ins fail
the type check.

## Phases

### 0. Device probe ✅
`probe.html` (dev server only) reports the browser version, supported features and rendering speed of a device and
saves them to `.probe/`.

### 1. Svelte 5 port ✅
The React prototype rewritten in Svelte 5 with the same screens and behaviour. Start-up JS went from 98 KB to
32 KB gzipped. The store holds one reactive state per entity; i18n is a small `t()` over the JSON files.

### 2. Data layer ✅
Only receive and process what is on screen, and measure it on the slowest device.

1. ✅ **Debug overlay** (`?debug`): FPS, slow frames, time from a state message to the next frame, messages per
   second, number of subscribed entities. It also posts these numbers and any JS errors to the dev server every few
   seconds (saved to `.probe/`), since the tablet has no DevTools. `?debug&subscribe=all` keeps the old
   subscribe-to-everything mode for comparison. "Script" is the time from a state message to the updated DOM;
   "frame" is the length of the frame that painted it.
2. ✅ **Filtered subscriptions**: send `subscribe_entities` with `entity_ids` (supported by HA core; the JS library's
   `subscribeEntities` doesn't pass the filter) and decode HA's compressed updates ourselves. Screens declare the
   entities they show; the app subscribes to the union and swaps subscriptions on navigation, starting the new one
   before dropping the old one. An empty list is never sent, because HA treats it as "everything".
3. ✅ **Model without live states**: the room model needs device classes and names. It reads them from one
   `get_states` call at start and after registry changes (4.4 ms on the Fire HD), which also seeds tiles so they
   don't pop in. This works for a non-admin kiosk user.
4. ✅ **Paint fixes**, guided by the overlay: `contain` on tiles and cards, and the background glow on its own
   fixed layer instead of `background-attachment: fixed` (which repainted two full-screen gradients on every
   scroll and screen change).
5. ✅ **Measured** on the Fire HD (Fully, Chrome 108) against a real home of ~420 entities:

   | | Before | After |
   |---|---|---|
   | States loaded when the home screen opens | all ~420: 82–110 ms script, frames dropped | 28: 7–13 ms script, none dropped |
   | Live update | 0.5–6 ms script, frame on time | same |
   | Screen change | one ~300 ms frame, every time | 45–70 ms (106 ms the first time a room opens) |
   | JS heap | 28 MB | 28 MB |

   Open: scrolling wasn't measured on its own yet; the fade-in animation on each screen change is the next
   suspect if screen changes need to get faster.

Done when the Fire HD stays under the budgets above against a real home, and the demo fixture behaves the same.

### 3. Layouts bound to meaning ← in progress
1. ✅ **The grid**: square cells as the unit, sections 4 cells wide, packed into columns
   ([LAYOUTS.md](LAYOUTS.md)). Home and room screens use it; it reflows on rotation.
2. ✅ **Room cards on the home screen**: floors as headings, each room a section with its lights (1 × 1) and
   climate (2 × 1) controls, at most 2 rows plus "+N".
3. ✅ **Layout model**: the house layout stores only changes on top of the generated layout (room order, hidden
   rooms, card kinds, pinned and hidden entities), in HA's shared system data, live-synced to every screen
   ([LAYOUTS.md](LAYOUTS.md#layout-model)).
4. **Edit mode** on screen, saving with an admin login.

A layout is a list of sections that select entities by area, domain, device class, label or role, resolved against
the registries at runtime. Today's room model becomes the default generator; you can reorder, hide and pin.

**One layout per house**, shared by every user and screen. It's stored in Home Assistant's frontend *system* data
(`frontend/get_system_data` / `set_system_data`, HA 2026.x), so it survives a cleared browser and needs no
database. Any user can read it, so a non-admin kiosk shows it; saving needs an admin login. (Per-device or
per-person variations are a later step.)

### 4. Showcase screens
- **Heating**: current vs target temperature per room for any `climate` entity, heating switches and valves by role;
  TRV details (valve position, open window) when such entities exist.
- **Zigbee health**: batteries, unavailable devices, link quality and last seen where those entities are enabled.

### 5. Organiser
Suggests and bulk-applies names, areas and labels from Zigbee2MQTT friendly names (configurable pattern, default
`<area>/<what>`). Shows a dry-run diff and applies only after confirmation; needs an admin login.

### 6. History and packaging
Version history with undo for layouts. A static build in a small container image (nginx), plus a Home Assistant
add-on for HA OS users.

### Later
HVAC mode buttons on climate tiles (heat / cool / dry / fan for air conditioners; today a tile only switches
on and off, into the last mode). Per-person and per-tablet views, editing on the tablet itself, importers from Lovelace and ha-fusion, e-ink output.
