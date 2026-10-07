# Layout rules

How Doma divides the screen and sizes everything on it. The short version: **one square cell is the unit for
everything**, elements are sized in whole cells, sections are 4 cells wide, and a small packer arranges sections
in columns like a masonry layout. On the home screen, room cards come in a few fixed sizes and sit on one cell
grid, in rows you make. Lens screens pack sections like room screens, and Home and the lenses share a
navigation band. Nothing is sized in pixels except a few readability minimums.

## Goals

- **One layout for every screen.** The same layout works on a 10″ tablet in either orientation, a phone and a
  24″ panel. Rotating the device reflows it. Nothing is stored per device; card positions on the home screen are
  stored per column count (see "Layout model"), and a width without its own arrangement follows the nearest one.
- **Proportional, not pixel-based.** A tile looks the same on a small and a large screen, just bigger.
- **Cheap on weak hardware.** Positions come from arithmetic, not from measuring the DOM. The browser only does
  plain grid and flex layout. See the budgets in [ROADMAP.md](ROADMAP.md).

## The cell

The screen is a grid of **square cells**. The gap between cells and the padding around the page are fractions of
the cell, so everything scales together.

| Symbol | Meaning | Value |
|---|---|---|
| `W` | available width in CSS px | from the viewport |
| `cols` | number of columns | multiple of 4, at least 4 |
| `c` | cell size | computed |
| `g` | gap between cells | `0.1 × c` |
| `p` | page padding, left and right | `0.25 × c` |

**Columns.** Aim for cells of about 100 CSS px and keep the count a multiple of 4, so 4-cell sections fit exactly:

```
cols = max(4, 4 × floor(W / 400))
```

`W` is the width beside the **sidebar**: on a screen 1100 px wide or more there's one, 300 px wide, at the left
(see "Navigation band and sidebar"), and `W` is the rest.

**Cell size.** Fill the width exactly:

```
W = 2p + cols × c + (cols − 1) × g
c = W / (cols + (cols − 1) × 0.1 + 2 × 0.25)
```

Examples:

| Screen | Width | `W` | `cols` | `c` | Sections side by side |
|---|---|---|---|---|---|
| Phone | 390 | 390 | 4 | 81 px | 1 |
| Tablet portrait | 800 | 800 | 8 | 87 px | 2 |
| Tablet landscape (Fire HD 10), with the sidebar | 1280 | 980 | 8 | 106 px | 2 |
| Laptop, with the sidebar | 1440 | 1140 | 8 | 124 px | 2 |
| 24″ panel, with the sidebar | 1920 | 1620 | 16 | 90 px | 4 |

(Until 2026-10-07 there was no sidebar, and the Fire HD in landscape had 12 columns of 94 px.)

Rows are the same size as columns: an element 1 cell tall is `c` high. The page scrolls vertically when the
content is taller than the screen. (Shrinking cells so that a wall panel fits without scrolling is a possible
later option, not a rule today.)

**Where it's computed.** `layout/grid.svelte.ts` computes `cols` and `c` from the viewport at start and on
`resize` / orientation change, and sets them on `:root` as `--cols`, `--cell`, `--gap` and `--pad`, with
`--sidebar` (its width, or 0). Nothing else
reads the viewport size. `W` is `clientWidth`, and `scrollbar-gutter: stable` keeps it from changing when the page
starts to scroll.

## Sizing inside elements

Everything inside an element derives from `--cell`, never from fixed pixels. The mechanism is simple:
**`1rem` is tied to the cell**, `html { font-size: max(12px, 0.16 × cell) }` (about 15 px at 94 px cells, 12 px
at least), and every size in `styles/tokens.css` and `app.css` is in `rem`: text, icons, round buttons, padding,
corner radius. So components never compute sizes themselves, and the whole UI scales with the cell.

- The clock also scales with the column count, so the header fits a phone: `clamp(3.5rem, cols × 0.5rem, 6rem)`.
- Tile names may wrap to two lines: a 2 × 1 tile is narrow.

## Element sizes

Every element has a size in cells, `w × h`. Starting set:

| Element | Size |
|---|---|
| Toggle tile (light, switch, fan) | 2 × 1 |
| Sensor tile | 2 × 1 |
| Device tile (Devices lens) | 2 × 1 |
| Media tile | 2 × 1 |
| Scene tile | 2 × 1 |
| Climate tile | 4 × 2 |
| Tile on a room card (any control, and "+N") | 2 wide, a row of the card (¾ of a cell) tall |
| Room card | 2, 4, 6 or a whole row wide; half a cell of title plus up to three rows of tiles (see "Room cards") |
| Header (clock, date, weather) | full width × 1.5 |
| Navigation band (tabs, status chips) | full width, one or two rows of chips |

