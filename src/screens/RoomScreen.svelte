<script lang="ts">
  import { mdiChevronLeft, mdiEyeOffOutline, mdiEyeOutline, mdiViewDashboardEditOutline } from "@mdi/js";
  import { onDestroy } from "svelte";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import Board from "../layout/Board.svelte";
  import { boardView, sameSize, type BoardItem } from "../layout/board";
  import BoardCard from "../layout/BoardCard.svelte";
  import { grid } from "../layout/grid.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import { DEFAULT_CARD_SIZE, type CardSize } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout, roomName } from "../layout/layoutStore.svelte";
  import {
    hiddenEntities,
    NAME_LENGTH,
    roomSections,
    ROOM_SECTIONS,
    sectionRows,
    sectionSize,
    type RoomSectionId,
    type SectionTemplate,
  } from "../layout/roomTemplate";
  import { dropCard, ownRow, type Drop } from "../layout/rows";
  import { SIZES } from "../layout/sizes";
  import { entityName, type Room } from "../model/home";
  import { findRoom } from "../model/model.svelte";
  import { allTilesSize, CARD_CELLS, fitCard } from "../model/roomCard";
  import { back } from "../router.svelte";
  import CardFrame from "../ui/CardFrame.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import EditDock from "../ui/EditDock.svelte";
  import EntityTile from "../ui/EntityTile.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";

  /**
   * A room's screen (LAYOUTS.md, "Room screens"): a board like Home (layout/Board.svelte), with the room's sections as
   * its cards: scenes, lights, climate, switches, media, sensors, each with all its tiles. Where the sections go, at
   * what size and under what name comes from the room template, or the room's own; in edit mode, from the draft.
   */
  let { areaId }: { areaId: string } = $props();

  const route = $derived(`/room/${areaId}`);
  const editing = $derived(editor.target === route);
  const layout = $derived(editing ? editor.layout : homeLayout());
  const sections = $derived(roomSections(layout, areaId));
  const hide = $derived(new Set(hiddenEntities(layout, areaId)));

  const room = $derived(findRoom(areaId));

  /** What each section shows. */
  const KINDS: Record<RoomSectionId, (r: Room) => string[]> = {
    scenes: (r) => r.scenes,
    lights: (r) => r.lights,
    climate: (r) => r.climate,
    switches: (r) => r.switches,
    media: (r) => r.media,
    sensors: (r) => r.sensors,
  };

  interface SectionCard extends BoardItem {
    id: RoomSectionId;
    title: string;
    ids: string[];
    sizeName: CardSize;
    /** Hidden by the template; in edit mode it shows as its title alone. */
    hidden: boolean;
  }

  // The room's sections, without hidden ones and hidden entities; a section with nothing left is left out. In edit
  // mode every section the room has is there, and every entity, to show them again.
  const cards = $derived.by(() => {
    const out = new Map<string, SectionCard>();
    if (!room) return out;
    for (const id of ROOM_SECTIONS) {
      const all = KINDS[id](room);
      const hidden = sections.hidden.includes(id);
      const ids = hidden ? [] : editing ? all : all.filter((e) => !hide.has(e));
      if (!(editing ? all.length > 0 : ids.length > 0)) continue;
      const sizeName = sectionSize(sections, id);
      const size = sameSize(allTilesSize(fitCard(CARD_CELLS[sizeName], grid.cols).w, ids.length));
      out.set(id, { id, title: sections.names[id] ?? t(`room.${id}`), ids, sizeName, size, hidden });
    }
    return out;
  });
  const view = $derived(boardView(sectionRows(sections), cards, grid.cols, editing));
  const hasAnything = $derived(!!room && ROOM_SECTIONS.some((id) => KINDS[id](room).length > 0));

  // "All on / off" acts on the lights the screen shows.
  const lights = $derived(cards.get("lights")?.ids ?? []);
  watchEntities(() => [room?.temperature, room?.humidity, ...lights]);
  const temperature = $derived(home.entity(room?.temperature));
  const humidity = $derived(home.entity(room?.humidity));
  const lightsOn = $derived(lights.some((id) => home.entity(id)?.state === "on"));

  function toggleAll() {
    void callService("homeassistant", lightsOn ? "turn_off" : "turn_on", {}, { entity_id: lights });
  }

  // ---- Edit mode ----

  /** In edit mode, the section being changed: its tools are in the dock at the bottom. */
  let selected = $state<string | null>(null);
  const selectedCard = $derived(selected ? cards.get(selected) : undefined);

  /** The room's sections without whether they're its own, changed by `change`: what the editor stores. */
  function template(change: Partial<SectionTemplate>): SectionTemplate {
    const { own: _, ...t } = sections;
    return { ...t, ...change };
  }
  const save = (change: Partial<SectionTemplate>) => editor.setSections(areaId, template(change));
  const isFull = (id: string) => sectionSize(sections, id as RoomSectionId) === "full";
  const rows = () => sectionRows(sections) as string[][];
  const setRows = (next: readonly string[][]) => save({ rows: next.map((r) => [...r]) as RoomSectionId[][] });

  function drop(id: string, at: Drop) {
    const before = rows();
    const next = dropCard(before, id, at, isFull);
    if (next === before) return false;
    setRows(next);
    return true;
  }

  /** A new size; a section that takes the whole row leaves its stack for a row of its own, where it was. */
  function resize(id: RoomSectionId, size: CardSize) {
    const sizes: SectionTemplate["sizes"] = { ...sections.sizes };
    delete sizes[id];
    if (size !== DEFAULT_CARD_SIZE) sizes[id] = size;
    const change: Partial<SectionTemplate> = { sizes };
    if (size === "full") change.rows = ownRow(rows(), id).map((r) => [...r]) as RoomSectionId[][];
    save(change);
  }

  /** A section's name; empty, or its default name, goes back to the default. */
  function rename(id: RoomSectionId, value: string) {
    const name = value.trim().slice(0, NAME_LENGTH);
    const names: SectionTemplate["names"] = { ...sections.names };
    delete names[id];
    if (name && name !== t(`room.${id}`)) names[id] = name;
    save({ names });
  }

  function toggleSection(id: RoomSectionId) {
    save({ hidden: sections.hidden.includes(id) ? sections.hidden.filter((k) => k !== id) : [...sections.hidden, id] });
  }

  function setOwn(own: boolean) {
    if (own !== sections.own) editor.setOwnSections(areaId, own);
  }

  // Leaving the room (the browser's back button) drops an unsaved edit, like Cancel.
  onDestroy(() => {
    if (editor.target === route) editor.cancel();
  });
