# Layout rules

How ha-ui divides the screen and sizes everything on it. The short version: **one square cell is the unit for
everything**, elements are sized in whole cells, sections are 4 cells wide, and a small packer arranges sections
in columns like a masonry layout. On the home screen, room cards come in a few fixed sizes and sit on one cell
grid per floor, where you place them. Nothing is sized in pixels except a few readability minimums.

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
| Media tile | 2 × 1 |
| Climate tile | 4 × 2 |
| Light button (room card) | 1 × 1 |
| Compact climate (room card) | 2 × 1 |
| "+N" button (room card) | 1 × 1 |
| Room card | XS 2 × 1.5, S 4 × 1.5, M 4 × 3, L 4 × 4, Wide 8 × 3 (see "Room cards") |
| Header (clock, date, weather) | full width × 2 |

An element is never wider than its section (4 cells), or than its card's width on the home screen.

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
floor's room cards fill their own grid under its heading (see "Room cards").

## Room cards (home screen)

Each room is a card in one of **five fixed sizes**, in cells:

| Size | Cells (w × h) | Controls |
|---|---|---|
| XS | 2 × 1.5 | 1 row of 2 |
| S | 4 × 1.5 | 1 row of 4 |
| **M** (default) | 4 × 3 | 2 rows of 4 |
| L | 4 × 4 | 3 rows of 4 |
| Wide | 8 × 3 | 2 rows of 8 |

A card covers its cells and the gaps between them: `w × c + (w − 1) × g` wide. Heights come in half cells, so an
S card is exactly half an M (and an XS half an S): two S cards stacked, with the gap between them, are as tall as one M. **At the
bottom of a card, one row of controls per cell below the title band** (`ceil(h) − 1` rows), in an inset grid of
`w` columns, so controls are slightly smaller than a page cell; **above them the title band**, one cell tall, or
half a cell on S and XS cards. A card is never wider than the screen: on a 4-column phone a Wide card is 4 cells wide
(and shows 4 controls per row).

Cards are clearly lifted off the background, and their controls are a step lighter again: three tokens in
`styles/tokens.css`, `--card`, `--card-control` and `--card-control-icon`, with a `--line-strong` edge.

The title band shows the room's name, temperature and humidity (on an XS card, which is 2 cells wide, only the
name and temperature), and an arrow; tapping it opens the room. Below the band, the room's controls:

- lights as 1 × 1 buttons (tap to toggle), then climate devices as compact 2 × 1 controls (power, and the target
  temperature while on);
- **as many rows as the size has**. What doesn't fit is replaced by a 1 × 1 "+N" button that opens the room.
  When something has to go, climate is kept before lights; the order on screen stays lights first.
- A room without lights or climate keeps an empty card.

In code: the sizes are `CARD_CELLS` and `roomCardItems` (given the card's size) in `model/roomCard.ts`, rendered by
`screens/RoomSection.svelte`.

### The floor grid

Each floor's cards fill one CSS grid as wide as the page: `cols` columns of `--cell`, gap `--gap`, and rows of
**half a cell**, `(c − g) / 2`, so two rows and the gap between them make one cell. A card spans `w` columns and
`2h` rows, at an explicit position: `x` in columns, `y` in rows of half a cell.

Positions come from a small placement step (`layout/place.ts`), pure arithmetic on the sizes, so nothing is
measured:

- Cards with a stored position for this column count go there: moved left if the screen is narrower, pushed down
  if they overlap.
- **Every card floats up** as far as it can, in reading order, so there are no gaps above a card. Gaps beside
  cards stay until you fill them.
- Cards without a position fill the first free spot, scanning rows from the top: a new room, or every card on a
  column count you haven't arranged yet. Their order is the reading order of the nearest arranged column count,
  else the default order. So the phone (4 columns) follows what you set on the tablet (12) until you arrange it
  there too.

A card's size never depends on its contents.

## Packing sections

Room screens pack their sections into columns (the home screen uses floor grids instead, above).
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
full copy, so new rooms still appear by themselves. It holds two things: **card sizes**, and **card positions per
column count**, in grid units, never pixels. Rooms, areas and floors themselves are HA's and aren't changed here.
(`layout/homeLayout.ts`)

```json
{
  "version": 1,
  "sizes": { "kitchen": "wide", "hallway": "xs" },
  "grids": {
    "12": { "garden": { "x": 0, "y": 0 }, "hallway": { "x": 0, "y": 3 }, "kitchen": { "x": 4, "y": 0 } }
  }
}
```

- **`sizes`**: each card's size, `xs`, `s`, `m`, `l` or `wide`; unlisted rooms are `m`. The same on every screen.
- **`grids.<cols>`**: where each card sits on a screen `cols` columns wide (4 on a phone, 8 on a portrait
  tablet, 12 on a landscape tablet or laptop, 16 on a large screen), by area ID: `x` in columns, `y` in rows of
  half a cell, from the top left of the card's floor grid. A card stays on its floor (the area's floor in HA).
  The editor stores every card of a column count once you change anything there.

Rooms are referenced by area ID, which stays the same when a room is renamed; a stale one is simply ignored. The
stored value is read defensively: unknown fields and sizes are dropped, and a version this app doesn't know gives
the generated layout. (`homeView` in `model/homeView.ts` applies the layout to the model.)

### Storage

The layout belongs to the **HA user** the screen is logged in as, and lives in Home Assistant's per-user frontend
storage under the key `ha-ui.layout` (`frontend/subscribe_user_data` / `set_user_data`). Any logged-in user can
save their own, so a non-admin kiosk account arranges its own screen; it survives a cleared browser, and every
screen logged in as the same user follows a change at once. If two screens save at the same time, the last save
wins. At start the app waits briefly (up to 2 s) for the layout, so the home screen doesn't rearrange itself
right after appearing. (`layout/layoutStore.svelte.ts`)

### Edit mode

The **edit button** next to the settings gear turns the home screen into an editor; nothing is saved until **Done**.

- Controls on the cards don't react (`inert`); each card shows an outline, a small **size chip** in its title band
  and a **drag handle** in the middle. The chip opens a menu of every size, each with a miniature of its shape,
  its cells and a check on the current one; picking one applies it, and a tap outside or Escape closes the menu.
  The default size isn't stored.
- **Drag a card** to any spot on its floor: by the handle on touch (only the handle has `touch-action: none`,
  so swiping anywhere else on a card still scrolls the page), from anywhere on the card with a mouse. Only the
  dragged card moves, with `transform`. Its target is the cell nearest to where it is; when that changes, the
  card takes that cell, cards in the way move down, and the rest float up (`moveBox`). Each step starts from
  where the cards were when the drag began, so a card you pass over goes back to its place. A faint outline shows
  where the card will land; when it's let go, every card floats up, this one too. Near the top or bottom edge the
  page scrolls by itself.
- A new size keeps the card where it is (moved left if it no longer fits); the cards around it make room.
- A bar replaces the header and sticks to the top: **Done** (saves, if anything changed), **Cancel** (discards)
  and **Reset to default** (an empty layout, saved on Done). A failed save keeps the draft and says why.
- In code: the draft in `layout/layoutEditor.svelte.ts`, dragging in `layout/dragCard.ts`, the bar in
  `ui/EditBar.svelte`, the overlay over each card in `ui/CardEditor.svelte`. The overlay sits in the card's grid
  cell rather than inside the card, so the size menu isn't clipped by the card's `contain`.
