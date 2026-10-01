<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import SectionColumns from "../layout/SectionColumns.svelte";
  import type { Room } from "../model/home";
  import { homeModel } from "../model/model.svelte";
  import { CARD_HEIGHT, roomCardItems, type CardItem } from "../model/roomCard";
  import Header from "../ui/Header.svelte";
  import RoomSection from "./RoomSection.svelte";

  // Each floor is a full-width heading; its rooms are sections, packed into columns under it.
  const floors = $derived(
    homeModel().map((group) => ({
      key: group.floor?.floor_id ?? "_none",
      name: group.floor?.name,
      rooms: group.rooms.map((room) => ({ room, items: roomCardItems(room) })),
    })),
  );

  type Card = { room: Room; items: CardItem[] };
</script>

{#snippet roomSection(card: Card)}
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
