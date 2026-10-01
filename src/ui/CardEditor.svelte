<script lang="ts">
  import { mdiCheck, mdiChevronDown, mdiDrag } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import { CARD_SIZES, type CardSize } from "../layout/homeLayout";
  import type { Size } from "../layout/pack";
  import { CARD_CELLS, cardRows } from "../model/roomCard";
  import { formatNumber } from "./format";
  import Icon from "./Icon.svelte";

  /**
   * Edit mode over a room card (LAYOUTS.md, "Edit mode"): an outline, a size chip that opens a menu of every size,
   * and a drag handle. It sits in the card's grid cell, outside the card, so the menu isn't clipped by the card's
   * `contain`. A mouse can drag from anywhere on it; touch uses the handle, so the rest still scrolls the page.
   */
  let {
    size,
    sizeName,
    name,
    onSize,
    onDrag,
  }: {
    /** The card's size in cells, as shown. */
    size: Size;
    sizeName: CardSize;
    /** The room's name, for screen readers. */
    name: string;
    onSize: (size: CardSize) => void;
    onDrag: (e: PointerEvent) => void;
  } = $props();

  let open = $state(false);
  let root: HTMLDivElement;

  $effect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.querySelector(".size-picker")!.contains(e.target as Node)) open = false;
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && (open = false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  });

  function drag(e: PointerEvent) {
    open = false;
    onDrag(e);
  }

  function mouseDrag(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button === 0 && !(e.target as Element).closest("button, .size-menu")) drag(e);
  }

  function pick(s: CardSize) {
    open = false;
    if (s !== sizeName) onSize(s);
  }

  const cells = (s: CardSize) => `${CARD_CELLS[s].w} × ${formatNumber(CARD_CELLS[s].h)}`;
</script>

<div
  class="card-edit"
  role="presentation"
  style:--card-rows={cardRows(size)}
  onpointerdown={mouseDrag}
  bind:this={root}
>
  <div class="size-picker">
    <button
      class="size-chip"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t("edit.sizeOf", { name, size: t(`edit.sizes.${sizeName}`) })}
      onclick={() => (open = !open)}
    >
      {t(`edit.sizes.${sizeName}`)}
      <Icon path={mdiChevronDown} size={14} />
    </button>
    {#if open}
      <div class="size-menu" role="menu">
        {#each CARD_SIZES as s (s)}
          <button class="size-option" role="menuitemradio" aria-checked={s === sizeName} onclick={() => pick(s)}>
            <span class="size-glyph-box">
              <span
                class="size-glyph"
                style:width="calc({CARD_CELLS[s].w} * 0.28rem)"
                style:height="calc({CARD_CELLS[s].h} * 0.28rem)"
              ></span>
            </span>
            <span class="size-name">{t(`edit.sizes.${s}`)}</span>
            <span class="size-cells">{cells(s)}</span>
            <span class="size-check">
              {#if s === sizeName}<Icon path={mdiCheck} size={16} />{/if}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <button class="round-btn drag-handle" aria-label={t("edit.move", { name })} onpointerdown={drag}>
    <Icon path={mdiDrag} />
  </button>
</div>
