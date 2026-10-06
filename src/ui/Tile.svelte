<script lang="ts">
  import Icon from "./Icon.svelte";
  import Ring from "./Ring.svelte";

  /**
   * A 1×1 tile on a room card (LAYOUTS.md, "Room cards"): the icon in a round chip at the top left, a ring at the top
   * right for a level, the name and state at the bottom. It's split: the chip does the main thing (switch on or off),
   * the rest of the tile opens the pop-up. While on, only the chip takes a colour (`tint`, a class in app.css) and
   * the name brightens; the tile itself keeps its colour.
   */
  let {
    icon,
    name,
    state,
    active,
    tint,
    ring,
    unavailable = false,
    pending = false,
    chipLabel,
    bodyLabel,
    onChip,
    onBody,
  }: {
    icon: string;
    name: string;
    state: string;
    active: boolean;
    tint: string;
    ring?: { value: number; label: string };
    unavailable?: boolean;
    /** A command is waiting for HA (ui/pending.svelte.ts): a spinner around the chip. */
    pending?: boolean;
    chipLabel: string;
    bodyLabel: string;
    onChip: () => void;
    onBody: () => void;
  } = $props();
</script>

<div class="card-tile {tint}" class:on={active} class:unavailable>
  <button class="card-tile-body" aria-label={bodyLabel} onclick={onBody}>
    {#if ring}<Ring value={ring.value} label={ring.label} />{/if}
    <span class="card-tile-name">{name}</span>
    <span class="card-tile-state">{state}</span>
  </button>
  <button class="tile-chip" class:pending aria-label={chipLabel} aria-pressed={active} disabled={unavailable} onclick={onChip}>
    <Icon path={icon} size={22} />
  </button>
</div>
