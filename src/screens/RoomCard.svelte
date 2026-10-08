<script lang="ts">
  import { mdiChevronRight } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import BoardCard from "../layout/BoardCard.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import type { Size } from "../layout/pack";
  import type { Room } from "../model/home";
  import type { CardItem } from "../model/roomCard";
  import { navigate } from "../router.svelte";
  import EntityTile from "../ui/EntityTile.svelte";
  import LightsTile from "../ui/LightsTile.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";

  /**
   * A room on the home screen: a card of `size` cells (LAYOUTS.md, "Room cards"): a title band that opens the
   * room, then up to three rows of its controls below it (see roomCardItems): its own list, or the generated one.
   * While `editing`, the card's own controls don't react (the edit overlay is ui/CardEditor.svelte).
   */
  let {
    room,
    name,
    size,
    items,
    editing = false,
  }: { room: Room; name: string; size: Size; items: CardItem[]; editing?: boolean } = $props();

  watchEntities(() => [room.temperature, room.humidity]);
  const temperature = $derived(home.entity(room.temperature));
  const humidity = $derived(home.entity(room.humidity));
  const open = () => navigate(`/room/${room.area.area_id}`);
</script>

{#snippet climate()}
  {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
  {#if humidity}<span class="room-humidity">{formatHumidity(humidity)}</span>{/if}
{/snippet}

<BoardCard {size} {name} onOpen={open} extra={climate} inert={editing}>
  {#each items as item (item.kind === "more" ? "+more" : item.id)}
    <GridItem size={item.size}>
      {#if item.kind === "lights"}
        <LightsTile {room} />
      {:else if item.kind !== "more"}
        <EntityTile entityId={item.id} area={room.area} />
      {:else}
        <button class="card-more" onclick={open}>
          <span class="tile-chip">+{item.count}</span>
          <span class="card-tile-name">{t("home.more", { count: item.count })}</span>
          <Icon path={mdiChevronRight} size={22} />
        </button>
      {/if}
    </GridItem>
  {/each}
</BoardCard>
