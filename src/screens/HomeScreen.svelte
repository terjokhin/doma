<script lang="ts">
  import { mdiPlus } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import type { CardSize } from "../layout/homeLayout";
  import { dragItem } from "../layout/drag";
  import { GAP, grid } from "../layout/grid.svelte";
  import { sizeOf, tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { dropCard, ownRow, type Drop } from "../layout/rows";
  import { BAND_ROWS, gridRows, homeRows, homeView, type RoomCardView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import CardEditor from "../ui/CardEditor.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import EditDock from "../ui/EditDock.svelte";
  import HiddenRoomsMenu from "../ui/HiddenRoomsMenu.svelte";
  import Icon from "../ui/Icon.svelte";
  import Header from "../ui/Header.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";
  import TabsMenu from "../ui/TabsMenu.svelte";
  import RoomCard from "./RoomCard.svelte";

  // The room cards sit in the layout's rows, each a room on its own or a stack of rooms side by side, at their sizes
  // (LAYOUTS.md, "The floor grid"). In edit mode it shows the editor's draft.
  const editing = $derived(editor.target === "/");
  const layout = $derived(editing ? editor.layout : homeLayout());
  /** In edit mode, the room whose card is being changed: its tools are on it and in the bar at the bottom. */
  let selected = $state<string | null>(null);
  const view = $derived(homeView(homeModel(), layout, grid.cols, editing, selected));
  const selectedCard = $derived(view.rooms.find((r) => r.room.area.area_id === selected));

  // Nothing is selected outside edit mode, or once the selected room is hidden.
  $effect(() => {
    if (!editing || (selected && !selectedCard)) selected = null;
  });

  /** When a drag last ended: the click that follows it lands wherever the card was let go. */
  let droppedAt = 0;

  /** A tap outside the rooms and their tools, or Escape, puts the selected room down. */
  function deselect(e: MouseEvent) {
    if (performance.now() - droppedAt < 100) return;
    if (!(e.target as Element).closest("[data-card], .edit-dock, .edit-bar, .nav-band, .slot-menu")) selected = null;
  }
  function escape(e: KeyboardEvent) {
    if (e.key === "Escape" && editing) selected = null;
  }

  /** The card being dragged, to show where it will land, and the band it's over, if any. */
  let dragging = $state<{ id: string; band?: string } | null>(null);

  const isFull = (id: string) => sizeOf(editor.layout, id) === "full";
  const bandKey = (drop: Drop) => `${drop.kind}:${"row" in drop ? drop.row : drop.id}`;

  /** A new size; a card that takes the whole row leaves its stack for a row of its own, where it was. */
  function resize(id: string, size: CardSize) {
    editor.setSize(id, size);
    if (size === "full") editor.setRows(ownRow(homeRows(homeModel(), editor.layout), id));
  }

  /**
   * Where a card dragged with its middle at (`x`, `y`) goes, in columns and rows of a quarter cell: next to the card
   * under it, into a new row in the band under it, or at the end of the row whose free space it's over. Nothing
   * while it's over its own place.
   */
  function dropAt(id: string, x: number, y: number): Drop | undefined {
    const inside = (r: RoomCardView) => x >= r.x && x < r.x + r.size.w && y >= r.y && y < r.y + gridRows(r.size);
    const under = view.rooms.find(inside);
    if (under) return under.room.area.area_id === id ? undefined : { kind: "card", id: under.room.area.area_id };
    const band = view.bands.find((b) => y >= b.y && y < b.y + BAND_ROWS);
    if (band) return band.drop;
    const row = view.rows.find((r) => y >= r.y && y < r.y + r.h);
    return row && { kind: "end", row: row.first };
  }

  /**
   * Drag a card by its title: over another card it goes next to it (into that card's row), over the free space at the
   * end of a row it goes last in it, and the rows re-flow around it as it goes. Over a band between rows the band
   * lights up, and letting go there gives the card a row of its own: done only then, since a card on its way to
   * another one crosses bands, and each would re-flow everything under the pointer.
   */
  function startDrag(e: PointerEvent, card: RoomCardView) {
    // `target`, not `currentTarget`: the drag starts after the pointer has moved, once the event has been handled.
    const target = e.target as HTMLElement;
    const el = target.closest<HTMLElement>("[data-card]");
    const floorEl = target.closest<HTMLElement>(".floor-grid");
    if (!el || !floorEl) return;
    const id = card.room.area.area_id;
    const pitchX = grid.cell * (1 + GAP); // a column and a gap
    const pitchY = pitchX / 4; // a row of a quarter cell and a gap
    // The drop it last made: after a card moves, what was under the pointer may move into its old place, and
    // dropping there again would swap the two back and forth.
    let last: string | undefined;
    /** The band it's over, to drop into when let go. */
    let band: Drop | undefined;
    const apply = (drop: Drop) => {
      const rows = homeRows(homeModel(), editor.layout);
      const next = dropCard(rows, id, drop, isFull);
      if (next === rows) return false;
      editor.setRows(next);
      return true;
    };
    dragging = { id };
    dragItem(
      e,
      el,
      floorEl,
      (left, top) => {
        const x = (left + el.offsetWidth / 2) / pitchX;
        const y = (top + el.offsetHeight / 2) / pitchY;
        const drop = dropAt(id, x, y);
        const key = drop && bandKey(drop);
        band = drop && (drop.kind === "before" || drop.kind === "after") ? drop : undefined;
        const lit = band && key;
        if (dragging && dragging.band !== lit) dragging.band = lit;
        if (key === last) return false;
        last = key;
        return !!drop && !band && apply(drop);
      },
      () => {
        if (band) apply(band);
        dragging = null;
        droppedAt = performance.now();
      },
    );
  }
</script>

<svelte:window onkeydown={escape} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions (Escape does it) -->
<main class="screen" class:editing class:docked={docked()} onclick={editing ? deselect : undefined}>
  {#if editing}
    <EditBar title={t("edit.title")} hint={t("edit.hint")} onReset={editor.reset}>
      <HiddenRoomsMenu />
      <TabsMenu />
    </EditBar>
  {:else if !grid.sidebar}
    <Header />
  {/if}
  <!-- On wide screens the sidebar has the clock, the tabs and the status chips. -->
  {#if !grid.sidebar}<NavBand current="home" tabs={tabsOf(layout)} {editing} />{/if}
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
      {#each view.rooms as card (card.room.area.area_id)}
        {#if dragging?.id === card.room.area.area_id}
          <div
            class="drop-ghost"
            style:grid-column="{card.x + 1} / span {card.size.w}"
            style:grid-row="{card.y + 1} / span {gridRows(card.size)}"
          ></div>
        {/if}
        <div
          class="grid-item"
          data-card={card.room.area.area_id}
          style:grid-column="{card.x + 1} / span {card.size.w}"
          style:grid-row="{card.y + 1} / span {gridRows(card.size)}"
        >
          <RoomCard room={card.room} name={card.name} size={card.size} items={card.items} {editing} />
          {#if editing}
            <CardEditor
              size={card.size}
              room={card.room}
              items={card.items}
              slots={card.slots}
              selected={selected === card.room.area.area_id}
              onSelect={() => (selected = card.room.area.area_id)}
              onDrag={(e) => startDrag(e, card)}
              onSlots={(slots) => editor.setSlots(card.room.area.area_id, slots)}
            />
          {/if}
        </div>
      {/each}
    </div>
  {#if editing}
    {@const id = selectedCard?.room.area.area_id}
    <EditDock
      name={selectedCard?.name}
      haName={selectedCard?.room.area.name}
      onRename={(name) => selectedCard && editor.setRoomName(selectedCard.room.area, name)}
      size={selectedCard?.sizeName}
      onSize={(size) => id && resize(id, size)}
      onOwnRow={id && selectedCard?.stacked ? () => editor.setRows(ownRow(homeRows(homeModel(), editor.layout), id)) : undefined}
      onHide={() => id && editor.setRoomHidden(id, true)}
      onClose={() => (selected = null)}
    />
  {/if}
</main>