An element is never wider than its section (4 cells, or more on a room screen), or than its card's width on the
home screen.

## Sections

A **section** is a titled group: "Lights" / "Climate" / … on a room screen. Room cards on the home screen are
packed the same way, but have a fixed size (see "Room cards").

- A section is **4 cells wide**; on a room screen it can be 2 or more section columns wide (8, 12, … cells), and
  its grid is as wide.
- Its title band is **0.5 cell** tall.
- Its content is a CSS grid as many columns wide with rows of `--cell`, gap `--gap` and `grid-auto-flow: row dense`, so the
  browser packs tiles without holes.
- **A section's height is known before rendering**: `0.5 + rows + (rows − 1) × 0.1` cells (title band, rows,
  gaps between rows), where `rows` comes from simulating the same dense packing of the element sizes on as many
  columns (`denseRows` in `layout/pack.ts`).

**Full-width bands** sit above the sections and span all columns: the home header (clock, date, weather) is
a cell and a half; the navigation band under it (see "Navigation band and sidebar") is as tall as a chip, or two chips when tabs and
status chips don't fit side by side; the room and lens headers are 1 row; and each floor heading on a lens half a
cell. Home's room cards fill one grid (see "Room cards").

## Navigation band and sidebar

On a screen **1100 px wide or more** (the Fire HD in landscape, a laptop) a **sidebar** 300 px wide sits at the
left of every screen (`ui/Sidebar.svelte`), in place of the home header and the band: the clock, the date, a
greeting, the weather, **what's on** (the status chips, one under another, each opening its lens; nothing when all
is calm), then the **tabs** as a list (Home, then the user's lenses, in their order), and at the bottom the edit
button (on Home) and settings, which open upwards. It's fixed, on its own layer, and stays built while the screens
change; while a screen is being edited it doesn't react, and its tabs follow Home's draft. Messages and Home's
edit bar are centred on the screen beside it. On the Fire HD it leaves 8 columns of about 106 px: tiles as big as
before, a little bigger even, for 4 fewer columns. (It replaced the header and band on wide screens on 2026-10-07,
after the calm-cards design; the band had been chosen over a side rail to keep 12 columns.)

Narrower screens (a tablet in portrait, phones) keep the header and the band. Home and the lens screens start
with the same band (`ui/NavBand.svelte`): the **tabs** on the left and the **status chips** on the right, which
only appear when they have something to say. Both are rows of chips the size of the smallest tap target, and wrap
onto a second row when they don't fit side by side (a portrait tablet).

On a phone (4 columns) the tabs leave the band for a **dock**, a bar fixed to the bottom of the screen with an
icon over each name, on its own layer so scrolling doesn't repaint it; the screen gets bottom padding to match.
Room screens have no tabs: they're one level down, with a back button.

## Room cards (home screen)

Each room is a card in one of **four sizes**, and a size is only a **width**. Every card shows up to three rows of
slim tiles, two cells wide each, and is only as tall as its tiles need (in edit mode, a tile more where there's
room, to add one), so a room with two lights takes one row on an M card; what doesn't fit in three rows goes into
"+N":

| Size | Width, in cells | Tiles, at most |
|---|---|---|
| S | 2 | 3 |
| **M** (default) | 4 | 6 |
| L | 6 | 9 |
| Full | the whole row | 3 rows of it |

On the Fire HD (8 columns, in landscape beside the sidebar and in portrait) a row holds four S rooms, two M, an L
and an S, or an M and two S. On 12 columns, six S, three M, two L, or an S, an M and an L. A Full room with fewer tiles than fit in one row is a one-liner.
In the layout they're stored under their earlier names, `xs`, `m`, `wide` and `full`: until 2026-10-07 they were
XS, M, Wide (8 cells) and Full, so a Wide room is now L. (Before 2026-10-06, `s` and `l` were a one-row and a
three-row M; in rows they only left space under their neighbours, and they read as M.)

A card has **no box of its own**: a title band half a cell tall, then its rows of tiles, each three quarters of a
cell and its gap (`0.75 × (c + g)`, so a tile is about 0.73 of a cell tall: 77 px on the Fire HD), with the gap
that's left between the title and the tiles. The tiles are inset by a gap at each side, so two rooms side by side
are three gaps apart and the tiles within a room one. A card covers its cells and the gaps between them:
`w × c + (w − 1) × g` wide; heights come in quarter cells. A card is never wider than the screen: on a 4-column
phone an L card is 4 cells wide (and shows 2 tiles per row). Tiles are a step lighter than the page
(`--card-control`).

The title band shows the room's name, temperature and humidity, small enough to fit an S card (2 cells wide;
a long name is cut short first), and an arrow; tapping it opens the room. Below the band, the room's controls. Until a card
is edited they're generated:

