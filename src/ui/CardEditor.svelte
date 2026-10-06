<script lang="ts">
  import {
    mdiCheck,
    mdiCheckboxBlankOutline,
    mdiCheckboxMarked,
    mdiClose,
    mdiDotsHorizontal,
    mdiDragHorizontalVariant,
    mdiEyeOffOutline,
    mdiLightbulbGroupOutline,
    mdiPlus,
  } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { t } from "../i18n/index.svelte";
  import { dragItem } from "../layout/drag";
  import { GAP, grid } from "../layout/grid.svelte";
  import { CARD_SIZES, type CardSize } from "../layout/homeLayout";
  import { densePlaces, type Size } from "../layout/pack";
  import { entityName, type Room } from "../model/home";
  import {
    CARD_CELLS,
    cardRows,
    ownControls,
    ROOM_LIGHTS,
    slotChoices,
    type CardItem,
    type Control,
  } from "../model/roomCard";
  import { formatNumber } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  /**
   * Edit mode over a room card (LAYOUTS.md, "Edit mode"). The title band is the drag handle; at its right, one chip
   * with the card's size opens its menu: the sizes, "Add a control" and "Hide room". Over the controls, the card's
   * slots: each one is dragged to move it, tapped to swap it for another and has a × that removes it; free cells
   * show a "+". The first change gives the card its own list, starting from what it showed. It sits in the card's
   * grid cell, outside the card, so the menus aren't clipped by the card's `contain`. A mouse can drag the card from
   * anywhere but the slots; touch uses the title band, so the rest still scrolls the page.
   */
  let {
    size,
    sizeName,
    room,
    items,
    slots,
    onSize,
    onDrag,
    onSlots,
    onHide,
  }: {
    /** The card's size in cells, as shown. */
    size: Size;
    sizeName: CardSize;
    room: Room;
    /** What the card shows. */
    items: CardItem[];
    /** The card's own list, or undefined while it shows the generated controls. */
    slots: string[] | undefined;
    onSize: (size: CardSize) => void;
    onDrag: (e: PointerEvent) => void;
    /** A new list of controls for the card, or undefined for the generated ones again. */
    onSlots: (slots: string[] | undefined) => void;
    onHide: () => void;
  } = $props();

  const name = $derived(room.area.name);
  // The list being edited: the card's own, or the generated controls it shows now.
  const list = $derived(slots ? ownControls(room, slots).map((c) => c.id) : items.flatMap((i) => (i.kind === "more" ? [] : [i.id])));
  const shown = $derived(items.filter((i): i is Control => i.kind !== "more"));
  const more = $derived(items.find((i) => i.kind === "more"));
  const cellsOf = (s: Size) => Math.min(s.w, size.w) * s.h;
  /** Cells the controls leave free, each a "+". */
  const free = $derived(more ? 0 : size.w * cardRows(size) - shown.reduce((n, i) => n + cellsOf(i.size), 0));

  let menu = $state<"card" | "slots" | null>(null);
  /** The slot the controls menu swaps; null: the menu adds and removes. */
  let swapping = $state<string | null>(null);
  let root: HTMLDivElement;
  let slotGrid: HTMLDivElement;

  $effect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!root.querySelector(`[data-menu="${menu}"]`)?.contains(e.target as Node)) menu = null;
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && (menu = null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  });

  function drag(e: PointerEvent) {
    menu = null;
    onDrag(e);
  }

  function mouseDrag(e: PointerEvent) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (!(e.target as Element).closest("button, .slot-menu, .slot-edit")) drag(e);
  }

  function pickSize(s: CardSize) {
    menu = null;
    if (s !== sizeName) onSize(s);
  }

  // "Full" is as wide as the screen: no number of cells, and a glyph as wide as the widest other one.
  const cells = (s: CardSize) => (s === "full" ? t("edit.wholeRow") : `${CARD_CELLS[s].w} × ${formatNumber(CARD_CELLS[s].h)}`);
  const glyphWidth = (s: CardSize) => Math.min(CARD_CELLS[s].w, 10);

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
    menu = null;
    const gap = grid.cell * GAP;
    const rows = cardRows(size);
    const box = slotGrid.getBoundingClientRect();
    // The slot grid has the gap as padding at the top and sides (see .room-grid): a column and a gap, a row and a gap.
    const pitchX = (box.width - gap) / size.w;
    const pitchY = box.height / rows;
    const half = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
    dragItem(
      e,
      el,
      slotGrid,
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

<div
  class="card-edit"
  role="presentation"
  style:--card-rows={cardRows(size)}
  style:--card-w={size.w}
  onpointerdown={mouseDrag}
  bind:this={root}
>
  <div class="card-edit-bar" class:open={menu}>
    <!-- The title band is the drag handle (touch drags only here, so the rest of the card scrolls the page). -->
    <button class="card-drag" aria-label={t("edit.move", { name })} onpointerdown={drag}>
      <!-- On a narrow card the grip would cover the name: the whole band still drags. -->
      {#if size.w >= 4}<Icon path={mdiDragHorizontalVariant} size={18} />{/if}
    </button>
    <div class="menu-anchor" data-menu="card">
      <button
        class="size-chip"
        aria-haspopup="menu"
        aria-expanded={menu === "card"}
        aria-label={t("edit.cardMenu", { name, size: t(`edit.sizes.${sizeName}`) })}
        onclick={() => (menu = menu === "card" ? null : "card")}
      >
        {t(`edit.sizes.${sizeName}`)}
        <Icon path={mdiDotsHorizontal} size={16} />
      </button>
      {#if menu === "card"}
        <div class="slot-menu card-menu" role="menu">
          <div class="menu-label">{t("edit.size")}</div>
          {#each CARD_SIZES as s (s)}
            <button class="size-option" role="menuitemradio" aria-checked={s === sizeName} onclick={() => pickSize(s)}>
              <span class="size-glyph-box">
                <span
                  class="size-glyph"
                  style:width="calc({glyphWidth(s)} * 0.28rem)"
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
          <div class="menu-sep"></div>
          <button class="slot-option" role="menuitem" onclick={() => openMenu(null)}>
            <Icon path={mdiPlus} size={20} />
            <span class="slot-option-name">{t("edit.addControlItem")}</span>
          </button>
          <button
            class="slot-option"
            role="menuitem"
            onclick={() => {
              menu = null;
              onHide();
            }}
          >
            <Icon path={mdiEyeOffOutline} size={20} />
            <span class="slot-option-name">{t("edit.hideRoomItem")}</span>
          </button>
        </div>
      {/if}
      {#if menu === "slots"}
        {@const choices = slotChoices(room)}
        <div class="slot-menu" role="menu" data-menu="slots">
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
  </div>

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
      <button class="slot-more" aria-label={t("edit.addControl", { name })} onclick={() => openMenu(null)}>
        +{more.count}
      </button>
    {/if}
    {#each { length: free } as _, i (i)}
      <button class="slot-free" aria-label={t("edit.addControl", { name })} onclick={() => openMenu(null)}>
        <Icon path={mdiPlus} size={20} />
      </button>
    {/each}
  </div>
</div>
