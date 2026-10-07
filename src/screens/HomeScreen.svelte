<script lang="ts">
  import { mdiPlus } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import type { CardSize } from "../layout/homeLayout";
  import { dragItem } from "../layout/drag";
  import { GAP, grid } from "../layout/grid.svelte";
  import { byFloor, sizeOf, tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { dropCard, ownRow, type Drop } from "../layout/rows";
  import { gridRows, homeRows, homeView, type FloorView, type RoomCardView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import CardEditor from "../ui/CardEditor.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import FloorsToggle from "../ui/FloorsToggle.svelte";
  import HiddenRoomsMenu from "../ui/HiddenRoomsMenu.svelte";
  import Icon from "../ui/Icon.svelte";
  import Header from "../ui/Header.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";
  import TabsMenu from "../ui/TabsMenu.svelte";
  import RoomCard from "./RoomCard.svelte";

  // Each floor is a full-width heading; its room cards sit under it in the layout's rows, a room on its own or a stack
  // of rooms side by side, at their sizes (LAYOUTS.md, "The floor grid"). Without grouping by floor, all cards share
  // one grid and there are no headings. In edit mode it shows the editor's draft.
  const editing = $derived(editor.target === "/");
  const layout = $derived(editing ? editor.layout : homeLayout());
  const floors = $derived(homeView(homeModel(), layout, grid.cols, editing));

  /** The card being dragged, to show where it will land, and the band it's over, if any. */
  let dragging = $state<{ floor: string; id: string; band?: string } | null>(null);

  const floorOf = (key: string) => floors.find((f) => f.key === key)!;
  const isFull = (id: string) => sizeOf(editor.layout, id) === "full";
  const bandKey = (drop: Drop) => `${drop.kind}:${"row" in drop ? drop.row : drop.id}`;

  /** A new size; a card that takes the whole row leaves its stack for a row of its own, where it was. */
  function resize(card: RoomCardView, size: CardSize) {
    const id = card.room.area.area_id;
    editor.setSize(id, size);
    if (size === "full") editor.setRows(ownRow(homeRows(homeModel(), editor.layout), id));
  }

  /**
   * Where a card dragged with its middle at (`x`, `y`) goes, in columns and rows of half a cell: next to the card
   * under it, into a new row in the band under it, or at the end of the row whose free space it's over. Nothing
   * while it's over its own place.
   */
  function dropAt(floor: FloorView, id: string, x: number, y: number): Drop | undefined {
    const inside = (r: RoomCardView) => x >= r.x && x < r.x + r.size.w && y >= r.y && y < r.y + gridRows(r.size);
    const under = floor.rooms.find(inside);
    if (under) return under.room.area.area_id === id ? undefined : { kind: "card", id: under.room.area.area_id };
    const band = floor.bands.find((b) => y >= b.y && y < b.y + 1);
    if (band) return band.drop;
    const row = floor.rows.find((r) => y >= r.y && y < r.y + r.h);
    return row && { kind: "end", row: row.first };
  }

  /**
   * Drag a card by its title: over another card it goes next to it (into that card's row), over the free space at the
   * end of a row it goes last in it, and the rows re-flow around it as it goes. Over a band between rows the band
   * lights up, and letting go there gives the card a row of its own: done only then, since a card on its way to
   * another one crosses bands, and each would re-flow everything under the pointer.
   */
  function startDrag(e: PointerEvent, floorKey: string, card: RoomCardView) {
    const target = e.currentTarget as HTMLElement;
    const el = target.closest<HTMLElement>("[data-card]");
    const floorEl = target.closest<HTMLElement>(".floor-grid");
    if (!el || !floorEl) return;
    const id = card.room.area.area_id;
    const pitchX = grid.cell * (1 + GAP); // a column and a gap
    const pitchY = pitchX / 2; // a row of half a cell and a gap
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
    dragging = { floor: floorKey, id };
    dragItem(
      e,
      el,
      floorEl,
      (left, top) => {
        const x = (left + el.offsetWidth / 2) / pitchX;
        const y = (top + el.offsetHeight / 2) / pitchY;
        const drop = dropAt(floorOf(floorKey), id, x, y);
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
      },
    );
  }
</script>

<main class="screen" class:editing class:docked={docked()}>
  {#if editing}
    <EditBar title={t("edit.title")} hint={t("edit.hint")} onReset={editor.reset}>
      <HiddenRoomsMenu />
      <FloorsToggle checked={byFloor(layout)} />
      <TabsMenu />
    </EditBar>
  {:else}
    <Header />
  {/if}
  <NavBand current="home" tabs={tabsOf(layout)} {editing} />
  {#each floors as floor (floor.key)}
    {#if floor.heading}
      <h2 class="floor-band">{floor.name ?? t("app.otherFloor")}</h2>
    {/if}
    <div class="floor-grid">
      {#if editing}
        <!-- Each row framed, empty space and all, so a stack reads as one; between rows, where a card gets a row. -->
        {#each floor.rows as row (row.first)}
          <div class="row-frame" style:grid-row="{row.y + 1} / span {row.h}"></div>
        {/each}
        {#each floor.bands as band (bandKey(band.drop))}
          <div
            class="row-band"
            class:shown={dragging?.floor === floor.key}
            class:over={dragging?.band === bandKey(band.drop)}
            style:grid-row="{band.y + 1} / span 1"
          >
            <Icon path={mdiPlus} size={18} />{t("edit.newRow")}
          </div>
        {/each}
      {/if}
      {#each floor.rooms as card (card.room.area.area_id)}
        {#if dragging?.floor === floor.key && dragging.id === card.room.area.area_id}
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
          <RoomCard room={card.room} size={card.size} items={card.items} {editing} />
          {#if editing}
            <CardEditor
              size={card.size}
              sizeName={card.sizeName}
              room={card.room}
              items={card.items}
              slots={card.slots}
              onSize={(size) => resize(card, size)}
              onDrag={(e) => startDrag(e, floor.key, card)}
              onSlots={(slots) => editor.setSlots(card.room.area.area_id, slots)}
              onHide={() => editor.setRoomHidden(card.room.area.area_id, true)}
              onOwnRow={card.stacked ? () => editor.setRows(ownRow(homeRows(homeModel(), editor.layout), card.room.area.area_id)) : undefined}
            />
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</main>
