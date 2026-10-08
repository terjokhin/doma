<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import { Dimmer } from "./dim.svelte";
  import Icon from "./Icon.svelte";

  /**
   * A tile on a room card (LAYOUTS.md, "Room cards"): slim and long, two cells wide. The icon in a round chip at the
   * left, then the name and state, and at the right a thermostat's target. It's split: the chip does the main thing
   * (switch on or off), the rest of the tile opens the pop-up. While on, only the chip takes a colour (`tint`, a class
   * in app.css) and the name brightens; a dimmable light's tile also fills from the left to its brightness, and
   * dragging across it dims the light (ui/dim.svelte.ts). A reading (a sensor, a device's battery) has neither: without
   * `onChip` and `onBody` the tile only shows, and `active` marks what needs a look.
   */
  let {
    icon,
    name,
    state,
    active,
    tint,
    level,
    value,
    unavailable = false,
    pending = false,
    chipLabel,
    bodyLabel,
    onChip,
    onBody,
    onLevel,
  }: {
    icon: string;
    name: string;
    state: string;
    active: boolean;
    tint: string;
    /** A dimmable light's brightness in %, while on: the tile fills to it. */
    level?: number;
    /** At the right: a thermostat's target. */
    value?: string;
    unavailable?: boolean;
    /** A command is waiting for HA (ui/pending.svelte.ts): a spinner around the chip. */
    pending?: boolean;
    chipLabel?: string;
    bodyLabel?: string;
    onChip?: () => void;
    onBody?: () => void;
    /** A new brightness in %, dragged to across the tile; 0 switches the light off. */
    onLevel?: (percent: number) => void;
  } = $props();

  const dimmer = new Dimmer(
    () => (active ? (level ?? 0) : 0),
    (percent) => onLevel?.(percent),
  );
  // A new state from HA replaces what was asked for.
  $effect(() => {
    void level;
    void active;
    dimmer.reset();
  });

  const dims = $derived(level !== undefined && !!onLevel && !unavailable);
  /** While dragging, and until HA answers, the tile shows the brightness asked for. */
  const asked = $derived(dimmer.dragging ?? dimmer.sent);
  const on = $derived(asked === null ? active : asked > 0);
  const shownState = $derived(asked === null ? state : asked > 0 ? `${asked}%` : t("state.off"));

  function body() {
    if (!dimmer.dragged()) onBody?.();
  }
</script>

<div class="card-tile {tint}" class:on class:unavailable class:dimming={dimmer.dragging !== null}>
  {#if level !== undefined}
    <span class="card-tile-fill" style:transform="scaleX({dimmer.shown / 100})"></span>
  {/if}
  {#snippet text()}
    <span class="card-tile-text">
      <span class="card-tile-name">{name}</span>
      <span class="card-tile-state">{shownState}</span>
    </span>
    {#if value}<span class="card-tile-value">{value}</span>{/if}
  {/snippet}
  {#if onBody}
    <button
      class="card-tile-body"
      class:dims
      aria-label={bodyLabel}
      onclick={body}
      onpointerdown={dims ? dimmer.down : undefined}
      onpointermove={dims ? dimmer.move : undefined}
      onpointerup={dims ? dimmer.up : undefined}
      onpointercancel={dims ? dimmer.cancel : undefined}
    >
      {@render text()}
    </button>
  {:else}
    <div class="card-tile-body">{@render text()}</div>
  {/if}
  {#if onChip}
    <button class="tile-chip" class:pending aria-label={chipLabel} aria-pressed={on} disabled={unavailable} onclick={onChip}>
      <Icon path={icon} size={22} />
    </button>
  {:else}
    <span class="tile-chip"><Icon path={icon} size={22} /></span>
  {/if}
</div>
