<script lang="ts">
  import { mdiDragHorizontalVariant } from "@mdi/js";
  import type { Snippet } from "svelte";
  import { t } from "../i18n/index.svelte";
  import type { Size } from "../layout/pack";
  import { cardRows } from "../model/roomCard";
  import Icon from "./Icon.svelte";

  /**
   * Edit mode over a card on a board (LAYOUTS.md, "Edit mode"). The title band is the card's drag handle, and a tap
   * selects the card: anywhere on it (`pickAll`, Home's rooms), or on its title only, when its tiles have edit
   * controls of their own (a room screen's sections). Selected, it's outlined; what's changed about it is in the dock
   * at the bottom (ui/EditDock.svelte). A mouse can drag the card from anywhere but its buttons; touch uses the title
   * band, so the rest still scrolls. `bar` adds to the title band (a menu), `children` go over the card.
   */
  let {
    name,
    size,
    selected,
    pickAll = true,
    barOpen = false,
    onSelect,
    onDrag,
    bar,
    children,
  }: {
    name: string;
    /** The card's size in cells, as shown. */
    size: Size;
    selected: boolean;
    pickAll?: boolean;
    /** A menu in the title band is open: the band goes above every other card's. */
    barOpen?: boolean;
    onSelect: () => void;
    onDrag: (e: PointerEvent) => void;
    bar?: Snippet;
    children?: Snippet;
  } = $props();

  /**
   * Drag the card once the pointer has moved a little, so a tap still selects it: dragging takes the card out of
   * hit-testing, and the tap's click would miss it.
   */
  function press(e: PointerEvent) {
    if (e.button !== 0) return;
    const pointer = e.pointerId;
    const stop = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", stop);
      removeEventListener("pointercancel", stop);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer || Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 8) return;
      stop();
      onDrag(e);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", stop);
    addEventListener("pointercancel", stop);
  }

  // A mouse drags the card from anywhere but its slots and buttons; touch only by the title band (see above).
  function pointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && pickAll && !(e.target as Element).closest("button:not(.card-pick, .card-drag), .slot-menu, .slot-edit")) press(e);
  }

  function select() {
    if (!selected) onSelect();
  }
</script>

<div
  class="card-edit"
  class:selected
  class:title-only={!pickAll}
  role="presentation"
  style:--card-rows={cardRows(size)}
  style:--card-w={size.w}
  onpointerdown={pointerDown}
>
  {#if !selected && pickAll}
    <button class="card-pick" aria-label={t("edit.pick", { name })} onclick={select}></button>
  {/if}
  <div class="card-edit-bar" class:open={barOpen}>
    <!-- The title band is the drag handle (touch drags only here, so the rest of the card scrolls the page). -->
    <button
      class="card-drag"
      aria-label={t("edit.move", { name })}
      onpointerdown={(e) => (e.pointerType !== "mouse" || !pickAll) && press(e)}
      onclick={select}
    >
      <!-- On a narrow card the grip would cover the name: the whole band still drags. -->
      {#if selected && size.w >= 4}<Icon path={mdiDragHorizontalVariant} size={18} />{/if}
    </button>
    {@render bar?.()}
  </div>
  {@render children?.()}
</div>
