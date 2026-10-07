# Layout rules

How Doma divides the screen and sizes everything on it. The short version: **one square cell is the unit for
everything**, elements are sized in whole cells, sections are 4 cells wide, and a small packer arranges sections
in columns like a masonry layout. On the home screen, room cards come in a few fixed sizes and sit on one cell
grid per floor, where you place them. Lens screens pack sections like room screens, and Home and the lenses share a
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

**Cell size.** Fill the width exactly:

```
W = 2p + cols × c + (cols − 1) × g
c = W / (cols + (cols − 1) × 0.1 + 2 × 0.25)
```

Examples:

| Screen | `W` | `cols` | `c` | Sections side by side |
|---|---|---|---|---|
| Phone | 390 | 4 | 81 px | 1 |
| Tablet portrait | 800 | 8 | 87 px | 2 |
| Tablet landscape (Fire HD 10) | 1280 | 12 | 94 px | 3 |
| Laptop | 1440 | 12 | 106 px | 3 |
| 24″ panel | 1920 | 16 | 107 px | 4 |

Rows are the same size as columns: an element 1 cell tall is `c` high. The page scrolls vertically when the
content is taller than the screen. (Shrinking cells so that a wall panel fits without scrolling is a possible
later option, not a rule today.)

**Where it's computed.** `layout/grid.svelte.ts` computes `cols` and `c` from the viewport at start and on
`resize` / orientation change, and sets them on `:root` as `--cols`, `--cell`, `--gap` and `--pad`. Nothing else
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
| Light button (room card) | 1 × 1 |
| Compact climate (room card) | 2 × 1 |
| "+N" button (room card) | 1 × 1 |
| Room card | 2, 4, 6 or a whole row wide; half a cell of title plus up to two rows of tiles (see "Room cards") |
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
a cell and a half; the navigation band under it (see "Navigation band") is as tall as a chip, or two chips when tabs and
status chips don't fit side by side; the room and lens headers are 1 row; and each floor heading half a cell.
Each floor's room cards fill their own grid under its heading (see "Room cards").

## Navigation band

