<script lang="ts" generics="T extends BoardItem">
  import { mdiPlus } from "@mdi/js";
  import type { Snippet } from "svelte";
  import { t } from "../i18n/index.svelte";
  import Icon from "../ui/Icon.svelte";
  import { BAND_ROWS, gridRows, type Board, type BoardItem, type Placed } from "./board";
  import { dragItem } from "./drag";
  import { GAP, grid } from "./grid.svelte";
  import type { Drop } from "./rows";

  /**
   * A board of cards in rows (layout/board.ts): Home's rooms, a room screen's sections, a lens's rooms. In edit mode
   * each row is framed, a card is selected with a tap (`selected`), and dragged by its title: over another card it goes
   * next to it (into that card's row), over the free space at the end of a row it goes last in it, and the rows
   * re-flow around it as it goes. Over a band between rows the band lights up, and letting go there gives the card a
   * row of its own: done only then, since a card on its way to another one crosses bands, and each would re-flow
   * everything under the pointer. The screen keeps the rows: `onDrop` applies a drop and says whether it changed them.
   */
  let {
    view,
    editing = false,
    selected = $bindable(null),
    onDrop,
    card,
  }: {
    view: Board<T>;
    editing?: boolean;
    /** In edit mode, the card being changed: its tools are on it and in the dock at the bottom. */
    selected?: string | null;
    onDrop?: (id: string, drop: Drop) => boolean;
    /** A card's content, and the function its title band calls to start dragging it. */
    card: Snippet<[Placed<T>, (e: PointerEvent) => void]>;
  } = $props();

  // Nothing is selected outside edit mode, or once the selected card is gone (hidden).
  $effect(() => {
    if (!editing || (selected && !view.cards.some((c) => c.id === selected))) selected = null;
  });

  /** When a drag last ended: the click that follows it lands wherever the card was let go. */
  let droppedAt = 0;

  /**
   * A tap outside the cards and the edit tools, or Escape, puts the selected card down. Seen on the window, after the
   * tap selected a card and its pick button went: the event's path still has the elements it went through.
   */
  function deselect(e: MouseEvent) {
    if (!editing || performance.now() - droppedAt < 100) return;
    const inside = e.composedPath().some(
      (el) => el instanceof Element && el.matches("[data-card], .edit-dock, .edit-bar, .nav-band, .slot-menu, .menu"),
    );
    if (!inside) selected = null;
  }
  function escape(e: KeyboardEvent) {
    if (e.key === "Escape" && editing) selected = null;
  }

  /** The card being dragged, to show where it will land, and the band it's over, if any. */
  let dragging = $state<{ id: string; band?: string } | null>(null);

  const bandKey = (drop: Drop) => `${drop.kind}:${"row" in drop ? drop.row : drop.id}`;

  /**
   * Where a card dragged with its middle at (`x`, `y`) goes, in columns and rows of a quarter cell: next to the card
   * under it, into a new row in the band under it, or at the end of the row whose free space it's over. Nothing
   * while it's over its own place.
   */
  function dropAt(id: string, x: number, y: number): Drop | undefined {
    const inside = (c: Placed<T>) => x >= c.x && x < c.x + c.size.w && y >= c.y && y < c.y + gridRows(c.size);
    const under = view.cards.find(inside);
    if (under) return under.id === id ? undefined : { kind: "card", id: under.id };
    const band = view.bands.find((b) => y >= b.y && y < b.y + BAND_ROWS);
    if (band) return band.drop;
    const row = view.rows.find((r) => y >= r.y && y < r.y + r.h);
    return row && { kind: "end", row: row.first };
  }

  function startDrag(e: PointerEvent, id: string) {
    // `target`, not `currentTarget`: the drag starts after the pointer has moved, once the event has been handled.
    const target = e.target as HTMLElement;
    const el = target.closest<HTMLElement>("[data-card]");
    const boardEl = target.closest<HTMLElement>(".floor-grid");
    if (!el || !boardEl || !onDrop) return;
    const drop = onDrop;
    const pitchX = grid.cell * (1 + GAP); // a column and a gap
    const pitchY = pitchX / 4; // a row of a quarter cell and a gap
    // The drop it last made: after a card moves, what was under the pointer may move into its old place, and
    // dropping there again would swap the two back and forth.
    let last: string | undefined;
    /** The band it's over, to drop into when let go. */
    let band: Drop | undefined;
    dragging = { id };
    dragItem(
      e,
      el,
      boardEl,
      (left, top) => {
        const x = (left + el.offsetWidth / 2) / pitchX;
        const y = (top + el.offsetHeight / 2) / pitchY;
        const at = dropAt(id, x, y);
        const key = at && bandKey(at);
        band = at && (at.kind === "before" || at.kind === "after") ? at : undefined;
        const lit = band && key;
        if (dragging && dragging.band !== lit) dragging.band = lit;
        if (key === last) return false;
        last = key;
        return !!at && !band && drop(id, at);
      },
      () => {
        if (band) drop(id, band);
        dragging = null;
        droppedAt = performance.now();
      },
    );
  }
</script>

<svelte:window onkeydown={escape} onclick={deselect} />

<div class="floor-grid">
  {#if editing}
    <!-- Each row framed, empty space and all, so a stack reads as one; between rows, where a card gets a row. -->
    {#each view.rows as row (row.first)}
      <div class="row-frame" style:grid-row="{row.y + 1} / span {row.h}"></div>
    {/each}
    {#each view.bands as band (bandKey(band.drop))}
      <div
        class="row-band"
        class:shown={dragging}
        class:over={dragging?.band === bandKey(band.drop)}
        style:grid-row="{band.y + 1} / span {BAND_ROWS}"
      >
        <Icon path={mdiPlus} size={18} />{t("edit.newRow")}
      </div>
    {/each}
  {/if}
  {#each view.cards as c (c.id)}
    {#if dragging?.id === c.id}
      <div
        class="drop-ghost"
        style:grid-column="{c.x + 1} / span {c.size.w}"
        style:grid-row="{c.y + 1} / span {gridRows(c.size)}"
      ></div>
    {/if}
    <div
      class="grid-item"
      data-card={c.id}
      style:grid-column="{c.x + 1} / span {c.size.w}"
      style:grid-row="{c.y + 1} / span {gridRows(c.size)}"
    >
      {@render card(c, (e) => startDrag(e, c.id))}
    </div>
  {/each}
</div>
