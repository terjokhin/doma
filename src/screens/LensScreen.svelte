<script lang="ts">
  import { mdiViewDashboardEditOutline } from "@mdi/js";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import Board from "../layout/Board.svelte";
  import { boardView, sameSize, type BoardItem } from "../layout/board";
  import BoardCard from "../layout/BoardCard.svelte";
  import { grid } from "../layout/grid.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import { roomNameOf, sizeOf, tabsOf, type CardSize } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { dropCard, ownRow, type Drop } from "../layout/rows";
  import { lensChip } from "../model/chips.svelte";
  import { homeRows } from "../model/homeView";
  import { allRooms, LENSES, lensView, sameLensView, type LensId, type LensSection } from "../model/lenses";
  import { homeModel } from "../model/model.svelte";
  import { allTilesSize, CARD_CELLS, fitCard } from "../model/roomCard";
  import { navigate } from "../router.svelte";
  import CardFrame from "../ui/CardFrame.svelte";
  import DeviceTile from "../ui/DeviceTile.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import EditDock from "../ui/EditDock.svelte";
  import EntityTile from "../ui/EntityTile.svelte";
  import Icon from "../ui/Icon.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";

  /**
   * One function across the house (LAYOUTS.md, "Lens screens"): the navigation band, a title band, then Home
   * filtered: a board (layout/Board.svelte) of the rooms the lens has something for, in Home's rows and at their sizes
   * there, each card with what the lens picked, all of it. A room's name opens the room. Rooms hidden from Home show
   * here too. Edit mode arranges the rooms right here, as on Home: their rows, sizes and names are Home's, so Home
   * follows.
   */
  let { lens }: { lens: LensId } = $props();

  interface LensCard extends BoardItem, LensSection {
    name: string;
    sizeName: CardSize;
  }

  const route = $derived(`/lens/${lens}`);
  const editing = $derived(editor.target === route);
  const layout = $derived(editing ? editor.layout : homeLayout());

  // What decides which rooms and devices show (e.g. which devices are offline) has to be live.
  watchEntities(() => allRooms(homeModel()).flatMap((room) => LENSES[lens].watched(room)));
  let shown: LensSection[] = []; // not reactive: the last view, kept while it's the same
  const sections = $derived.by(() => {
    const next = lensView(homeModel(), lens);
    if (!sameLensView(shown, next)) shown = next;
    return shown;
  });
  const view = $derived.by(() => {
    const cards = new Map<string, LensCard>();
    for (const s of sections) {
      const id = s.room.area.area_id;
      const sizeName = sizeOf(layout, id);
      const w = fitCard(CARD_CELLS[sizeName], grid.cols).w;
      cards.set(id, { ...s, id, name: roomNameOf(layout, s.room.area), sizeName, size: sameSize(allTilesSize(w, s.items.length)) });
    }
    return boardView(homeRows(homeModel(), layout), cards, grid.cols, editing);
  });
  const summary = $derived(lensChip(lens));

  const isOn = (id: string) => home.entity(id)?.state === "on";
  const lightsOn = (ids: string[]) => ids.filter(isOn);
  const houseLightsOn = $derived(lens === "lights" ? lightsOn(allRooms(homeModel()).flatMap((r) => r.lights)) : []);

  function switchLights(ids: string[], on: boolean) {
    if (ids.length) void callService("homeassistant", on ? "turn_on" : "turn_off", {}, { entity_id: ids });
  }

  // ---- Edit mode: Home's rows, sizes and names ----

  let selected = $state<string | null>(null);
  const selectedCard = $derived(view.cards.find((c) => c.id === selected));
  const rows = () => homeRows(homeModel(), editor.layout);
  const isFull = (id: string) => sizeOf(editor.layout, id) === "full";

  function drop(id: string, at: Drop) {
    const before = rows();
    const next = dropCard(before, id, at, isFull);
    if (next === before) return false;
    editor.setRows(next);
    return true;
  }

  /** A new size; a card that takes the whole row leaves its stack for a row of its own, where it was. */
  function resize(id: string, size: CardSize) {
    editor.setSize(id, size);
    if (size === "full") editor.setRows(ownRow(rows(), id));
  }
</script>

<main class="screen" class:editing class:docked={docked()}>
  {#if editing}
    <EditBar title={t("lensEdit.title", { lens: t(`lens.names.${lens}`) })} hint={t("lensEdit.hint")} />
  {/if}
  {#if !grid.sidebar}<NavBand current={lens} tabs={tabsOf(homeLayout())} {editing} />{/if}
  {#if !editing}
    <header class="lens-header">
      <h1>{t(`lens.names.${lens}`)}</h1>
      <span class="lens-summary {summary?.tone ?? ''}">{summary?.text ?? t(`lens.calm.${lens}`)}</span>
      <span class="spacer"></span>
      {#if houseLightsOn.length}
        <button class="chip" onclick={() => switchLights(houseLightsOn, false)}>{t("lens.allLightsOff")}</button>
      {/if}
      <!-- With the sidebar, its edit button is at the bottom left, as on every screen. -->
      {#if !grid.sidebar}
        <button class="round-btn" aria-label={t("edit.open")} onclick={() => editor.start(route)}>
          <Icon path={mdiViewDashboardEditOutline} />
        </button>
      {/if}
    </header>
  {/if}

  {#if !sections.length}<p class="empty">{t(`lens.empty.${lens}`)}</p>{/if}

  <Board {view} {editing} bind:selected onDrop={drop}>
    {#snippet card(c, drag)}
      {#snippet allLights()}
        {@const anyOn = lightsOn(c.room.lights).length > 0}
        <button class="chip" onclick={() => switchLights(c.room.lights, !anyOn)}>
          {anyOn ? t("room.allOff") : t("room.allOn")}
        </button>
      {/snippet}
      <BoardCard
        size={c.size}
        name={c.name}
        onOpen={() => navigate(`/room/${c.id}`)}
        action={lens === "lights" && c.room.lights.length > 1 ? allLights : undefined}
        inert={editing}
      >
        {#each c.items as item (item.id)}
          <GridItem size={item.size}>
            {#if item.kind === "device"}
              <DeviceTile device={item.device} />
            {:else}
              <EntityTile entityId={item.id} area={c.room.area} />
            {/if}
          </GridItem>
        {/each}
      </BoardCard>
      {#if editing}
        <CardFrame name={c.name} size={c.size} selected={selected === c.id} onSelect={() => (selected = c.id)} onDrag={drag} />
      {/if}
    {/snippet}
  </Board>
  {#if editing}
    {@const s = selectedCard}
    <EditDock
      name={s?.name}
      haName={s?.room.area.name}
      hint={t("lensEdit.dockHint")}
      size={s?.sizeName}
      onRename={(name) => s && editor.setRoomName(s.room.area, name)}
      onSize={(size) => s && resize(s.id, size)}
      onOwnRow={s?.stacked ? () => editor.setRows(ownRow(rows(), s.id)) : undefined}
      onClose={() => (selected = null)}
    />
  {/if}
</main>