Home and the lens screens start with the same band (`ui/NavBand.svelte`): the **tabs** on the left (Home, then
the user's lenses, in their order) and the **status chips** on the right, which only appear when they have
something to say. Both are rows of chips the size of the smallest tap target, and wrap onto a second row when
they don't fit side by side (a portrait tablet). Not a side rail: a rail one cell wide would take a 1280 px
screen from 12 columns to 8.

On a phone (4 columns) the tabs leave the band for a **dock**, a bar fixed to the bottom of the screen with an
icon over each name, on its own layer so scrolling doesn't repaint it; the screen gets bottom padding to match.
Room screens have no tabs: they're one level down, with a back button.

## Room cards (home screen)

Each room is a card in one of **four sizes**, and a size is only a **width**. Every card shows up to two rows of
tiles, and is only as tall as its tiles need (in edit mode, one row more where there's room, to add one), so a room
with three lights takes one row whatever its size; what doesn't fit in two rows goes into "+N":

| Size | Width, in cells | Tiles, at most |
|---|---|---|
| S | 2 | 4 |
| **M** (default) | 4 | 8 |
| L | 6 | 12 |
| Full | the whole row | 2 rows of it |

On the Fire HD in landscape (12 columns) a stack holds six S rooms, three M, two L, or an S, an M and an L. In
portrait (8 columns) an L and an S fill a row. A Full room with fewer tiles than the row has columns is a one-liner.
In the layout they're stored under their earlier names, `xs`, `m`, `wide` and `full`: until 2026-10-07 they were
XS, M, Wide (8 cells) and Full, so a Wide room is now L. (Before 2026-10-06, `s` and `l` were a one-row and a
three-row M; in rows they only left space under their neighbours, and they read as M.)

A card has **no box of its own**: a title band half a cell tall, then its rows of tiles, each a cell tall, with the
gap that's left between the title and the tiles. The tiles are inset by a gap at each side, so two rooms side by
side are three gaps apart and the tiles within a room one. A card covers its cells and the gaps between them:
`w × c + (w − 1) × g` wide; heights come in half cells. A card is never wider than the screen: on a 4-column phone
an L card is 4 cells wide (and shows 4 tiles per row). Tiles are a step lighter than the page (`--card-control`).

The title band shows the room's name, temperature and humidity (on an S card, which is 2 cells wide, only the
name and temperature), and an arrow; tapping it opens the room. Below the band, the room's controls. Until a card
is edited they're generated:

- every control is a **1 × 1 tile** (`ui/Tile.svelte`), split in two: the round chip at the top left does the
  main thing (switch on or off; a climate device's power), the rest of the tile opens its **pop-up**. A ring at
  the top right shows a light's brightness or a thermostat's target; the name and state are at the bottom. While
  on, only the chip takes a colour (warm for lights, orange for heating, blue for cooling, teal for fans, blue-grey
  for other devices) and the name brightens; the tile keeps its colour;
- the generated controls: lights, then climate devices, then heating switches (underfloor heating, a radiator: a
  switch whose ID says so);
- **as many rows as the size has**. What doesn't fit is replaced by a 1 × 1 "+N" button that opens the room.
  When something has to go, climate and heating are kept before lights; the order on screen stays lights first.
- A room without lights, climate or heating keeps an empty card.

A card can have **its own list** instead (edit mode, below), in the order you set: lights and switches as 1 × 1
tiles, climate devices, scenes (a tap anywhere on the tile runs one) and **all lights**, one tile for all the
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
Undo brings them back (`ui/scene.ts`). The same tiles, split the same way, are used on room screens and lenses, in
their own 2 × 1 size. In the demo, `?latency=1500` answers that late and `?fail` refuses everything.

In code: the sizes are `CARD_CELLS` and `roomCardItems` (given the card's size) in `model/roomCard.ts`, rendered by
`screens/RoomCard.svelte`.

### The floor grid

Each floor's cards fill one CSS grid as wide as the page: `cols` columns of `--cell`, gap `--gap`, and rows of
**half a cell**, `(c − g) / 2`, so two rows and the gap between them make one cell. A card spans `w` columns and
`2h` rows, at an explicit position: `x` in columns, `y` in rows of half a cell.

Positions come from a small placement step (`layout/rows.ts`), pure arithmetic on the sizes, so nothing is
measured. **Cards go in rows that you make**, one under another: a row is a room on its own or a **stack** of
rooms side by side, each at its own size, and what a stack doesn't fill stays empty. Each row starts below the
tallest card of the row above, so the titles of the rooms in a row always line up. A **Full** room has its row to
itself. Like ha-fusion's horizontal stacks, except that there the sections of a stack share its width equally;
HA's sections view keeps rows for the same reasons ("Z-grid": masonry moved cards between columns over a pixel and
lost people's memory of where things are).

The rows are the same on every screen width. A stack wider than the screen **wraps inside itself**: its cards
continue on a line below, in order, and the next row still starts below the whole stack. So a stack of three M
rooms is one line on a landscape tablet (12 columns), two and one in portrait (8) and three lines on a phone (4).
(Other ways were weighed on 2026-10-07: rows kept per screen width, stacks coming apart on narrow screens as in
ha-fusion, cards shrinking to fit, stacks scrolling sideways. Wrapping is the one being tried first.)

A home that never set its rows gets them filled: its rooms in order, as many to a row as fit on 12 columns, the
same on every screen, so it looks as it did when rows filled themselves. Rooms the rows don't list (a new room in
HA) get rows of their own after the rest, filled the same way.

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
full copy, so new rooms still appear by themselves. It holds **card sizes**, Home's **rows of cards**, whether
Home **groups cards by floor**, the **tabs** and the **room
template**. Rooms, areas and floors themselves are HA's and
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
- **`rows`**: Home's rows, in order, each a list of area IDs: one room, or a stack. Each floor shows the rows of
  its rooms (the area's floor in HA; a row whose rooms are on two floors shows on each with that floor's rooms).
  Rooms it doesn't list get rows of their own after the rest. The same on every screen width.
- **`order`**, **`flatOrder`**: the order of the cards from when rows filled themselves (until 2026-10-07), and
  **`grids.<cols>`**, **`flatGrids.<cols>`**: card positions from when cards were placed freely; only read, to
  fill the rows until they're set.
- **`hidden`**: the rooms hidden from Home, by area ID.
- **`cards`**: a card's own list of controls, by area ID: entity IDs, or `lights` for the all-lights button.
  Unlisted rooms show the generated controls. Like `hide`, it names entity IDs, since it picks single devices.
- **`floors`**: `false` when Home doesn't group its cards by floor: every card is then on one grid, with no floor
  headings. Unset means grouped.
- **`flatRows`**: the rows on that one grid, like `rows`. Each way keeps its own, so switching back and forth
  loses nothing; one not set yet starts with the floors in order.
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

- Controls on the cards don't react (`inert`); each card shows an outline, and its **title band is the drag
  handle** (a grip shows it on cards 4 cells wide or more). At the band's right, one **chip with the card's size**
  opens its menu: every size, each with a miniature of its shape and a check on the current one; **Add a
  control**; **Own row** (in a stack: it leaves the stack for a row of its own, where it was, at its size); and
  **Hide room**. A tap outside or Escape closes it. The default size isn't stored. Nothing of the
  editor reaches past the card, so even an S room keeps its name readable.
- **Drag a card** to another place on its floor: by its title band on touch (only the band has `touch-action:
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
  place of the control under its middle), tap it to swap it for another, × (in its top right corner) removes it; each free cell shows a "+".
  "+" and "+N" open a menu of what the room has (all lights, its lights, climate, switches, scenes), ticked when
  it's on the card, with **Back to automatic** once the card has its own list. The first change gives the card
  its own list, starting from what it showed.
- **Hide a room** from its card's menu: its row closes up; shown again, it comes back in its row. **Hidden rooms** in the bar lists them; tap one to show its card again. A hidden room's screen is
  still reached from the lenses, and its devices still count in the status chips.
- A new size keeps the card in its row, which wraps if it no longer fits; **Full** takes it out of its stack into a
  row of its own, where it was (the cards before and after it stay in rows of their own).
- A bar replaces the header and sticks to the top (on a tablet without its hint, the title cut short, so the buttons
  stay on one row): **Hidden rooms** (once a room is hidden), **Group by floor** (a checkbox; unticked, every card shares one
  grid and there are no floor headings), **Tabs** (a menu: tick the lenses to show as tabs, order them
  with arrows; the navigation band shows the draft), **Done** (saves, if anything changed), **Cancel** (discards)
  and **Reset to default** (the generated home screen with every lens as a tab, saved on Done; the room template
  stays). A failed save keeps the draft and says why.
- One screen is edited at a time: the draft is shown only by that screen, so Home, kept built behind a room
  that's being edited, keeps showing the stored layout.
- In code: the draft in `layout/layoutEditor.svelte.ts`, dragging in `layout/drag.ts` (shared with room sections), the bar in
  `ui/EditBar.svelte` with `ui/TabsMenu.svelte`, the overlay over each card in `ui/CardEditor.svelte`. The overlay sits in the card's grid
  cell rather than inside the card, so the size menu isn't clipped by the card's `contain`.
