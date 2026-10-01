<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import { houseLayout } from "../layout/layoutStore.svelte";
  import SectionColumns from "../layout/SectionColumns.svelte";
  import { homeView, type RoomCardView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import { CARD_HEIGHT } from "../model/roomCard";
  import Header from "../ui/Header.svelte";
  import RoomSection from "./RoomSection.svelte";

  // Each floor is a full-width heading; its rooms are cards, packed into columns under it,
  // as the house layout orders and configures them.
  const floors = $derived(homeView(homeModel(), houseLayout()));
</script>

{#snippet roomSection(card: RoomCardView)}
  <RoomSection room={card.room} items={card.items} />
{/snippet}

<main class="screen">
  <Header />
  {#each floors as floor (floor.key)}
    <h2 class="floor-band">{floor.name ?? t("app.otherFloor")}</h2>
    <SectionColumns
      sections={floor.rooms}
      key={(c) => c.room.area.area_id}
      height={() => CARD_HEIGHT}
      section={roomSection}
    />
  {/each}
</main>