- every control is a **slim tile** (`ui/Tile.svelte`), like Apple Home's: the round chip at the left, then the
  name and state on two lines, and a thermostat's target at the right while it runs. It's split in two: the chip
  does the main thing (switch on or off; a climate device's power), the rest of the tile opens its **pop-up**.
  While on, only the chip takes a colour (warm for lights, orange for heating, blue for cooling, teal for fans,
  blue-grey for other devices) and the name brightens; the tile keeps its colour;
- a **dimmable light's tile fills** from the left to its brightness (a layer scaled with a transform, under the
  text), and **dragging across it dims** the light (`ui/dim.svelte.ts`): the drag starts once the finger has moved
  8 px sideways and moves the brightness from where it was by how far it went across the tile; a move up or down
  first is left to scrolling (`touch-action: pan-y`), and a tap still opens the pop-up. The new brightness goes to
  HA when the finger lifts (0 switches the light off); until HA reports it, or for 8 s, the tile shows what was
  asked for. Room screens and lenses dim their light tiles the same way;
- a climate device says its mode while it runs, with the target at the right; off, it says "Off" and its own
  reading. − and + are in its pop-up. (A tile as wide as the card with − and + was tried on 2026-10-07 and
  dropped: a whole row for one device, empty while it's off.)
- the generated controls: lights, then climate devices, then heating switches (underfloor heating, a radiator: a
  switch whose ID says so);
- **as many rows as the size has**. What doesn't fit is replaced by a "+N" tile ("3 more") that opens the room.
  When something has to go, climate and heating are kept before lights; the order on screen stays lights first.
- A room without lights, climate or heating keeps an empty card.

A card can have **its own list** instead (edit mode, below), in the order you set: lights and switches, climate
devices, scenes (a tap anywhere on the tile runs one) and **all lights**, one tile for all the
room's lights (lit while any is on, showing how many; its chip turns them all off, or all on; the rest opens all
of them in one pop-up). What doesn't fit goes into "+N" from the end. A control the room no longer has is skipped.

**Pop-ups** (`ui/SheetHost.svelte`, opened through `ui/sheet.svelte.ts`) share one frame: a header with the same
chip as the tile (it does the same thing), the name, the room and state, and a close button; the controls; and
"Open <room>" at the bottom. A light has a brightness bar to tap or drag (sent when the finger lifts) and warm /
neutral / cool where it has colour temperature; a climate device has its target with − and +, the room's
temperature, its modes (off among them) and fan speeds; anything else one big switch. Each says since when it's
on or off. A tap on the dimmed backdrop (no blur), Escape or a change of screen closes it; on a phone it comes
up from the bottom.

**Feedback.** A command that always changes a state (switching, a mode, a scene) is followed until HA reports the
change (`ui/pending.svelte.ts`): after 0.4 s without an answer, a thin arc turns around the icon; after 8 s, or if
HA refuses, a message at the bottom of the screen says so and offers "Try again". Running a scene first keeps the
states of what it changes (`scene.create` with `snapshot_entities`), then shows "<scene> is on · Undo" for 8 s;
Undo brings them back (`ui/scene.ts`). Room screens and lenses split their tiles the same way, in their own 2 × 1
size. In the demo, `?latency=1500` answers that late and `?fail` refuses everything.

