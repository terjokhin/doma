# ha-ui roadmap

Where the app is going, in order, and how each step is checked. The README covers what exists today.

## Where we stand

*Updated 2026-10-01.*

**Done**
- **Phase 0, device probe**: `probe.html` measured the target tablet (Fire HD 10, Fully Kiosk, Chrome 108).
- **Phase 1, Svelte 5 port**: same screens, start-up JS 98 KB → 33 KB gzipped, build fails above 100 KB.
- **Phase 2, data layer**: filtered subscriptions, `?debug` overlay, paint fixes. On the tablet, screen changes went
  from a ~300 ms frame to 45–70 ms.
- **Phase 3, arrange the home screen** (built, not yet tried on the tablet):
  - the cell grid ([LAYOUTS.md](LAYOUTS.md)), reflowing on rotation; one grid per floor on the home screen;
  - room cards in five sizes (XS, S, M, L, Wide) with light and climate controls, "+N" for the rest;
  - a home layout per HA user (card sizes, and positions per column count) in HA's per-user frontend data, no
    admin login;
  - edit mode: "Edit layout" in the settings menu, drag cards by their handle, tap the size chip, Done / Cancel /
    Reset. Tried in desktop Chrome with mouse and emulated touch, on the demo home.
- Along the way: a power button on climate tiles (devices that were off couldn't be switched on).

**Next: finish Phase 3 on real devices.**
- The first save to our real HA (ask first), then check that a second screen logged in as the same user follows.
- On the Fire HD in Fully with `?debug`: dragging and the size chips by touch, no frames over 25 ms while
  dragging, the layout survives a reload.

**Waiting until later**
- HVAC mode buttons for air conditioners (listed under [Later](#later)).
- Scrolling performance on the slowest tablet hasn't been measured on its own; the fade-in on screen changes is
  the next suspect if they need to get faster.
- Fitting a wall panel's home screen without scrolling (cells would shrink to fit) is an option, not a rule.

## What sets it apart

1. **Fast on weak hardware.** Only the entities on screen are subscribed to, and one entity update re-renders one tile.
2. **Layouts bound to meaning, not entity IDs.** A layout says "the lights in this room" or "the thermostat in this room"
   (areas, floors, labels, domains, device classes), so new devices show up in the right place and renames never
   break it.
3. **Zero setup, full design freedom.** The first layout is generated from Home Assistant's areas and floors; you
   rearrange it from there, on the screen itself, without an admin login.
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

### 3. Arrange the home screen ← in progress
Move room cards and pick their size, on the screen, without an admin login. Only the layout changes: rooms,
areas and floors stay as HA has them, and the cards' contents still come from the room model.

1. ✅ **The grid**: square cells as the unit, sections 4 cells wide, packed into columns
   ([LAYOUTS.md](LAYOUTS.md)). Home and room screens use it; it reflows on rotation.
2. ✅ **Room cards on the home screen**: floors as headings, each room a card with its lights (1 × 1) and
   climate (2 × 1) controls, at most 2 rows plus "+N".
3. ✅ **One cell grid per floor**: the home screen drops the 4-wide section columns; each floor is one grid as
   wide as the screen, and each card covers whole cells (default M, 4 × 3). Check: demo and local fixtures look
   as today at 4, 8, 12 and 16 columns; bundle under budget.
4. ✅ **Card sizes**: XS 2 × 1.5, S 4 × 1.5 (half an M), M 4 × 3, L 4 × 4, Wide 8 × 3
   ([LAYOUTS.md](LAYOUTS.md#room-cards-home-screen)). A card shows as many controls as its size holds, "+N" for the rest.
5. ✅ **Layout model, per HA user**: card sizes and positions per column count, stored in HA's per-user frontend data
   ([LAYOUTS.md](LAYOUTS.md#layout-model)). Any logged-in user can save, so the kiosk arranges its own screen;
   every screen logged in as the same user follows it live. Replaces the first, shared model (never used).
6. **Edit mode** (built; the tablet check is open): "Edit layout" in the settings menu; drag a card by its handle
   to any spot on its floor, tap its size chip to cycle XS → S → M → L → Wide; Done saves, Cancel discards,
   "Reset to default" clears it. Controls don't react while editing. Pointer events, no drag library; while
   dragging only the dragged card moves (`transform`), the others move when its target cell changes. Check on
   the Fire HD with `?debug`: no frames over 25 ms while dragging, the layout survives a reload, a second screen
   follows live.

Cards are **placed freely** on each floor's grid, and every card floats up so there are no gaps above it.
Positions are kept per column count (phone, portrait and landscape tablet, large screen); a width you haven't
arranged follows the reading order of the nearest one. (We started with an order-only model; it couldn't put
a small card under another while the row still had room.)

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
- HVAC mode buttons on climate tiles (heat / cool / dry / fan for air conditioners; today a tile only switches
  on and off, into the last mode).
- What a card shows: kinds of controls per card (lights, climate, switches, sensors), pinned and hidden
  entities, hidden rooms.
- Layouts bound to meaning beyond rooms: sections that select entities by area, domain, device class, label or
  role, resolved against the registries at runtime.
- A layout shared by the whole house (HA's system data, saving needs an admin), with per-user layouts on top.
- Free card sizes (drag a corner) instead of fixed ones; arranging room screens, not only the home screen.
- Importers from Lovelace and ha-fusion, e-ink output.
