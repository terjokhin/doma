<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import { homeModel } from "../model/model.svelte";
  import Header from "../ui/Header.svelte";
  import RoomCard from "./RoomCard.svelte";
</script>

<main class="screen">
  <Header />
  {#each homeModel() as group (group.floor?.floor_id ?? "_none")}
    <section class="floor">
      <h2 class="floor-title">{group.floor?.name ?? t("app.otherFloor")}</h2>
      <div class="grid">
        {#each group.rooms as room (room.area.area_id)}
          <RoomCard {room} />
        {/each}
      </div>
    </section>
  {/each}
</main>
