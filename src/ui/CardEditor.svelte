<script lang="ts">
  import {
    mdiCheck,
    mdiCheckboxBlankOutline,
    mdiCheckboxMarked,
    mdiClose,
    mdiLightbulbGroupOutline,
    mdiPlus,
  } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { t } from "../i18n/index.svelte";
  import { dragItem } from "../layout/drag";
  import { roomNameOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { GAP, grid } from "../layout/grid.svelte";
  import { densePlaces, type Size } from "../layout/pack";
  import { SIZES } from "../layout/sizes";
  import { entityName, type Room } from "../model/home";
  import {
    cardRows,
    ownControls,
    ROOM_LIGHTS,
    slotChoices,
    type CardItem,
    type Control,
  } from "../model/roomCard";
  import CardFrame from "./CardFrame.svelte";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  /**
   * Edit mode over a room card on Home (LAYOUTS.md, "Edit mode"): selecting and dragging it is ui/CardFrame.svelte,
   * its size, row and hiding are in the dock at the bottom (ui/EditDock.svelte). Only the selected card shows its
   * slots: each one is dragged to move it, tapped to swap it for another and has a × that removes it; one "+" adds a
   * control. The first change gives the card its own list, starting from what it showed. It sits in the card's grid
   * cell, outside the card, so the menus aren't clipped by the card's `contain`.
   */
  let {
    size,
    room,
    items,
    slots,
    selected,
    onSelect,
    onDrag,
    onSlots,
  }: {
    /** The card's size in cells, as shown. */
    size: Size;
    room: Room;
    /** What the card shows. */
    items: CardItem[];
    /** The card's own list, or undefined while it shows the generated controls. */
    slots: string[] | undefined;
    selected: boolean;
    onSelect: () => void;
    onDrag: (e: PointerEvent) => void;
    /** A new list of controls for the card, or undefined for the generated ones again. */
    onSlots: (slots: string[] | undefined) => void;
  } = $props();

  const name = $derived(roomNameOf(editor.layout, room.area));
  // The list being edited: the card's own, or the generated controls it shows now.
  const list = $derived(slots ? ownControls(room, slots).map((c) => c.id) : items.flatMap((i) => (i.kind === "more" ? [] : [i.id])));
  const shown = $derived(items.filter((i): i is Control => i.kind !== "more"));
  const more = $derived(items.find((i) => i.kind === "more"));
  const cellsOf = (s: Size) => Math.min(s.w, size.w) * s.h;
  /** Whether a cell is left free, for the "+". */
  const free = $derived(!more && size.w * cardRows(size) > shown.reduce((n, i) => n + cellsOf(i.size), 0));

  let menu = $state<"slots" | null>(null);
  /** The slot the controls menu swaps; null: the menu adds and removes. */
  let swapping = $state<string | null>(null);
  let anchor = $state<HTMLDivElement>();
  let slotGrid = $state<HTMLDivElement>(); // only while selected

  // A card that's no longer selected closes its menu.
  $effect(() => {
    if (!selected) menu = null;
  });

  $effect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!anchor?.contains(e.target as Node)) menu = null;
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && (menu = null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  });

  // Controls not on the card aren't watched: their state comes from the one loaded at start.
  const stateOf = (id: string) => home.entity(id) ?? home.catalog[id];

  function label(id: string) {
    if (id === ROOM_LIGHTS) return t("home.roomLights");
    return entityName(stateOf(id), home.registry[id], room.area);
  }

  function icon(id: string) {
    const s = stateOf(id);
    return id === ROOM_LIGHTS || !s ? mdiLightbulbGroupOutline : entityIcon(s);
  }

  function openMenu(swap: string | null) {
    swapping = swap;
    menu = "slots";
  }

  function remove(id: string) {
    onSlots(list.filter((x) => x !== id));
  }

  /** In the controls menu: add or remove a control, or put it in the place of the one being swapped. */
  function pick(id: string) {
    if (!swapping) {
      onSlots(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
      return;
    }
    if (id !== swapping) {
      // A control that's already on the card trades places with the swapped one.
      const next = list.map((x) => (x === swapping ? id : x === id ? swapping! : x));
      onSlots(next);
    }
    menu = null;
  }

  function automatic() {
    menu = null;
    onSlots(undefined);
  }

  /** A tap on a slot swaps it; moving the pointer first drags it. */
  function slotDown(e: PointerEvent, id: string) {
    if (e.button !== 0 || (e.target as Element).closest(".slot-remove")) return;
    const el = e.currentTarget as HTMLElement;
    const pointer = e.pointerId;
    const stop = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", up);
      removeEventListener("pointercancel", stop);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer || Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 8) return;
      stop();
      dragSlot(e, el, id);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return;
      stop();
      openMenu(id);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", up);
    addEventListener("pointercancel", stop);
  }

  /**
   * Drag a slot among the ones shown: when its middle is over another control, it takes that control's place in
   * the list; over a free cell, it goes last of the ones shown. The card re-flows as it goes.
   */
  function dragSlot(e: PointerEvent, el: HTMLElement, id: string) {
    if (!slotGrid) return;
    const container = slotGrid;
    menu = null;
    const gap = grid.cell * GAP;
    const rows = cardRows(size);
    const box = container.getBoundingClientRect();
    // The slot grid has the gap as padding at the top and sides (see .room-grid): a column and a gap, a row and a gap.
    const pitchX = (box.width - gap) / size.w;
    const pitchY = box.height / rows;
    const half = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
    dragItem(
      e,
      el,
      container,
      (left, top) => {
        const x = Math.max(0, Math.min(size.w - 1, Math.floor((left + half.x - gap) / pitchX)));
        const y = Math.max(0, Math.min(rows - 1, Math.floor((top + half.y - gap) / pitchY)));
        const places = densePlaces(shown.map((i) => i.size), size.w);
        const under = shown.findIndex((item, i) => {
          const p = places[i];
          return x >= p.x && x < p.x + Math.min(item.size.w, size.w) && y >= p.y && y < p.y + item.size.h;
        });
        const target = shown[under >= 0 ? under : shown.length - 1]?.id;
        if (!target || target === id) return false;
        const next = list.filter((x) => x !== id);
        next.splice(list.indexOf(target), 0, id);
        onSlots(next);
        return true;
      },
      () => {},
    );
  }
