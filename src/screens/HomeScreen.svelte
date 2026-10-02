<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import type { CardSize, Position } from "../layout/homeLayout";
  import { dragItem } from "../layout/drag";
  import { GAP, grid } from "../layout/grid.svelte";
  import { tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { compact, moveBox, resizeBox, type Box } from "../layout/place";
  import { gridRows, homeView, type FloorView, type RoomCardView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import { CARD_CELLS, fitCard } from "../model/roomCard";
  import CardEditor from "../ui/CardEditor.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import Header from "../ui/Header.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";
  import TabsMenu from "../ui/TabsMenu.svelte";
  import RoomCard from "./RoomCard.svelte";

  // Each floor is a full-width heading; its room cards sit on one grid under it, where and at the sizes the home
  // layout says (LAYOUTS.md, "The floor grid"). In edit mode it shows the editor's draft.
  const editing = $derived(editor.target === "/");
  const layout = $derived(editing ? editor.layout : homeLayout());
  const floors = $derived(homeView(homeModel(), layout, grid.cols));

  /** The card being dragged, to show where it will land. */
  let dragging = $state<{ floor: string; id: string } | null>(null);

  const boxesOf = (floor: FloorView): Box[] =>
    floor.rooms.map((r) => ({ id: r.room.area.area_id, x: r.x, y: r.y, w: r.size.w, h: gridRows(r.size) }));

  /** Store every card's position on this screen width, with `floorKey`'s cards at `boxes`. */
  function place(floorKey: string, boxes: Box[]) {
    const positions: Record<string, Position> = {};
    for (const floor of floors) {
      for (const b of floor.key === floorKey ? boxes : boxesOf(floor)) positions[b.id] = { x: b.x, y: b.y };
    }
    editor.place(grid.cols, positions);
  }

  const floorOf = (key: string) => floors.find((f) => f.key === key)!;

  function resize(floorKey: string, card: RoomCardView, size: CardSize) {
    const cells = fitCard(CARD_CELLS[size], grid.cols);
    editor.setSize(card.room.area.area_id, size);
    place(floorKey, resizeBox(boxesOf(floorOf(floorKey)), card.room.area.area_id, cells.w, gridRows(cells), grid.cols));
  }

  function startDrag(e: PointerEvent, floorKey: string, card: RoomCardView) {
    const target = e.currentTarget as HTMLElement;
    const el = target.closest<HTMLElement>("[data-card]");
    const floorEl = target.closest<HTMLElement>(".floor-grid");
    if (!el || !floorEl) return;
    const id = card.room.area.area_id;
    // Every step starts from where the cards were when the drag began: a card the dragged one passes over makes
    // room, then goes back to its place once it has passed.
    const start = boxesOf(floorOf(floorKey));
    // The dragged card's target is the grid cell nearest to where it is.
    const pitchX = grid.cell * (1 + GAP); // a column and a gap
    const pitchY = pitchX / 2; // a row of half a cell and a gap
    let cell = { x: card.x, y: card.y };
    dragging = { floor: floorKey, id };
    dragItem(
      e,
      el,
      floorEl,
      (left, top) => {
        const x = Math.max(0, Math.min(Math.round(left / pitchX), grid.cols - card.size.w));
        const y = Math.max(0, Math.round(top / pitchY));
        if (x === cell.x && y === cell.y) return false;
        cell = { x, y };
        place(floorKey, moveBox(start, id, x, y, grid.cols));
        return true;
      },
      () => {
        dragging = null;
        place(floorKey, compact(boxesOf(floorOf(floorKey))));
      },
    );
  }
</script>

<main class="screen" class:editing class:docked={docked()}>
  {#if editing}
    <EditBar title={t("edit.title")} hint={t("edit.hint")} onReset={editor.reset}>
      <TabsMenu />
    </EditBar>
  {:else}
    <Header />
  {/if}
  <NavBand current="home" tabs={tabsOf(layout)} {editing} />
  {#each floors as floor (floor.key)}
    <h2 class="floor-band">{floor.name ?? t("app.otherFloor")}</h2>
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
              name={card.room.area.name}
              onSize={(size) => resize(floor.key, card, size)}
              onDrag={(e) => startDrag(e, floor.key, card)}
            />
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</main>
