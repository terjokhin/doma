# Layout rules

How ha-ui divides the screen and sizes everything on it. The short version: **one square cell is the unit for
everything**, elements are sized in whole cells, sections are 4 cells wide, and a small packer arranges sections
in columns like a masonry layout. Nothing is sized in pixels except a few readability minimums.

## Goals

- **One layout for every screen.** The same layout works on a 10″ tablet in either orientation, a phone and a
  24″ panel. Rotating the device reflows it; nothing is stored per device or per orientation.
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
| Media tile | 2 × 1 |
| Climate tile | 4 × 2 |
| Light button (room card) | 1 × 1 |
| Compact climate (room card) | 2 × 1 |
| "+N" button (room card) | 1 × 1 |
| Header (clock, date, weather) | full width × 2 |

An element is never wider than its section (4 cells). Later, layouts may offer S / M / L variants per element,
still in whole cells.

## Sections

A **section** is a titled group: "Lights" / "Climate" / … on a room screen. Room cards on the home screen are
packed the same way, but have a fixed size (see "Room cards").

- A section is **4 cells wide**.
- Its title band is **0.5 cell** tall.
- Its content is a 4-column CSS grid with rows of `--cell`, gap `--gap` and `grid-auto-flow: row dense`, so the
  browser packs tiles without holes.
- **A section's height is known before rendering**: `0.5 + rows + (rows − 1) × 0.1` cells (title band, rows,
  gaps between rows), where `rows` comes from simulating the same dense packing of the element sizes on
  4 columns (`denseRows` in `layout/pack.ts`).

**Full-width bands** sit above the sections and span all columns: the home header (clock, date, weather) is
2 rows, the room header (back, name, climate) 1 row, and each floor heading on the home screen half a cell. Each
floor's rooms are packed into columns separately, under its heading.

## Room cards (home screen)

Each room is a card, and **every room card has the same size**, whatever it shows: 4 cells wide, and
`0.5 + 2 + 2 × 0.1 = 2.7` cells tall (title band, 2 rows, the gap between them and a gap below; `CARD_HEIGHT` in
`model/roomCard.ts`). Equal heights make the cards line up in rows. Its controls sit in an inset 4 × 2 grid, so
they're slightly smaller than a page cell.

Cards are clearly lifted off the background, and their controls are a step lighter again: three tokens in
`styles/tokens.css`, `--card`, `--card-control` and `--card-control-icon`, with a `--line-strong` edge.

The title band shows the room's name, temperature and humidity, and an arrow; tapping it opens the room. Below
it, the room's controls:

- lights as 1 × 1 buttons (tap to toggle), then climate devices as compact 2 × 1 controls (power, and the target
  temperature while on);
- **at most 2 rows**. What doesn't fit is replaced by a 1 × 1 "+N" button that opens the room. When something has
  to go, climate is kept before lights; the order on screen stays lights first.
- A room without lights or climate keeps an empty card.

In code: `roomCardItems` in
`model/roomCard.ts`, rendered by `screens/RoomSection.svelte`.

## Packing sections

The page has `cols / 4` section columns: 1 on a phone, 2 in portrait, 3 in landscape. Sections are assigned to
columns by a deterministic packer:

```
heights = [0, 0, …]                  // one per section column, in cells
for section in sections (in layout order):
    k = index of the lowest height   // ties: the leftmost column
    assign section to column k
    heights[k] += section.height + 0.1   // 0.1 = the gap, in cells
```

Each column is then a plain vertical stack (flex column), so the browser only stacks blocks. In code:
`packColumns` in `layout/pack.ts`, rendered by `layout/SectionColumns.svelte`; a section is
`layout/Section.svelte`, and each element sits in a `layout/GridItem.svelte` that spans its cells. The packer runs at
start, on rotation or resize (when `cols` changes) and when the layout changes, never on state updates.

Properties:

- **Order is kept** in reading order: sections go left to right, then fill the shortest column. Rotating doesn't
  shuffle rooms beyond moving them between columns.
- **No measuring**: heights are known from the sizes, so there is no layout thrash and no flicker on load.
- **Same result everywhere**: the same layout and width always give the same arrangement.

## Rotation and resizing

When `cols` changes, the packer runs again and the sections move to their new columns. A change of `c` alone
(same `cols`) only rescales through the CSS variables. A short opacity fade may cover the switch; no layout
animations.

## Browser constraints

These rules target Chrome 108 (see the README):

- **Use**: CSS grid, flexbox, custom properties, `calc()`, `max()` / `clamp()`, container queries.
- **Don't use**: `subgrid` (Chrome 117), CSS masonry (not shipped anywhere), JavaScript that measures elements to
  place them.
- Animate only `transform` and `opacity`.

## Layout model

The house layout stores **only the user's changes** on top of the layout generated from HA's floors and areas,
never a full copy, so new rooms and devices still appear by themselves. It never stores pixels or positions, so
one layout serves every device and orientation; the packer does the placing. (`layout/houseLayout.ts`)

```json
{
  "version": 1,
  "order": ["kitchen", "living_room"],
  "hidden": ["hallway"],
  "rooms": {
    "living_room": { "card": ["lights"], "hide": ["light.living_room_wall_sconce"] },
    "office": { "card": ["sensors"], "pin": ["climate.office_ac"] }
  }
}
```

- **`order`**: room order on the home screen, by area ID, within each floor. Listed rooms come first; unlisted
  ones follow in their default order, so a new room appears at the end of its floor.
- **`hidden`**: rooms left off the home screen. Their room screens still work.
- **`rooms.<area>.card`**: what the room's card shows, by kind, in this order: `lights`, `climate`, `switches`,
  `sensors`. Default `["lights", "climate"]`. Lights and switches are 1 × 1 buttons, sensors 1 × 1 readings,
  climate a 2 × 1 control.
- **`rooms.<area>.pin`** / **`hide`**: entities shown first on the card (whatever their kind), or never.
- When a card overflows its 2 rows, pinned entities are kept first, then climate, then the rest.

Rooms are referenced by area ID, which stays the same when a room is renamed. Pinned and hidden entities are
referenced by entity ID; a stale one is simply ignored. The stored value is read defensively: unknown fields are
dropped, and a version this app doesn't know gives the generated layout. (`homeView` in `model/homeView.ts`
applies the layout to the model.)

### Storage

There is **one layout per house**: every user and every screen (wall tablet, laptop, phone) shows the same one.
It lives in Home Assistant's shared frontend storage under the key `ha-ui.layout`
(`frontend/subscribe_system_data` / `set_system_data`). Any user can read it, so the kiosk just displays it;
saving needs an admin login. The app subscribes to it, so a change saved on one screen shows up on every other
screen at once. At start the app waits briefly (up to 2 s) for the layout, so the home screen doesn't rearrange
itself right after appearing. (`layout/layoutStore.svelte.ts`)
