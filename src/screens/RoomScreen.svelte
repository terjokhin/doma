<script lang="ts">
  import {
    mdiChevronLeft,
    mdiDrag,
    mdiEyeOffOutline,
    mdiEyeOutline,
    mdiViewDashboardEditOutline,
  } from "@mdi/js";
  import { onDestroy, tick } from "svelte";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import { dragItem } from "../layout/drag";
  import { GAP, grid } from "../layout/grid.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { sectionHeight, type Size } from "../layout/pack";
  import {
    arrangeSections,
    completeColumns,
    hiddenEntities,
    moveSection,
    roomSections,
    ROOM_SECTIONS,
    type Columns,
    type RoomSectionId,
  } from "../layout/roomTemplate";
  import Section from "../layout/Section.svelte";
  import SectionColumns from "../layout/SectionColumns.svelte";
  import { SIZES } from "../layout/sizes";
  import { entityName, type Room } from "../model/home";
  import { findRoom } from "../model/model.svelte";
  import { back } from "../router.svelte";
  import ClimateTile from "../ui/ClimateTile.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";
  import SceneTile from "../ui/SceneTile.svelte";
  import SensorTile from "../ui/SensorTile.svelte";
  import ToggleTile from "../ui/ToggleTile.svelte";

  let { areaId }: { areaId: string } = $props();

  // The room's sections come from the room template (LAYOUTS.md, "Room screens"); in edit mode, from the draft.
  const route = $derived(`/room/${areaId}`);
  const editing = $derived(editor.target === route);
  const layout = $derived(editing ? editor.layout : homeLayout());
  const sections = $derived(roomSections(layout, areaId));
  const hide = $derived(new Set(hiddenEntities(layout, areaId)));

  const room = $derived(findRoom(areaId));

  /** What each section shows, and the size of its tiles. */
  const KINDS: Record<RoomSectionId, { ids: (room: Room) => string[]; size: Size }> = {
    scenes: { ids: (r) => r.scenes, size: SIZES.scene },
    lights: { ids: (r) => r.lights, size: SIZES.toggle },
    climate: { ids: (r) => r.climate, size: SIZES.climate },
    switches: { ids: (r) => r.switches, size: SIZES.toggle },
    media: { ids: (r) => r.media, size: SIZES.media },
    sensors: { ids: (r) => r.sensors, size: SIZES.sensor },
  };

  interface Group {
    kind: RoomSectionId;
    title: string;
    ids: string[];
    size: Size;
    /** Hidden by the template; in edit mode it shows as its title alone. */
    hidden: boolean;
  }

  // The room's sections, without hidden ones and hidden entities; a section with nothing left is left out. In edit
  // mode every section the room has is there, and every entity, to show them again.
  const groups = $derived.by((): Group[] => {
    if (!room) return [];
    const out: Group[] = [];
    for (const kind of ROOM_SECTIONS) {
      const all = KINDS[kind].ids(room);
      const hidden = sections.hidden.includes(kind);
      const ids = hidden ? [] : editing ? all : all.filter((id) => !hide.has(id));
      if (editing ? all.length > 0 : ids.length > 0) {
        out.push({ kind, title: t(`room.${kind}`), ids, size: KINDS[kind].size, hidden });
      }
    }
    return out;
  });
  const hasAnything = $derived(!!room && ROOM_SECTIONS.some((kind) => KINDS[kind].ids(room).length > 0));

  const groupHeight = (g: Group) => sectionHeight(g.ids.map(() => g.size));
  const heights = $derived(new Map(groups.map((g) => [g.kind, groupHeight(g)])));

  // Which column each section goes in on this screen width. Outside edit mode a column the room has nothing in
  // closes up; in edit mode it stays, to drop a section into.
  const arranged = $derived(arrangeSections(sections, grid.sectionColumns, heights));
  const columns = $derived(editing ? arranged : arranged.filter((c) => c.length > 0));

  // "All on / off" acts on the lights the screen shows.
  const lights = $derived(groups.find((g) => g.kind === "lights")?.ids ?? []);
  watchEntities(() => [room?.temperature, room?.humidity, ...lights]);
  const temperature = $derived(home.entity(room?.temperature));
  const humidity = $derived(home.entity(room?.humidity));
  const lightsOn = $derived(lights.some((id) => home.entity(id)?.state === "on"));

  function toggleAll() {
    void callService("homeassistant", lightsOn ? "turn_off" : "turn_on", {}, { entity_id: lights });
  }

  // Edit mode: a section is dragged by its title band into any column, at any place in it; the sections below it
  // there move down, nothing else moves. Each step starts from where the sections were when the drag began, like
  // cards on Home.
  let dragging = $state<RoomSectionId | undefined>();

  /**
   * Store where the sections go on this screen width. Every section is stored, the ones this room doesn't have
   * too, so other rooms following the same template get the arrangement as well.
   */
  function setColumns(next: Columns) {
    editor.setSections(areaId, { columns: { ...sections.columns, [grid.sectionColumns]: next }, hidden: sections.hidden });
  }

  /** Every section's column on this width: as stored, or as shown when it hasn't been arranged yet. */
  const allColumns = () => completeColumns(sections.columns[grid.sectionColumns] ?? arranged, grid.sectionColumns);

  function startDrag(e: PointerEvent, kind: RoomSectionId) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const item = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-section]");
    const container = item?.parentElement;
    if (!item || !container) return;
    const all = allColumns();
    const shown = arranged;
    const sizes = heights;
    const pitch = grid.cell * (4 + 4 * GAP); // a section and the gap after it
    const from = shown.findIndex((c) => c.includes(kind));
    let target = { column: from, index: shown[from].indexOf(kind) };
    dragging = kind;
    dragItem(
      e,
      item,
      container,
      (left, top) => {
        const column = Math.max(0, Math.min(Math.round(left / pitch), shown.length - 1));
        // Before the first section of that column whose middle is below the dragged section's top.
        const others = shown[column].filter((k) => k !== kind);
        let index = others.length;
        let y = 0;
        for (let i = 0; i < others.length; i++) {
          const height = sizes.get(others[i])!;
          if ((y + height / 2) * grid.cell > top) {
            index = i;
            break;
          }
          y += height + GAP;
        }
        if (column === target.column && index === target.index) return false;
        target = { column, index };
        setColumns(moveSection(all, shown, kind, column, index));
        return true;
      },
      () => (dragging = undefined),
    );
  }

  const STEPS: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

  /** For a keyboard: the arrow keys on a focused title move its section up, down, or to the next column. */
  function keyMove(e: KeyboardEvent, kind: RoomSectionId) {
    const step = STEPS[e.key];
    if (!step) return;
    e.preventDefault();
    const from = arranged.findIndex((c) => c.includes(kind));
    const index = arranged[from].indexOf(kind);
    const column = from + step[0];
    if (column < 0 || column >= arranged.length) return;
    const others = arranged[column].filter((k) => k !== kind);
    const to = step[0] ? Math.min(index, others.length) : index + step[1];
    if (to < 0 || to > others.length || (column === from && to === index)) return;
    // Its element moves in the page, which drops the focus: give it back.
    const handle = e.currentTarget as HTMLElement;
    setColumns(moveSection(allColumns(), arranged, kind, column, to));
    void tick().then(() => handle.focus());
  }

  function toggleSection(kind: RoomSectionId) {
    const hidden = sections.hidden.includes(kind) ? sections.hidden.filter((k) => k !== kind) : [...sections.hidden, kind];
    editor.setSections(areaId, { columns: sections.columns, hidden });
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
    {#if lights.length > 1}
      <button class="chip" onclick={toggleAll}>{lightsOn ? t("room.allOff") : t("room.allOn")}</button>
    {/if}
  {/snippet}

  {#snippet group(g: Group)}
    {#snippet tools()}
      <button
        class="section-drag"
        aria-label={t("roomEdit.move", { name: g.title })}
        onpointerdown={(e) => startDrag(e, g.kind)}
        onkeydown={(e) => keyMove(e, g.kind)}
      >
        <h2 class:muted={g.hidden}>{g.title}</h2>
        <Icon path={mdiDrag} size={18} />
      </button>
      <button
        class="round-btn small"
        aria-pressed={!g.hidden}
        aria-label={t(g.hidden ? "roomEdit.show" : "roomEdit.hide", { name: g.title })}
        onclick={() => toggleSection(g.kind)}
      >
        <Icon path={g.hidden ? mdiEyeOffOutline : mdiEyeOutline} size={18} />
      </button>
    {/snippet}
    <Section
      title={g.title}
      head={editing ? tools : undefined}
      action={g.kind === "lights" ? allLights : undefined}
    >
      {#each g.ids as id (id)}
        <GridItem size={g.size}>
          <div class="tile-slot" inert={editing}>
            {#if g.kind === "climate"}
              <ClimateTile entityId={id} {area} />
            {:else if g.kind === "lights" || g.kind === "switches"}
              <ToggleTile entityId={id} {area} />
            {:else if g.kind === "scenes"}
              <SceneTile entityId={id} {area} />
            {:else}
              <SensorTile entityId={id} {area} />
            {/if}
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
    </Section>
  {/snippet}

  <main class="screen" class:editing>
    {#if editing}
      <EditBar
        title={t("roomEdit.title", { room: area.name })}
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
        <h1>{area.name}</h1>
        <div class="room-climate">
          {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
          {#if humidity}<span>{formatHumidity(humidity)}</span>{/if}
        </div>
        <span class="spacer"></span>
        <button class="round-btn" aria-label={t("roomEdit.open")} onclick={() => editor.start(route)}>
          <Icon path={mdiViewDashboardEditOutline} />
        </button>
      </header>
    {/if}

    {#if groups.length === 0}<p class="empty">{t(hasAnything ? "room.allHidden" : "room.empty")}</p>{/if}

    <SectionColumns
      sections={groups}
      key={(g) => g.kind}
      height={groupHeight}
      section={group}
      {columns}
      showEmpty={editing}
      {dragging}
    />
  </main>
{/if}
