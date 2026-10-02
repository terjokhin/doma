<script lang="ts">
  import {
    mdiChevronLeft,
    mdiDrag,
    mdiDragVertical,
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
    closeUp,
    completePlaces,
    hiddenEntities,
    mergeShown,
    NAME_LENGTH,
    placeAll,
    roomSections,
    ROOM_SECTIONS,
    widthOf,
    type Place,
    type RoomSectionId,
    type SectionTemplate,
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
  const count = $derived(grid.sectionColumns);

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
    /** In section columns. */
    width: number;
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
        const title = sections.names[kind] ?? t(`room.${kind}`);
        out.push({ kind, title, ids, size: KINDS[kind].size, width: widthOf(sections, kind, count), hidden });
      }
    }
    return out;
  });
  const hasAnything = $derived(!!room && ROOM_SECTIONS.some((kind) => KINDS[kind].ids(room).length > 0));

  const groupHeight = (g: Group) => sectionHeight(g.ids.map(() => g.size), 4 * g.width);
  const heights = $derived(new Map(groups.map((g) => [g.kind, groupHeight(g)])));

  // Where the sections go on this screen width, in order. Outside edit mode a column the room has nothing in closes
  // up; in edit mode it stays, to drop a section into.
  const arranged = $derived(arrangeSections(sections, count, heights));
  const places = $derived(editing ? arranged : closeUp(sections, arranged, count));
  const placed = $derived.by(() => {
    const packed = placeAll(sections, places, count, heights);
    // SectionColumns takes the slots in the order of `groups`.
    return { ...packed, slots: groups.map((g) => packed.slots[places.findIndex((p) => p.id === g.kind)]) };
  });

  // "All on / off" acts on the lights the screen shows.
  const lights = $derived(groups.find((g) => g.kind === "lights")?.ids ?? []);
  watchEntities(() => [room?.temperature, room?.humidity, ...lights]);
  const temperature = $derived(home.entity(room?.temperature));
  const humidity = $derived(home.entity(room?.humidity));
  const lightsOn = $derived(lights.some((id) => home.entity(id)?.state === "on"));

  function toggleAll() {
    void callService("homeassistant", lightsOn ? "turn_off" : "turn_on", {}, { entity_id: lights });
  }

  // ---- Edit mode ----

  /** The room's sections without whether they're its own: what the editor stores. */
  function template(change: Partial<SectionTemplate>): SectionTemplate {
    const { own: _, ...t } = sections;
    return { ...t, ...change };
  }

  /** Every section's place on this width: as stored, or as shown when it hasn't been arranged yet. */
  const allPlaces = () => completePlaces(sections.places[count] ?? arranged);

  /**
   * Store where the room's sections go on this width. Every section is stored, the ones this room doesn't have too,
   * so other rooms following the same template get the arrangement as well.
   */
  function setPlaces(shown: Place[], change: Partial<SectionTemplate> = {}) {
    editor.setSections(areaId, template({ ...change, places: { ...sections.places, [count]: mergeShown(allPlaces(), shown) } }));
  }

  /** A section's width; reaching the screen's width stores "full", so it stays full on a larger screen. */
  function setWidth(kind: RoomSectionId, w: number) {
    const widths: SectionTemplate["widths"] = { ...sections.widths };
    delete widths[kind];
    if (w > 1) widths[kind] = w >= count ? "full" : w;
    // The places are stored too, so that nothing else on this width moves when the packing would have changed.
    setPlaces(arranged, { widths });
  }

  const pitch = () => grid.cell * (4 + 4 * GAP); // a section column and the gap after it

  // Dragging a section by its title band: into any column, at any place in the order there. Each step starts from
  // where the sections were when the drag began, like cards on Home. A tap (no movement) renames it instead.
  let dragging = $state<RoomSectionId | undefined>();
  let dragged = false;

  function pressTitle(e: PointerEvent, kind: RoomSectionId) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragged = false;
    const handle = e.currentTarget as HTMLElement;
    const { pointerId, clientX, clientY } = e;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || Math.hypot(ev.clientX - clientX, ev.clientY - clientY) < 8) return;
      stop();
      dragged = true;
      startDrag(ev, handle, kind);
    };
    const stop = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", stop);
      removeEventListener("pointercancel", stop);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", stop);
    addEventListener("pointercancel", stop);
  }

  function startDrag(e: PointerEvent, handle: HTMLElement, kind: RoomSectionId) {
    const item = handle.closest<HTMLElement>("[data-section]");
    const container = item?.parentElement;
    if (!item || !container) return;
    const start = arranged;
    const others = start.filter((p) => p.id !== kind);
    const t0 = template({});
    const sizes = heights;
    const w = widthOf(sections, kind, count);
    const from = start.findIndex((p) => p.id === kind);
    let target = { x: start[from].x, index: from };
    dragging = kind;
    dragItem(
      e,
      item,
      container,
      (left, top) => {
        const x = Math.max(0, Math.min(Math.round(left / pitch()), count - w));
        // The place in the order that puts the section's top nearest to where it is (the first, on a tie).
        let index = 0;
        let nearest = Infinity;
        for (let i = 0; i <= others.length; i++) {
          const order = [...others.slice(0, i), { id: kind, x }, ...others.slice(i)];
          const slot = placeAll(t0, order, count, sizes).slots[i];
          const distance = Math.abs(slot.top * grid.cell - top);
          if (distance < nearest) [index, nearest] = [i, distance];
        }
        if (x === target.x && index === target.index) return false;
        target = { x, index };
        setPlaces([...others.slice(0, index), { id: kind, x }, ...others.slice(index)]);
        return true;
      },
      () => {
        dragging = undefined;
        // A click may follow the release; it isn't a tap. Cleared after it, so the next one renames.
        setTimeout(() => (dragged = false));
      },
    );
  }

  // Renaming: a tap on the title (or Enter) opens a field in its place; Enter or leaving it saves, Escape cancels.
  let renaming = $state<RoomSectionId | undefined>();

  function tapTitle(kind: RoomSectionId) {
    if (dragged) dragged = false;
    else renaming = kind;
  }

  function focusSelect(input: HTMLInputElement) {
    input.focus();
    input.select();
  }

  function commitName(kind: RoomSectionId, value: string) {
    if (renaming !== kind) return;
    renaming = undefined;
    const name = value.trim().slice(0, NAME_LENGTH);
    const names: SectionTemplate["names"] = { ...sections.names };
    delete names[kind];
    if (name && name !== t(`room.${kind}`)) names[kind] = name;
    if (names[kind] !== sections.names[kind]) editor.setSections(areaId, template({ names }));
  }

  function nameKey(e: KeyboardEvent, kind: RoomSectionId) {
    if (e.key === "Enter") commitName(kind, (e.currentTarget as HTMLInputElement).value);
    if (e.key === "Escape") renaming = undefined;
  }

  // Widening: drag the grip on a section's right side. Its width snaps to whole section columns, up to the screen's
  // right edge.
  let resizing = $state<RoomSectionId | undefined>();

  function startResize(e: PointerEvent, kind: RoomSectionId) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const item = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-section]");
    if (!item) return;
    const left = item.getBoundingClientRect().left;
    const x = arranged.find((p) => p.id === kind)!.x;
    const { pointerId } = e;
    let w = widthOf(sections, kind, count);
    resizing = kind;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const next = Math.max(1, Math.min(Math.round((ev.clientX - left + grid.cell * GAP) / pitch()), count - x));
      if (next === w) return;
      w = next;
      setWidth(kind, w);
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
      resizing = undefined;
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }

  /** For a keyboard: arrows move a section up, down, or to the next column; Shift with left or right resizes it. */
  function keyMove(e: KeyboardEvent, kind: RoomSectionId) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const i = arranged.findIndex((p) => p.id === kind);
    const me = arranged[i];
    const w = widthOf(sections, kind, count);
    const sideways = e.key === "ArrowLeft" || e.key === "ArrowRight";
    const by = e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1;
    const handle = e.currentTarget as HTMLElement;
    if (sideways && e.shiftKey) {
      if (w + by >= 1 && me.x + w + by <= count) setWidth(kind, w + by);
    } else if (sideways) {
      const x = me.x + by;
      if (x < 0 || x + w > count) return;
      setPlaces(arranged.map((p) => (p.id === kind ? { id: kind, x } : p)));
    } else {
      // Past the next section above or below that shares one of its columns.
      const shares = (p: Place) => p.x < me.x + w && me.x < p.x + widthOf(sections, p.id, count);
      let j = i + by;
      while (j >= 0 && j < arranged.length && !shares(arranged[j])) j += by;
      if (j < 0 || j >= arranged.length) return;
      const others = arranged.filter((p) => p.id !== kind);
      const at = others.indexOf(arranged[j]) + (by > 0 ? 1 : 0);
      setPlaces([...others.slice(0, at), me, ...others.slice(at)]);
    }
    // Its element may move in the page, which drops the focus: give it back.
    void tick().then(() => handle.focus());
  }

  function toggleSection(kind: RoomSectionId) {
    const hidden = sections.hidden.includes(kind) ? sections.hidden.filter((k) => k !== kind) : [...sections.hidden, kind];
    editor.setSections(areaId, template({ hidden }));
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
      {#if renaming === g.kind}
        <input
          class="section-rename"
          value={g.title}
          maxlength={NAME_LENGTH}
          aria-label={t("roomEdit.rename", { name: g.title })}
          use:focusSelect
          onkeydown={(e) => nameKey(e, g.kind)}
          onblur={(e) => commitName(g.kind, e.currentTarget.value)}
        />
      {:else}
        <button
          class="section-drag"
          aria-label={t("roomEdit.move", { name: g.title })}
          onpointerdown={(e) => pressTitle(e, g.kind)}
          onclick={() => tapTitle(g.kind)}
          onkeydown={(e) => keyMove(e, g.kind)}
        >
          <h2 class:muted={g.hidden}>{g.title}</h2>
          <Icon path={mdiDrag} size={18} />
        </button>
      {/if}
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
      width={g.width}
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
    {#if editing && count > 1}
      <button
        class="section-resize"
        class:active={resizing === g.kind}
        aria-label={t("roomEdit.resize", { name: g.title })}
        onpointerdown={(e) => startResize(e, g.kind)}
        onkeydown={(e) => keyMove(e, g.kind)}
      >
        <Icon path={mdiDragVertical} size={18} />
      </button>
    {/if}
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
      {placed}
      showEmpty={editing}
      {dragging}
    />
  </main>
{/if}