In code: the sizes are `CARD_CELLS` and `roomCardItems` (given the card's size) in `model/roomCard.ts`, rendered by
`screens/RoomCard.svelte`.

### The floor grid

Home's cards fill one CSS grid as wide as the page, with no floor headings: `cols` columns of `--cell`, gap `--gap`, and rows of
**a quarter cell**, `(c − 3g) / 4`, so four rows and the gaps between them make one cell: a card's title band is
two of them, a row of its tiles three. A card spans `w` columns and `4h` rows, at an explicit position: `x` in
columns, `y` in rows of a quarter cell. (Until 2026-10-07 the rows were half a cell, for tiles a cell tall.)

Positions come from a small placement step (`layout/rows.ts`), pure arithmetic on the sizes, so nothing is
measured. **Cards go in rows that you make**, one under another: a row is a room on its own or a **stack** of
rooms side by side, each at its own size, and what a stack doesn't fill stays empty. Each row starts below the
tallest card of the row above, so the titles of the rooms in a row always line up. A **Full** room has its row to
itself. Like ha-fusion's horizontal stacks, except that there the sections of a stack share its width equally;
HA's sections view keeps rows for the same reasons ("Z-grid": masonry moved cards between columns over a pixel and
lost people's memory of where things are).

The rows are the same on every screen width. A stack wider than the screen **wraps inside itself**: its cards
continue on a line below, in order, and the next row still starts below the whole stack. So a stack of three M
rooms is one line on 12 columns, two and one on the Fire HD (8, in landscape beside the sidebar or in portrait)
and three lines on a phone (4).
(Other ways were weighed on 2026-10-07: rows kept per screen width, stacks coming apart on narrow screens as in
ha-fusion, cards shrinking to fit, stacks scrolling sideways. Wrapping is the one being tried first.)

A home that never set its rows starts with **one row per floor**, holding that floor's rooms (a row too wide for the
screen wraps); from there, the rows are what you make of them. Rooms the rows don't list (a new room in HA) get a
row per floor after the rest. There are no floor headings: until 2026-10-07 Home could group its cards by floor,
under a heading each, but rows you arrange yourself do that job better.

