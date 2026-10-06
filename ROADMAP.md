# Doma roadmap

Where the app is going, in order, and how each step is checked. The README covers what exists today.

## Where we stand

*Updated 2026-10-06: Phase 6, Home, is well under way; next is a round on the Fire HD.*

**Done**
- **Phase 0, device probe**: `probe.html` measured the target tablet (Fire HD 10, Fully Kiosk, Chrome 108).
- **Phase 1, Svelte 5 port**: same screens, start-up JS 98 KB → 33 KB gzipped, build fails above 100 KB.
- **Phase 2, data layer**: filtered subscriptions, `?debug` overlay, paint fixes. On the tablet, screen changes went
  from a ~300 ms frame to 45–70 ms.
- **Phase 3, arrange the home screen** (checked on the Fire HD 2026-10-02):
  - the cell grid ([LAYOUTS.md](LAYOUTS.md)), reflowing on rotation; one grid per floor on the home screen, with
    rows of half a cell;
  - room cards in five sizes: XS 2 × 1.5, S 4 × 1.5 (half an M), M 4 × 3, L 4 × 4, Wide 8 × 3, with light and
    climate controls, "+N" for the rest;
  - free placement: cards sit where you put them and float up, so a small card can go under another; positions
    are kept per column count (phone, portrait and landscape tablet, large screen);
  - a home layout per HA user (`sizes`, `grids`) in HA's per-user frontend data, no admin login. Saving to our
    HA, and a second connection receiving the change live, were checked;
  - edit mode: the edit button next to the settings gear, drag cards by their handle, pick a size from the chip's
    menu, Done / Cancel / Reset.