</script>

{#snippet slotsMenu()}
  <div class="menu-anchor" data-menu="slots" bind:this={anchor}>
    {#if menu === "slots"}
      {@const choices = slotChoices(room)}
      <div class="slot-menu" role="menu">
        <div class="menu-label">
          {swapping ? t("edit.replaceControl", { name: label(swapping) }) : t("edit.controlsOf", { name })}
        </div>
        {#each choices as id (id)}
          {@const on = list.includes(id)}
          <button
            class="slot-option"
            role={swapping ? "menuitemradio" : "menuitemcheckbox"}
            aria-checked={swapping ? id === swapping : on}
            onclick={() => pick(id)}
          >
            {#if !swapping}
              <Icon path={on ? mdiCheckboxMarked : mdiCheckboxBlankOutline} size={20} />
            {/if}
            <Icon path={icon(id)} size={20} />
            <span class="slot-option-name">{label(id)}</span>
            {#if on && !shown.some((i) => i.id === id)}
              <span class="slot-option-note">{t("edit.doesntFit")}</span>
            {/if}
            {#if swapping && id === swapping}
              <span class="size-check"><Icon path={mdiCheck} size={16} /></span>
            {/if}
          </button>
        {:else}
          <p class="slot-option-note">{t("edit.noControls")}</p>
        {/each}
        {#if slots}
          <button class="slot-option automatic" onclick={automatic}>{t("edit.automatic")}</button>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<CardFrame
  {name}
  {size}
  {selected}
  barOpen={!!menu}
  {onSelect}
  onDrag={(e) => {
    menu = null;
    onDrag(e);
  }}
  bar={slotsMenu}
>
  {#if selected}
    <div class="slot-grid" bind:this={slotGrid}>
      {#each shown as item (item.id)}
        <div
          class="slot-edit"
          role="button"
          tabindex="0"
          aria-label={t("edit.replaceControl", { name: label(item.id) })}
          style:grid-column="span {Math.min(item.size.w, size.w)}"
          style:grid-row="span {item.size.h}"
          onpointerdown={(e) => slotDown(e, item.id)}
          onkeydown={(e) => (e.key === "Enter" || e.key === " ") && openMenu(item.id)}
        >
          <span class="mini-icon"><Icon path={icon(item.id)} size={20} /></span>
          <span class="mini-name">{label(item.id)}</span>
          <button class="slot-remove" aria-label={t("edit.removeControl", { name: label(item.id) })} onclick={() => remove(item.id)}>
            <Icon path={mdiClose} size={14} />
          </button>
        </div>
      {/each}
      {#if more?.kind === "more"}
        <button class="slot-more" style:grid-column="span {Math.min(SIZES.more.w, size.w)}" aria-label={t("edit.addControl", { name })} onclick={() => openMenu(null)}>
          +{more.count}
        </button>
      {/if}
      {#if free}
        <button class="slot-free" style:grid-column="span {Math.min(SIZES.tile.w, size.w)}" aria-label={t("edit.addControl", { name })} onclick={() => openMenu(null)}>
          <Icon path={mdiPlus} size={20} />
        </button>
      {/if}
    </div>
  {/if}
</CardFrame>