(Until 2026-10-06 cards were placed freely and floated up, a masonry; titles of rooms in different columns
ended up at different heights. Until 2026-10-07 rows filled themselves in an order, so space couldn't be left
empty. A stored arrangement or order from then still fills the rows until they're set.)

A card is as tall as its tiles (see "Room cards"); its width comes from its size. In edit mode the rows are half
a cell apart, for the bands a card is dropped on to get a row of its own (see "Edit mode").


## Packing sections

Lens screens pack their sections into columns, and so do room screens until you arrange them (see "Room
screens"; the home screen uses floor grids instead, above).
The page has `cols / 4` section columns: 1 on a phone, 2 in portrait, 3 in landscape. Sections are assigned to
columns by a deterministic packer:

```
heights = [0, 0, …]                  // one per section column, in cells
for section in sections (in layout order):
    k = index of the lowest height   // ties: the leftmost column
    assign section to column k
    heights[k] += section.height + 0.1   // 0.1 = the gap, in cells
```

Each section is then placed at its column and top (`position: absolute` in one container, whose height is the
tallest column), so the browser only positions blocks, and a section that moves to another column keeps its
element: dragging one on a room screen relies on that. In code: `packSections` in `layout/pack.ts`, rendered by
`layout/SectionColumns.svelte`; a section is
`layout/Section.svelte`, and each element sits in a `layout/GridItem.svelte` that spans its cells. The packer runs at
start, on rotation or resize (when `cols` changes) and when the layout changes, never on state updates.

Properties:

- **Order is kept** in reading order: sections go left to right, then fill the shortest column. Rotating doesn't
  shuffle rooms beyond moving them between columns.
- **No measuring**: heights are known from the sizes, so there is no layout thrash and no flicker on load.
- **Same result everywhere**: the same layout and width always give the same arrangement.

## Room screens

A room screen (`screens/RoomScreen.svelte`) starts with a 1-row header (back, the room's name, temperature and
humidity, and the edit button), then the room's **sections** packed into columns: **Scenes** (tap to activate),
**Lights** (with All on / All off for the lights shown), **Climate**, **Switches**, **Media** and **Sensors**.
A section the room has nothing for is left out.

Which sections show, where, how wide and under what name comes from the **room template**
(`layout/roomTemplate.ts`), which every room follows unless it has **its own** arrangement:

- **Places**, for each number of section columns (1 on a phone, 2 on a portrait tablet, 3 in landscape, 4 on a
  large screen): the sections in order, each with its column. They're placed in that order, each right below
  the lowest section placed before it in any of the columns it spans (`placeSections` in `layout/pack.ts`), so a
  section stays in the column you put it in, and a wide one under columns of different heights leaves a gap under
  the shorter one. (Packing them by order alone, as lenses do, was tried first: a section could only go where the
  packer put it, and moving one reshuffled the rest. In a room whose first section was the tallest, nothing could
  ever go under it.)
- **Widths**, in section columns: 1 by default, the same on every screen width, shrunk to fit a narrower screen.
  "Full" spans the whole screen at any width. A wider section lays its tiles out in a wider grid, so a full-width
  Lights section shows its lights in one long row.
- **Names**: a section can be renamed; the name isn't translated. Unnamed sections use the default name in the
  screen's language.
- **Hidden** sections.

A width that hasn't been arranged takes the **reading order** (by top, then left to right) of the nearest width
that has (the smaller on a tie), or the default order, and packs it where each section goes highest
(`packSections`). So a phone shows the sections in the order you read them on the tablet. A room shows only the
sections it has: its columns are shorter, and a column left empty closes up outside edit mode (the columns after
it move left). A section that isn't stored (one a later version adds) goes after the section that precedes it by
default.

Each room can also hide entities from its screen; they stay on the room's card on Home and in the lenses. A
section whose entities are all hidden is left out too.

**Edit mode** (the edit button in the room's header) works like Home's: a draft, saved on Done.

- **Drag a section by its title band** (the title, then a drag handle; only the band has `touch-action: none`, so
  swiping over the tiles still scrolls). A drag starts once the finger has moved 8 px; a tap renames instead. Its
  column is the one nearest to where it is; its place in the order is the one that puts its top nearest to
  where it is. Only the sections in the columns it spans move, each step starting from where they were when the
  drag began, and a faint outline shows where it will land. An empty column shows as an outline to drop into.
  The first change on a width stores the places of every section on that width, including the ones this room
  doesn't have (they keep their spots among the others), so every room following the template gets it. With a
  keyboard, the arrow keys on a focused title move it up, down, or to the next column.
- **Tap a title to rename** its section (or press Enter on it): a field takes its place; Enter or leaving it
  saves, Escape cancels, and an empty name brings back the default.
- **Drag the grip** low on a section's right side to widen or narrow it: the width snaps to whole section
  columns, up to the screen's right edge (to make a section in the last column wider, move it left first).
  Reaching the screen's width stores "full". Shift with the left or right arrow does the same from a keyboard.
  There's no grip on a phone, where every section is the full width anyway.
- The **eye** at the end of the band hides or shows the section; a hidden section shows as its title alone,
  struck through.
- **Tapping a tile** hides it on this room's screen, or shows it again: hidden tiles stay in place, dimmed, with a
  crossed-out eye.
- The bar has **All rooms / Only this room**: whether this room follows the template (its changes then apply to
  every room that does) or has its own sections. Switching to "Only this room" starts from a copy of the
  template; switching back drops the room's own arrangement. **Reset to default** puts the sections being edited
  back in the default order, one column wide, with their default names and nothing hidden, and shows the room's
  hidden tiles again.
- Leaving the room while editing (the browser's back button) discards the draft, like Cancel.

## Lens screens

A lens shows one function across the house (`screens/LensScreen.svelte`, `model/lenses.ts`): the navigation
band, a 1-row header (the lens's name, what's going on, and an action such as "All lights off"), then each floor
as a heading over its rooms' **sections**, packed into columns like a room screen. A section's title is the
room's name and opens the room; rooms with nothing for the lens are left out. Tiles keep their room-screen sizes
(toggle and sensor 2 × 1, climate 4 × 2, device 2 × 1).

## Rotation and resizing

When `cols` changes, the packer runs again and the sections move to their new columns, and each floor grid
re-flows its cards into the new number of columns. A change of `c` alone (same `cols`) only rescales through the
CSS variables. A short opacity fade may cover the switch; no layout
animations.

## Browser constraints

These rules target Chrome 108 (see the README):

- **Use**: CSS grid, flexbox, custom properties, `calc()`, `max()` / `clamp()`, container queries.
- **Don't use**: `subgrid` (Chrome 117), CSS masonry (not shipped anywhere), JavaScript that measures elements to
  place them.
- Animate only `transform` and `opacity`.

## Layout model

The layout stores **only the user's changes** on top of the layout generated from HA's floors and areas, never a
full copy, so new rooms still appear by themselves. It holds **card sizes**, Home's **rows of cards**, the **tabs** and the **room template**. Rooms, areas and floors themselves are HA's and
aren't changed here.
(`layout/homeLayout.ts`)

```json
{
  "version": 1,
  "sizes": { "kitchen": "wide", "hallway": "xs" },
  "rows": [["living_room"], ["kitchen", "hallway", "bathroom"], ["bedroom", "office"]],
  "hidden": ["garage"],
  "cards": { "kitchen": ["lights", "climate.kitchen", "scene.kitchen_dinner"] },
  "tabs": ["lights", "devices", "climate"],
  "room": {
    "places": {
      "3": [{ "id": "lights", "x": 0 }, { "id": "scenes", "x": 0 }, { "id": "climate", "x": 1 },
            { "id": "switches", "x": 2 }, { "id": "media", "x": 2 }, { "id": "sensors", "x": 1 }]
    },
    "widths": { "lights": "full", "climate": 2 },
    "names": { "scenes": "Moods" },
    "hidden": ["sensors"],
    "rooms": {
      "kitchen": { "own": { "places": { "2": [{ "id": "lights", "x": 0 }, { "id": "scenes", "x": 1 }] } } },
      "hallway": { "hide": ["sensor.hallway_illuminance"] }
    }
  }
}
```

- **`sizes`**: each card's size, `xs`, `s`, `m`, `l`, `wide` or `full` (the whole row); unlisted rooms are `m`.
  The same on every screen.
- **`rows`**: Home's rows, in order, each a list of area IDs: one room, or a stack. Rooms it doesn't list get a
  row per floor after the rest (the area's floor in HA), so a home that never set its rows starts with one row per
  floor. The same on every screen width.
- **`order`**: the order of the cards from when rows filled themselves (until 2026-10-07), and **`grids.<cols>`**:
  card positions from when cards were placed freely; only read, to order each floor's first row.
- **`floors`** and **`flatRows`**: from when Home could group its cards by floor (until 2026-10-07; `floors: false`
  meant it didn't, with its rows in `flatRows`). Only read, for the rows that were on screen; the next save keeps
  them as `rows`.
- **`hidden`**: the rooms hidden from Home, by area ID.
- **`roomNames`**: names given to rooms in Doma, by area ID (at most 40 characters), shown everywhere in place of
  HA's area name: cards, room screens, lenses, pop-ups, chips and messages. HA's areas aren't renamed, so no admin
  login is needed, and HA's area name still takes the room off entity names ("Kitchen Spots" shows as "Spots").
- **`cards`**: a card's own list of controls, by area ID: entity IDs, or `lights` for the all-lights button.
  Unlisted rooms show the generated controls. Like `hide`, it names entity IDs, since it picks single devices.
- **`tabs`**: the tabs after Home, in order: `lights`, `climate`, `security`, `devices`. Unset means all four in
  that order; `[]` means Home alone. Home is always the first tab. A lens that isn't a tab is still reached from
  its status chip.
- **`room`**: the room template (see "Room screens"); each field is left out while it's the default.
  `places.<n>` is the sections in order on a screen `n` section columns wide, each with its column `x` (from 0,
  the left one if it's wider); `widths` are in section columns, or `"full"`; `names` are the names given to
  sections; `hidden` the hidden sections. Section IDs are `scenes`, `lights`, `climate`, `switches`, `media` and
  `sensors`. Under `rooms`, by area ID: `own`, a room's own sections in the same shape, and `hide`, the entities
  hidden from its screen. (The first arrangements were stored as `columns.<n>`, the section IDs in each column;
  they're read as places.) `hide` is
  the one place a layout names entity IDs, since it's about one particular device; a renamed entity simply shows
  again.

Rooms are referenced by area ID, which stays the same when a room is renamed; a stale one is simply ignored. The
stored value is read defensively: unknown fields and sizes are dropped, and a version this app doesn't know gives
the generated layout. (`homeView` in `model/homeView.ts` applies the layout to the model.)

### Storage

The layout belongs to the **HA user** the screen is logged in as, and lives in Home Assistant's per-user frontend
storage under the key `doma.layout` (`frontend/subscribe_user_data` / `set_user_data`; a layout saved under the
old name `ha-ui.layout` is copied over once). Any logged-in user can
save their own, so a non-admin kiosk account arranges its own screen; it survives a cleared browser, and every
screen logged in as the same user follows a change at once. If two screens save at the same time, the last save
wins. At start the app waits briefly (up to 2 s) for the layout, so the home screen doesn't rearrange itself
right after appearing. (`layout/layoutStore.svelte.ts`)

### Edit mode

The **edit button** next to the settings gear turns the home screen into an editor; nothing is saved until **Done**.

- Controls on the cards don't react (`inert`), and the cards look as they do on Home. **Tap a room to select it**:
  it gets an outline, its controls become slots to edit (below) with one "+", and the **bar at the bottom** of the
  screen (`ui/EditDock.svelte`) shows its **name** (tap it to rename the room: see `roomNames` below; emptied, it
  goes back to HA's), its **size** (S, M, L, Full), **Own row** (in a stack: it leaves
  the stack for a row of its own, where it was, at its size), **Hide** and × to put it down. With nothing
  selected, the bar says what a tap does. The bar is always in the same place, whichever room is selected, with
  targets big enough for a wall tablet; nothing of the editor covers a card's name, even an S room's. A tap
  outside the rooms or Escape puts the room down. The default size isn't stored. (Until 2026-10-07 every card
  showed all its tools at once, with its size chip and menu in the title band: busy, and on a small card the chip
  covered the name. Of three designs, a bar at the bottom was picked over the tools on the selected card and over
  a plan of the rows with a pop-up per card.)
- Every card's **title band is the drag handle** (a grip shows it on the selected card, 4 cells wide or more). A
  drag starts once the pointer has moved a little, so a tap still selects.
- **Drag a card** to another place: by its title band on touch (only the band has `touch-action:
  none`, so swiping anywhere else on a card still scrolls the page), from anywhere on the card with a mouse. Only
  the dragged card moves, with `transform`, and what happens depends on what its middle is over (`dropCard`):
  - **another card**: it goes next to it, into that card's row (before it when coming from below, else after it),
    and the rows re-flow at once; in its own row it takes that card's place. A Full card shares its row with no
    other, so dropping on one, or dragging a Full card onto a stack, makes a new row before or after;
  - **the free space at the end of a row**: it goes last in that row;
  - **"+ New row"**, a band before, between or after the rows (half a cell tall, a dashed outline that shows
    while dragging and fills in under the card): letting go there gives it a row of its own. Only on letting go,
    since a card on its way to another crosses bands, and each would re-flow everything under the finger.

  A faint outline shows where it will land; a row it leaves empty goes. Near the top or bottom edge the page
  scrolls by itself. Each row has a faint dashed frame in edit mode, its empty end too, so a stack reads as one
  and the free space to drop into is seen. (The band was first a thin line, shown only while dragging; on the
  tablet it wasn't clear that it was the way to a new row.)
- **The card's controls** are slots in edit mode, laid out as they'll be shown: drag one to move it (it takes the
  place of the control under its middle), tap it to swap it for another, × (in its top right corner) removes it;
  the first free place shows a "+", a tile wide (the selected card grows a row for it if its rows are full). "+" and "+N" open a menu of what the room has (all lights, its lights, climate, switches, scenes), ticked when
  it's on the card, with **Back to automatic** once the card has its own list. The first change gives the card
  its own list, starting from what it showed.
- **Hide a room** from the bar: its row closes up; shown again, it comes back in its row. **Hidden rooms** in the bar lists them; tap one to show its card again. A hidden room's screen is
  still reached from the lenses, and its devices still count in the status chips.
- A new size keeps the card in its row, which wraps if it no longer fits; **Full** takes it out of its stack into a
  row of its own, where it was (the cards before and after it stay in rows of their own).
- A bar replaces the header and sticks to the top (on a tablet without its hint, the title cut short, so the buttons
  stay on one row): **Hidden rooms** (once a room is hidden), **Tabs** (a menu: tick the lenses to show as tabs, order them
  with arrows; the navigation band shows the draft), **Done** (saves, if anything changed), **Cancel** (discards)
  and **Reset to default** (the generated home screen with every lens as a tab, saved on Done; the room template
  stays). A failed save keeps the draft and says why.
- One screen is edited at a time: the draft is shown only by that screen, so Home, kept built behind a room
  that's being edited, keeps showing the stored layout.
- In code: the draft in `layout/layoutEditor.svelte.ts`, dragging in `layout/drag.ts` (shared with room sections), the bar in
  `ui/EditBar.svelte` with `ui/TabsMenu.svelte`, the overlay over each card in `ui/CardEditor.svelte`. The overlay sits in the card's grid
  cell rather than inside the card, so the size menu isn't clipped by the card's `contain`.
