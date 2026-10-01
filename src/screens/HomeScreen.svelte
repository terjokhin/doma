<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import { dragCard } from "../layout/dragCard";
  import { grid } from "../layout/grid.svelte";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import Header from "../ui/Header.svelte";
  import RoomSection from "./RoomSection.svelte";

  // Each floor is a full-width heading; its room cards fill one cell grid under it, in the order and at the
  // sizes the home layout gives (LAYOUTS.md, "The floor grid"). In edit mode it shows the editor's draft.
  const floors = $derived(homeView(homeModel(), editor.layout, grid.cols));

  /** Put the dragged card where `target` is: after it when moving forward, before it when moving back. */
  function moveCard(dragged: string, target: string) {
    const ids = floors.flatMap((f) => f.rooms.map((r) => r.room.area.area_id));
    const to = ids.indexOf(target);
    ids.splice(ids.indexOf(dragged), 1);
    ids.splice(to, 0, dragged);
    editor.setOrder(ids);
  }

  function startDrag(e: PointerEvent, areaId: string) {
    const card = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-card]");
    if (card) dragCard(e, card, (target) => moveCard(areaId, target));
  }
</script>

<main class="screen" class:editing={editor.active}>
  {#if editor.active}
    <EditBar />
  {:else}
    <Header />
  {/if}
  {#each floors as floor (floor.key)}
    <h2 class="floor-band">{floor.name ?? t("app.otherFloor")}</h2>
    <div class="floor-grid">
      {#each floor.rooms as card (card.room.area.area_id)}
        <div
          class="grid-item"
          data-card={card.room.area.area_id}
          data-group={floor.key}
          style:grid-column="span {card.size.w}"
          style:grid-row="span {card.size.h}"
        >
          <RoomSection
            room={card.room}
            size={card.size}
            items={card.items}
            edit={editor.active
              ? {
                  size: card.sizeName,
                  cycleSize: () => editor.cycleSize(card.room.area.area_id),
                  drag: (e: PointerEvent) => startDrag(e, card.room.area.area_id),
                }
              : undefined}
          />
        </div>
      {/each}
    </div>
  {/each}
</main>