- Along the way: a power button on climate tiles (devices that were off couldn't be switched on).
- **Phase 4, views and lenses** (design in [Views and navigation](#views-and-navigation); checked on the Fire HD
  2026-10-02):
  - the Lights, Climate, Security and Devices lenses; tabs under the header (a bar at the bottom on a phone),
    picked and ordered in edit mode and saved as `tabs`; status chips; back from a room to where you came from;
  - Home and the tab lenses stay built once visited: going back to one takes about 50 ms instead of about
    135 ms, rooms about 60 ms (budget 100). Live updates cost a little more for it (step 6);
  - start-up JS went from 40.7 to 45.5 KB gzipped.

- **Phase 5, room screens**: the **room template** (checked on a laptop; the Fire HD check goes with Phase 6's):
  a Scenes section; sections dragged by their title into the column you want, renamed, widened and hidden, for
  every room or only this one; tiles hidden on one room's screen. Start-up JS 50.7 KB gzipped.

- **Phase 6 so far** (2026-10-05/06, checked on a laptop only), from the "calm cards" design inspired by
  hass-config:
  - **tiles**: every control on a card is a 1 × 1 split tile: the icon switches, the rest opens a **pop-up**
    (a light's brightness and colour, a room's lights, climate target, modes and fan, a big switch for the rest).
    Only the icon is tinted when on; the tile keeps its colour. Room screens and lenses split theirs the same way;
  - **feedback**: a spinner while HA hasn't answered, a message with "Try again" when it doesn't or refuses, Undo
    after a scene;
  - **cards**: no box, only as tall as their tiles (up to two rows); sizes are widths only (XS, M, Wide, Full);
    cards go in **rows** in an order, so titles line up (replaced free placement, like HA's sections view);
  - **editing Home**: each card's controls in place (add, remove, move, swap), hide rooms, Home with or without
    floor grouping (each keeps its own order); drag a card by its title, one ⋯ menu per card;
  - the header names the weather, its clock is smaller; a **Docker image** that's told where HA is at start.
  Start-up JS 61.9 KB gzipped.

**Now: Phase 6, Home: run the house from one screen.** Next, in order:
1. **A round on the Fire HD** with `?debug`: tiles, opening a pop-up, the spinner, live updates with the new tiles,
   against the budgets. (The room template from Phase 5 was never measured there either.)
2. **"Start a new row"** in a card's ⋯ menu: that room always begins a row, leaving the rest of the row before it
   empty, like ending a horizontal stack in ha-fusion. Today rows fill themselves, so space can't be left empty.
3. **A calmer edit mode** with a design pass (see Later): only the selected card shows its tools.
4. Tile names are cut short ("Ceiling li…"): maybe drop the On / Off line on lights, so names get two lines.
5. Then the rest of [Phase 6](#6-home-run-the-house-from-one-screen): merge rooms; blinds, media and locks as tiles
   with pop-ups; readings and alert badges in card titles; a house-wide section; rooms without tiles folded into one
   line of names.

Then Phase 7: **custom views** of free sections, any devices in any section, each with its own name, size and
place. Home and the room screens stay the generated starting point.

**Waiting until later**
- Scrolling performance on the slowest tablet hasn't been measured on its own.
- The first visit to a tab still builds it (up to about 200 ms on the Fire HD). Building the tabs in the background
  after start-up would make that fast too, at the cost of a busier start.
- Fitting a wall panel's home screen without scrolling (cells would shrink to fit) is an option, not a rule.

## What sets it apart

1. **Fast on weak hardware.** Only the entities on screen (and on the screens kept built) are subscribed to, and one entity update re-renders one tile.
2. **Layouts bound to meaning, not entity IDs.** A layout says "the lights in this room" or "the thermostat in this room"
   (areas, floors, labels, domains, device classes), so new devices show up in the right place and renames never
   break it.
3. **Zero setup, full design freedom.** The first layout is generated from Home Assistant's areas and floors; you
   rearrange it from there, on the screen itself, without an admin login.
4. **Zero maintenance.** No dependency on Home Assistant's frontend internals, so HA updates can't break it.

## Views and navigation

Decided 2026-10-02. The plan for every screen the app will have and how you get between them.

### One model, many generators

Every screen is a **view**. A view holds **sections** (a titled group on its own grid), a section holds **cards**,
and a card holds **controls** (the buttons and tiles you tap). Home, room and custom screens aren't separate
systems: they differ only in where their sections come from.

| View | Its sections come from | You can change |
|---|---|---|
| **Home** | floors, each with a card per room | card sizes and positions; hidden and merged rooms, each card's quick controls and title (for every card or one), a house-wide section |
| **Room** (one per area) | a room template: Scenes, Lights, Climate, Switches, Media, Sensors | the template for every room at once, or one room's own; hidden entities per room |
| **Lens** (across rooms) | one function across the house: Lights, Climate, Security, Devices; later Energy | which lenses are tabs, and their order |
| **Custom** | you: [free sections](#free-sections) | anything: sections holding any devices, each named, sized and placed on its own; per HA user |

A generated view stays generated: your edits are kept as changes on top of it (like the home layout), so new
devices and rooms keep showing up. Home Assistant makes you "take control" of a generated dashboard before you can
edit it, and from then on nothing new appears by itself; here it does.

### Home: the starting point

Decided 2026-10-02, widened 2026-10-04. What's generated stays the way in: Home, grouped by floors with a card per
room (from HA's floors and areas), and a room screen per room. Home is where the house is run from: what you do
every day should be on a card, and a room screen is for the rest. On Home you adjust it, without building
anything:

- **hide** a room;
- **merge** rooms: two or more HA areas shown as one room, with one card and one room screen (an open-plan
  kitchen and dining room), without changing HA's areas;
- **reorder** rooms: drag their cards (done in Phase 3);
- **quick controls**: which controls a card shows, in what order and in what form. A **card template** says it
  for every card in *kinds* ("all lights", "climate", "lights", "scenes"), so new devices show up by themselves;
  **this room only** gives one card its own list, where a single device can also be picked (stored by its entity
  ID, like a tile hidden on a room screen);
- **more kinds of control** on a card: the room's lights on/off, scenes, climate with − / + for the target
  temperature, blinds, media, locks;
- **the title**: which readings it shows (temperature, humidity, CO₂, and from which sensor) and which alerts
  (window open, motion, leak);
- **a long press** on any control opens its device sheet (brightness, colour, HVAC modes), so a card is enough
  without opening the room;
- **a house-wide section**: house scenes, all lights off, weather. A fixed, small version of
  [free sections](#free-sections).

### Free sections

Decided 2026-10-02, for **custom views** (Phase 7). A custom view is made of sections that aren't tied to a room or
a kind of device: **any section can hold any devices**, from any room, and **each section has its own name, width
and place**, independently of the others. Room screens stay generated from the room template; custom views are
where you build something of your own.

### Navigation

- **At most two levels**: a view, then a room. Details of one device (brightness, colour, HVAC modes, history)
  open as a sheet over the screen, never as a page of their own.
- **Tabs**: Home first, then the views you pick, in the order you pick them (in edit mode). A lens that isn't a
  tab is still reached from its status chip. On a tablet the tabs sit in a band under the header, not in a side
  rail: a rail one cell wide would cost a 1280 px screen four of its 12 columns. On a phone (4 columns) they
  move to a bar at the bottom.
- **Status chips** next to the tabs say what's going on, and only when there's something to say: "3 lights on",
  "2 heating", "Door open · Hallway", "2 offline". Each opens its lens, so the band doubles as the alerts row.
- **Back** from a room goes to the screen you came from (Home or a lens).
- Later, for wall panels: swipe between rooms, a start view per screen and a return to it after a few idle
  minutes, and links such as `#/lens/lights` to pin a tablet to one view.

### Lenses

A lens takes one function across the whole house and groups it the way Home does: floor headings, then a section
per room, packed into columns like a room screen. Tapping a room's name opens the room.

| Lens | Each room's section shows | Chip |
|---|---|---|
| Lights | its lights, with all on / all off | lights on |
| Climate | climate devices, heating switches, temperature, humidity, CO₂ | climate devices heating, cooling or on |
| Security | doors, windows, leak, smoke and gas sensors, locks | something detected (alert), or doors and windows open |
| Devices | devices that are offline, and battery levels, lowest first | devices offline, batteries at 20 % or below |

Later: Energy (solar, grid, from HA's energy settings); TRV details in Climate (valve position, open window); link
quality and last seen in Devices where those entities are enabled.

### Building blocks for custom views

Kept small on purpose. **Sections**: a floor, a room, or a free section. **Cards**: a room card; tiles (one or
more controls); a summary ("3 of 7 lights on", "average 21.6°"); the header (clock, weather); a graph; a camera; a
link to a view or room. A card's contents come from a pinned entity or from a **selector**, such as
`{area: living_room, domain: light}` or `{floor: first_floor, role: heating_valve}`, resolved against HA's
registries when the screen opens. A view built from selectors survives renames, fills itself as devices are
added, and can be shared with another home.

A new view never starts blank unless you ask: Blank, Copy of Home, One floor, One room (a child's tablet), or a
lens. The **+ Add** picker suggests what's in the room first ("3 lights, 1 air conditioner, a leak sensor"), and
the full entity list second.

### Where it's stored

Everything stays per HA user, in the same `doma.layout` entry: the home layout today, plus `tabs` (Phase 4),
the room template (`room`, Phase 5), Home's rooms and cards (Phase 6) and custom views (Phase 7). A sketch of where it's heading:

```json
{ "version": 1,
  "tabs": ["lights", "climate", "v:evening"],
  "sizes": {}, "grids": {},
  "room": { "places": { "3": [{ "id": "lights", "x": 0 }, { "id": "climate", "x": 1 }] },
            "widths": { "lights": 2 }, "names": { "scenes": "Moods" }, "hidden": [],
            "rooms": { "kitchen": { "own": { "places": {} }, "hide": [] } } },
  "hiddenRooms": ["garage"], "merged": [["kitchen", "dining_room"]],
  "card": { "controls": ["all-lights", "climate", "lights"], "title": ["temperature", "humidity"] },
  "cards": { "kitchen": { "controls": ["scenes", "light.kitchen_ceiling", "climate"] } },
  "views": { "v:evening": { "title": "Evening", "icon": "sofa", "sections": [
      { "title": "Living room", "cards": [
        { "card": "room", "area": "living_room", "size": "wide" },
        { "card": "tiles", "select": { "area": "living_room", "domain": "light" } },
        { "card": "tile", "entity": "scene.movie" } ] } ] } } }
```
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

### 3. Arrange the home screen ✅
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
6. ✅ **Edit mode**: the edit button next to the settings gear; drag a card by its
   handle to any spot on its floor, pick its size from the chip's menu (XS, S, M, L, Wide); Done saves, Cancel discards,
   "Reset to default" clears it. Controls don't react while editing. Pointer events, no drag library; while
   dragging only the dragged card moves (`transform`), the others move when its target cell changes.
   Checked on the Fire HD (2026-10-02): dragging and the size menu by touch work and feel smooth, the layout
   survives a reload. While dragging, 4% of frames take over 25 ms (worst 116 ms), against a target of none; not
   noticeable in use. Each step of a drag re-places every card; cards now keep their size and controls objects
   across a move, so none of them re-renders (script time over a drag down about a quarter on a laptop with 6×
   CPU throttling).

Cards were **placed freely** on each floor's grid, and every card floated up so there were no gaps above it.
Positions were kept per column count. (We started with an order-only model; it couldn't put a small card under
another while the row still had room.) Replaced on 2026-10-06 by rows in an order (Phase 6): with cards only as
tall as their tiles, the masonry put titles of neighbouring rooms at different heights; HA's sections view and
ha-fusion use rows for the same reason.

### 4. Views and lenses ✅
The first views beyond Home and the rooms, and the navigation between them
([Views and navigation](#views-and-navigation)).

1. ✅ **Names**: a room on the home screen is a *card* (`RoomSection` → `RoomCard`); floors and the groups on room
   and lens screens are *sections*; what's in them are *controls*.
2. ✅ **Routes**: `#/` Home, `#/lens/<id>`, `#/room/<area>`. A room's back button returns to where you came from.
3. ✅ **Tabs**: Home, then the lenses, in a band under the header (a bar at the bottom on a phone). In edit mode
   you pick which lenses are tabs and their order; stored as `tabs` in the home layout.
4. ✅ **Status chips** in the same band, only when there's something to say; each opens its lens.
5. ✅ **Lenses**: Lights, Climate, Security, Devices: floor headings, a section per room, packed like a room screen
   ([LAYOUTS.md](LAYOUTS.md#lens-screens)).
6. ✅ **Check on the Fire HD** (2026-10-02): the chips make the home screen subscribe to more entities
   (65 on our home: all lights, climate, safety sensors, and one entity per device).
   - Live updates: 38 of 106 were over 16 ms (worst 51 ms), because a new subscription re-sends every state
     and the store treated each as new, and any change recomputed every chip. The store now keeps a state it
     already has, and each chip is its own component. Afterwards, over two hours idle on Home, 6% of the
     five-second reports had an update over 16 ms, typically 2.5 ms per update (the first short check had
     shown 0 of 118).
   - Screen changes: building a screen takes about 10 ms of script; the rest is the tablet laying out and
     painting it. Home took about 135 ms, lenses 120–160 ms. Removing the fade-in made no measurable difference
     (it stays removed).
   - ✗ Tried and reverted: `content-visibility: auto` on floors and sections below the screen. On the Fire HD
     (Chrome 108) idle Home went from 0.3 to 3.3 slow frames per 5 s, and 7 of 71 updates went over 16 ms (0
     of 302 without it). Chrome also draws everything within about 1.5 screens anyway, so on a landscape
     tablet it would skip little.
   - ✅ **Screens kept built**: Home and the lenses that are tabs stay built once visited, stacked in one grid
     cell, each on its own layer (`will-change: opacity`); a hidden one is transparent and has no height, so
     showing it changes only opacity and the tablet shows what it already painted. Rooms, and lenses that
     aren't tabs, are built on every visit. On the Fire HD, going back to a kept screen took about 50 ms
     (24 changes, worst 83 ms); rooms and first visits about 60 ms (14 changes, worst 213 ms, a first visit).
     The page still scrolls as before, so dragging and the sticky edit bar are unchanged; memory stayed at
     22–25 MB.
   - The cost: hidden screens stay up to date, so an update does more. With every tab kept, half the
     five-second reports first had an update over 16 ms, typically 10 ms. Two causes, found on a laptop with
     a snapshot of our home: the Devices lens rebuilt its whole view on every battery or availability update
     (it orders by them), and every kept screen's band recomputed every chip. A lens now keeps its view while
     the rooms and items are the same, and each chip is computed once for all bands. After that, 14% of the
     reports idle on Home had an update over 16 ms (mostly 18–24 ms), typically 4.6 ms per update. Accepted:
     screen changes felt fast on the tablet.

### 5. Room screens ✅
1. ✅ **Room template** ([LAYOUTS.md](LAYOUTS.md#room-screens)), decided 2026-10-02: sections Scenes, Lights,
   Climate, Switches, Media, Sensors (sensors stay one section for now; splitting them into Air and Safety, and
   a Tech section of batteries and offline devices, was proposed and put off). In the room's edit mode, a
   section is dragged by its title into any column, where it stays (stored per width, like cards on Home),
   renamed by tapping its title, widened to 2 or more columns or the full width by a grip on its right side, and
   hidden with an eye, for **all rooms** (the template) or **only this room** (its own copy). Tapping a tile
   hides it on that room's screen only; lenses and the room card still show it. Pins (adding entities the room
   screen leaves out) are left to Phase 7. Arrows in the titles came first and were replaced by dragging the
   same day: moving a section across the room took many taps. Dragging first changed only the sections' order,
   packed into the shortest columns like lenses; sections then landed where the packer put them and the rest
   reshuffled (with the tallest section first, nothing could go under it), so they got places of their own:
   placed in order, each below what's above it in the columns it spans.

The phase was cut short on 2026-10-04 to put Home first: device sheets moved to Phase 6, swiping between rooms to
[Later](#later).

### 6. Home: run the house from one screen
The screen the app opens on should be enough for everyday use; opening a room is the exception
([Home: the starting point](#home-the-starting-point)). Customised the way the room template is: for every card,
or for one room only.

1. **Hide and merge rooms**: a hidden room has no card (its room screen stays reachable from lenses); merged
   areas show as one card and one room screen, without changing HA's areas.
2. **Card template and per-room cards**: what every card shows, as kinds of control in order (the default stays
   lights, then climate, then heating), and a room's own list in its place.
3. **Quick-controls editor**: in edit mode, tapping a card opens a sheet with the room's devices, suggested ones
   first; switch each on or off for the card, drag them into order, pick a control's form where there is a choice
   (a 1 × 1 button or a 2 × 1 control), for every card or this room only. "+N" stays for what doesn't fit.
4. **Device sheets**, opened by a long press on any control (Home, rooms, lenses): brightness and colour for
   lights, HVAC modes for air conditioners (heat / cool / dry / fan; today a tile only switches on and off, into
   the last mode), a short history. A tap still toggles.
5. **More kinds of control on a card**: the room's lights on/off, scenes, climate with − / + for the target
   temperature, blinds (open / stop / close), media (play / pause), locks.
6. **The card's title**: which readings it shows and from which sensor (temperature, humidity, CO₂), and alert
   badges (window open, motion, leak); for every card or one.
7. **A house-wide section on Home**: house scenes, all lights off, weather. Fixed contents for now; the full
   builder is Phase 7.
8. **Check on the Fire HD**, with the room template from Phase 5: richer cards subscribe Home, which stays built,
   to more entities. Updates and screen changes against the budgets and against today's numbers.

### 7. Custom views
Per HA user, built from [free sections](#free-sections): any devices in any section, from any room, each section
named, sized and placed on its own, sections added and removed. Start from a template (Blank, Copy of Home, One
floor, One room, a lens); add sections and cards with **+ Add**, which suggests what's in a room first, then any
entity; cards bound to selectors or pinned entities. Extra sections on Home that aren't floors, built
like any free section (Phase 6 brings one fixed house-wide section). Custom views can be tabs like lenses.

### 8. Organiser
Suggests and bulk-applies names, areas and labels from Zigbee2MQTT friendly names (configurable pattern, default
`<area>/<what>`). Shows a dry-run diff and applies only after confirmation; needs an admin login.

### 9. History and packaging
Version history with undo for layouts. A static build in a small container image (nginx), plus a Home Assistant
add-on for HA OS users.

### Later
- Wall panels: a start view per screen, back to it after a few idle minutes; swipe between rooms, with a strip
  of room names at the top.
- A layout shared by the whole house (HA's system data, saving needs an admin), with per-user layouts on top.
- The Energy lens.
- Free card sizes (drag a corner) instead of fixed ones.
- Importers from Lovelace and ha-fusion, e-ink output.
- A calmer edit mode on Home: every card shows only a faint outline, its name and plain tiles; tapping one selects it,
  and only the selected card shows its size chip, the × on its tiles and a single "+". Today every card shows all of
  them at once, which is busy, and the chip covers part of an XS room's name. Agreed 2026-10-06 to do later, with a
  design pass.
- A sidebar on landscape screens, like hass-config's: the clock, date, greeting, a "what's on" sentence and the
  weather, in place of the header. On the Fire HD (8 columns) it would either drop Home to 4 columns or shrink the
  cells by about 20% to keep 8; for now the header and status chips say the same (decided 2026-10-06).
