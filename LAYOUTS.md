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

**Where it's computed.** One module computes `cols` and `c` from the viewport at start and on `resize` /
orientation change, and sets them on `:root` as `--cols`, `--cell`, `--gap` and `--pad`. Nothing else reads the
viewport size.

## Sizing inside elements

Everything inside an element derives from `--cell`, never from fixed pixels:

- **Text**: e.g. body `0.16 × cell` (about 15 px at 94 px cells), small `0.13 × cell`, large values
  `0.3 × cell`. Every text size has a readable minimum: `max(12px, …)`.
- **Icons, round buttons, padding, corner radius**: fractions of `--cell` as well.
- Tokens for these live in `styles/tokens.css`, so components never compute sizes themselves.

## Element sizes

Every element has a size in cells, `w × h`. Starting set:

| Element | Size |
|---|---|
| Toggle tile (light, switch, fan) | 2 × 1 |
| Sensor tile | 2 × 1 |
| Media tile | 2 × 1 |
| Climate tile | 4 × 2 |
| Room card (home screen) | 2 × 2 |
| Header (clock, date, weather) | full width × 2 |

An element is never wider than its section (4 cells). Later, layouts may offer S / M / L variants per element,
still in whole cells.

## Sections

A **section** is a titled group: a room on the home screen, or "Lights" / "Climate" / … on a room screen.

- A section is **4 cells wide**.
- Its title band is **0.5 cell** tall.
- Its content is a 4-column CSS grid with rows of `--cell`, gap `--gap` and `grid-auto-flow: row dense`, so the
  browser packs tiles without holes.
- **A section's height is known before rendering**: `0.5 + rows`, where `rows` comes from simulating the same
  dense packing of the element sizes on 4 columns (a few lines of arithmetic).

**Full-width bands** such as the header sit above the sections and span all columns.

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

Each column is then a plain vertical stack (flex column), so the browser only stacks blocks. The packer runs at
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

## Relation to layouts (Phase 3)

A layout stores sections, their selectors (area, domain, device class, label), the order, and each element's
size in cells. It never stores pixels or positions, so one layout serves every device and orientation. Editing a
layout means changing the order or a size, and the packer does the rest.
