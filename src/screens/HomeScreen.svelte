<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import type { CardSize } from "../layout/homeLayout";
  import { dragItem } from "../layout/drag";
  import { GAP, grid } from "../layout/grid.svelte";
  import { byFloor, tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { moveTo } from "../layout/rows";
  import { gridRows, homeView, type RoomCardView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import CardEditor from "../ui/CardEditor.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import FloorsToggle from "../ui/FloorsToggle.svelte";
  import HiddenRoomsMenu from "../ui/HiddenRoomsMenu.svelte";
  import Header from "../ui/Header.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";
  import TabsMenu from "../ui/TabsMenu.svelte";
  import RoomCard from "./RoomCard.svelte";

  // Each floor is a full-width heading; its room cards sit in rows under it, in the layout's order and at its sizes
  // (LAYOUTS.md, "The floor grid"). Without grouping by floor, all cards share one grid and there are no headings.
  // In edit mode it shows the editor's draft.
  const editing = $derived(editor.target === "/");
  const layout = $derived(editing ? editor.layout : homeLayout());
  const floors = $derived(homeView(homeModel(), layout, grid.cols, editing));

  /** The card being dragged, to show where it will land. */
  let dragging = $state<{ floor: string; id: string } | null>(null);

  /** Every card in the order Home shows them, all floors. */
  const shownOrder = () => floors.flatMap((f) => f.rooms.map((r) => r.room.area.area_id));
  const floorOf = (key: string) => floors.find((f) => f.key === key)!;

  /** A new size: the rows follow by themselves. */
  const resize = (card: RoomCardView, size: CardSize) => editor.setSize(card.room.area.area_id, size);

  /**
   * Drag a card to another place in the order: when its middle is over another card on its floor, it takes that
   * card's place, and the rows re-flow around it.
   */
  function startDrag(e: PointerEvent, floorKey: string, card: RoomCardView) {
    const target = e.currentTarget as HTMLElement;
    const el = target.closest<HTMLElement>("[data-card]");
    const floorEl = target.closest<HTMLElement>(".floor-grid");
    if (!el || !floorEl) return;
    const id = card.room.area.area_id;
    const pitchX = grid.cell * (1 + GAP); // a column and a gap
    const pitchY = pitchX / 2; // a row of half a cell and a gap
    // The card it last took the place of: a bigger card that moves into the dragged one's old place may still be
    // under the pointer, and taking its place again would swap the two back and forth.
    let last: string | undefined;
    dragging = { floor: floorKey, id };
    dragItem(
      e,
      el,
      floorEl,
      (left, top) => {
        const x = (left + el.offsetWidth / 2) / pitchX;
        const y = (top + el.offsetHeight / 2) / pitchY;
        const under = floorOf(floorKey).rooms.find(
          (r) => r.room.area.area_id !== id && x >= r.x && x < r.x + r.size.w && y >= r.y && y < r.y + gridRows(r.size),
        )?.room.area.area_id;
        if (under === last) return false;
        last = under;
        if (!under) return false;
        editor.setOrder(moveTo(shownOrder(), id, under));
        return true;
      },
      () => (dragging = null),
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
            />
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</main>
