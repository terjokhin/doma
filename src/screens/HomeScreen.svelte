<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import { grid } from "../layout/grid.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { homeView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import Header from "../ui/Header.svelte";
  import RoomSection from "./RoomSection.svelte";

  // Each floor is a full-width heading; its room cards fill one cell grid under it, in the order and at the
  // sizes the home layout gives (LAYOUTS.md, "The floor grid").
  const floors = $derived(homeView(homeModel(), homeLayout(), grid.cols));
</script>

<main class="screen">
  <Header />
  {#each floors as floor (floor.key)}
    <h2 class="floor-band">{floor.name ?? t("app.otherFloor")}</h2>
    <div class="floor-grid">
      {#each floor.rooms as card (card.room.area.area_id)}
        <GridItem size={card.size}>
          <RoomSection room={card.room} size={card.size} items={card.items} />
        </GridItem>
      {/each}
    </div>
  {/each}
</main>