</script>

{#if !room}
  <div class="center">{t("app.connecting")}</div>
{:else}
  {@const area = room.area}

  {#snippet allLights()}
    <button class="chip" onclick={toggleAll}>{lightsOn ? t("room.allOff") : t("room.allOn")}</button>
  {/snippet}

  <main class="screen" class:editing>
    {#if editing}
      <EditBar
        title={t("roomEdit.title", { room: roomName(area) })}
        hint={t("roomEdit.hint")}
        onReset={() => editor.resetRoom(areaId)}
      >
        <div class="scope" role="group" aria-label={t("roomEdit.scope")}>
          <button class="chip" aria-pressed={!sections.own} disabled={editor.saving} onclick={() => setOwn(false)}>
            {t("roomEdit.allRooms")}
          </button>
          <button class="chip" aria-pressed={sections.own} disabled={editor.saving} onclick={() => setOwn(true)}>
            {t("roomEdit.thisRoom")}
          </button>
        </div>
      </EditBar>
    {:else}
      <header class="room-header">
        <button class="round-btn" aria-label={t("room.back")} onclick={back}>
          <Icon path={mdiChevronLeft} size={28} />
        </button>
        <h1>{roomName(area)}</h1>
        <div class="room-climate">
          {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
          {#if humidity}<span>{formatHumidity(humidity)}</span>{/if}
        </div>
        <span class="spacer"></span>
        <!-- With the sidebar, its edit button is at the bottom left, as on every screen. -->
        {#if !grid.sidebar}
          <button class="round-btn" aria-label={t("roomEdit.open")} onclick={() => editor.start(route)}>
            <Icon path={mdiViewDashboardEditOutline} />
          </button>
        {/if}
      </header>
    {/if}

    {#if view.cards.length === 0}<p class="empty">{t(hasAnything ? "room.allHidden" : "room.empty")}</p>{/if}

    <Board {view} {editing} bind:selected onDrop={drop}>
      {#snippet card(c, drag)}
        <BoardCard
          size={c.size}
          name={c.title}
          muted={c.hidden}
          action={!editing && c.id === "lights" && c.ids.length > 1 ? allLights : undefined}
        >
          {#each c.ids as id (id)}
            <GridItem size={SIZES.tile}>
              <div class="tile-slot" inert={editing}>
                <EntityTile entityId={id} {area} />
              </div>
              {#if editing}
                {@const hidden = hide.has(id)}
                {@const name = entityName(home.catalog[id], home.registry[id], area)}
                <button
                  class="tile-edit"
                  class:hidden
                  aria-pressed={!hidden}
                  aria-label={t(hidden ? "roomEdit.show" : "roomEdit.hide", { name })}
                  onclick={() => editor.setEntityHidden(areaId, id, !hidden)}
                >
                  <span class="tile-edit-badge"><Icon path={hidden ? mdiEyeOffOutline : mdiEyeOutline} size={18} /></span>
                </button>
              {/if}
            </GridItem>
          {/each}
        </BoardCard>
        {#if editing}
          <CardFrame
            name={c.title}
            size={c.size}
            selected={selected === c.id}
            pickAll={false}
            onSelect={() => (selected = c.id)}
            onDrag={drag}
          />
        {/if}
      {/snippet}
    </Board>

    {#if editing}
      {@const s = selectedCard}
      <EditDock
        name={s?.title}
        haName={s && t(`room.${s.id}`)}
        nameLabel={t("roomEdit.sectionName")}
        hint={t("roomEdit.dockHint")}
        size={s?.sizeName}
        hidden={s?.hidden}
        onRename={(name) => s && rename(s.id, name)}
        onSize={(size) => s && resize(s.id, size)}
        onOwnRow={s && view.cards.find((c) => c.id === s.id)?.stacked ? () => setRows(ownRow(rows(), s.id)) : undefined}
        onHide={() => s && toggleSection(s.id)}
        onClose={() => (selected = null)}
      />
    {/if}
  </main>
{/if}
