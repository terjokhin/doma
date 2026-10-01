<script lang="ts">
  import { mdiChevronRight, mdiDrag } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import type { CardSize } from "../layout/homeLayout";
  import type { Size } from "../layout/pack";
  import type { Room } from "../model/home";
  import type { CardItem } from "../model/roomCard";
  import { navigate } from "../router.svelte";
  import ClimateCompact from "../ui/ClimateCompact.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";
  import ToggleButton from "../ui/ToggleButton.svelte";

  /**
   * A room on the home screen: a card of `size` cells (LAYOUTS.md, "Room cards"), its top row a title band that
   * opens the room, each row below a row of its controls (see roomCardItems).
   * With `edit` (LAYOUTS.md, "Edit mode") the card's own controls don't react; an overlay shows its size chip
   * and a drag handle instead. A mouse can drag the card from anywhere on it; touch uses the handle, so the rest
   * of the card still scrolls the page.
   */
  let {
    room,
    size,
    items,
    edit,
  }: {
    room: Room;
    size: Size;
    items: CardItem[];
    edit?: { size: CardSize; cycleSize: () => void; drag: (e: PointerEvent) => void };
  } = $props();

  function mouseDrag(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button === 0 && !(e.target as Element).closest("button")) edit?.drag(e);
  }

  watchEntities(() => [room.temperature, room.humidity]);
  const temperature = $derived(home.entity(room.temperature));
  const humidity = $derived(home.entity(room.humidity));
  const open = () => navigate(`/room/${room.area.area_id}`);
</script>

<section class="room-card" class:narrow={size.w < 4} style:--card-w={size.w} style:--card-rows={size.h - 1}>
  <button class="room-title" onclick={open} inert={!!edit}>
    <span class="room-label">
      <span class="room-name">{room.area.name}</span>
      <span class="room-climate">
        {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
        {#if humidity}<span>{formatHumidity(humidity)}</span>{/if}
      </span>
    </span>
    <Icon path={mdiChevronRight} size={22} />
  </button>
  <div class="room-grid" inert={!!edit}>
    {#each items as item (item.kind === "more" ? "+more" : item.id)}
      <GridItem size={item.size}>
        {#if item.kind === "toggle"}
          <ToggleButton entityId={item.id} area={room.area} />
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
  {#if edit}
    <div class="card-edit" role="presentation" onpointerdown={mouseDrag}>
      <button
        class="chip size-chip"
        aria-label={t("edit.sizeOf", { name: room.area.name, size: t(`edit.sizes.${edit.size}`) })}
        onclick={edit.cycleSize}
      >
        {t(`edit.sizes.${edit.size}`)}
      </button>
      <button class="round-btn drag-handle" aria-label={t("edit.move", { name: room.area.name })} onpointerdown={edit.drag}>
        <Icon path={mdiDrag} />
      </button>
    </div>
  {/if}
</section>
