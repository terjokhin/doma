<script lang="ts">
  import { mdiChevronRight } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import type { Room } from "../model/home";
  import type { CardItem } from "../model/roomCard";
  import { navigate } from "../router.svelte";
  import ClimateCompact from "../ui/ClimateCompact.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";
  import SensorButton from "../ui/SensorButton.svelte";
  import ToggleButton from "../ui/ToggleButton.svelte";

  /**
   * A room on the home screen: a card of fixed size (LAYOUTS.md, "Room cards") with a title band that opens
   * the room, then up to 2 rows of its controls (see roomCardItems).
   */
  let { room, items }: { room: Room; items: CardItem[] } = $props();

  watchEntities(() => [room.temperature, room.humidity]);
  const temperature = $derived(home.entity(room.temperature));
  const humidity = $derived(home.entity(room.humidity));
  const open = () => navigate(`/room/${room.area.area_id}`);
</script>

<section class="room-card">
  <button class="room-title" onclick={open}>
    <span class="room-name">{room.area.name}</span>
    <span class="room-climate">
      {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
      {#if humidity}<span>{formatHumidity(humidity)}</span>{/if}
    </span>
    <Icon path={mdiChevronRight} size={22} />
  </button>
  <div class="room-grid">
    {#each items as item (item.kind === "more" ? "+more" : item.id)}
      <GridItem size={item.size}>
        {#if item.kind === "toggle"}
          <ToggleButton entityId={item.id} area={room.area} />
        {:else if item.kind === "sensor"}
          <SensorButton entityId={item.id} area={room.area} />
        {:else if item.kind === "climate"}
          <ClimateCompact entityId={item.id} area={room.area} />
        {:else}
          <button class="mini more" aria-label={t("home.more", { count: item.count })} onclick={open}>
            +{item.count}
          </button>
        {/if}
      </GridItem>
    {/each}
  </div>
</section>
