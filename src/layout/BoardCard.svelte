<script lang="ts">
  import type { Snippet } from "svelte";
  import { cardRows } from "../model/roomCard";
  import type { Size } from "./pack";

  /**
   * A card on a board (LAYOUTS.md, "Room cards"), with no box of its own: a title band of half a cell, then rows of
   * slim tiles, each three quarters of a cell. The band shows the `name`, what follows it (`extra`, e.g. a room's
   * temperature) and an `action` at the right (e.g. "All off"); with `onOpen`, tapping the name opens what the card is
   * about. `children` are the tiles, each in a GridItem.
   */
  let {
    size,
    name,
    onOpen,
    extra,
    action,
    muted = false,
    inert = false,
    children,
  }: {
    /** In cells, as shown. */
    size: Size;
    name: string;
    onOpen?: () => void;
    extra?: Snippet;
    action?: Snippet;
    /** Hidden, shown only in edit mode to show it again: the name is struck through. */
    muted?: boolean;
    /** The tiles don't react (edit mode). */
    inert?: boolean;
    children?: Snippet;
  } = $props();
</script>

{#snippet label()}
  <span class="room-label">
    <span class="room-name" class:muted>{name}</span>
    {#if extra}<span class="room-climate">{@render extra()}</span>{/if}
  </span>
{/snippet}

<section class="room-card" style:--card-w={size.w} style:--card-rows={cardRows(size)}>
  <div class="room-head">
    {#if onOpen}
      <button class="room-title" onclick={onOpen} {inert}>{@render label()}</button>
    {:else}
      <div class="room-title">{@render label()}</div>
    {/if}
    {#if action}<div class="room-action" {inert}>{@render action()}</div>{/if}
  </div>
  <div class="room-grid" {inert}>
    {@render children?.()}
  </div>
</section>
