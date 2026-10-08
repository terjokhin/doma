<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import Board from "../layout/Board.svelte";
  import type { CardSize } from "../layout/homeLayout";
  import { grid } from "../layout/grid.svelte";
  import { sizeOf, tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { dropCard, ownRow, type Drop } from "../layout/rows";
  import { homeRows, homeView } from "../model/homeView";
  import { homeModel } from "../model/model.svelte";
  import CardEditor from "../ui/CardEditor.svelte";
  import EditBar from "../ui/EditBar.svelte";
  import EditDock from "../ui/EditDock.svelte";
  import HiddenRoomsMenu from "../ui/HiddenRoomsMenu.svelte";
  import Header from "../ui/Header.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";
  import TabsMenu from "../ui/TabsMenu.svelte";
  import RoomCard from "./RoomCard.svelte";

  // The room cards on a board (layout/Board.svelte): the layout's rows, each a room on its own or a stack of rooms
  // side by side, at their sizes (LAYOUTS.md, "The floor grid"). In edit mode it shows the editor's draft.
  const editing = $derived(editor.target === "/");
  const layout = $derived(editing ? editor.layout : homeLayout());
  /** In edit mode, the room whose card is being changed: its tools are on it and in the dock at the bottom. */
  let selected = $state<string | null>(null);
  const view = $derived(homeView(homeModel(), layout, grid.cols, editing, selected));
  const selectedCard = $derived(view.cards.find((c) => c.id === selected));

  const isFull = (id: string) => sizeOf(editor.layout, id) === "full";
  const rows = () => homeRows(homeModel(), editor.layout);

  /** A new size; a card that takes the whole row leaves its stack for a row of its own, where it was. */
  function resize(id: string, size: CardSize) {
    editor.setSize(id, size);
    if (size === "full") editor.setRows(ownRow(rows(), id));
  }

  function drop(id: string, at: Drop) {
    const before = rows();
    const next = dropCard(before, id, at, isFull);
    if (next === before) return false;
    editor.setRows(next);
    return true;
  }
</script>

<main class="screen" class:editing class:docked={docked()}>
  {#if editing}
    <EditBar title={t("edit.title")} hint={t("edit.hint")} onReset={editor.reset}>
      <HiddenRoomsMenu />
      <TabsMenu />
    </EditBar>
  {:else if !grid.sidebar}
    <Header />
  {/if}
  <!-- On wide screens the sidebar has the clock, the tabs and the status chips. -->
  {#if !grid.sidebar}<NavBand current="home" tabs={tabsOf(layout)} {editing} />{/if}
  <Board {view} {editing} bind:selected onDrop={drop}>
    {#snippet card(c, drag)}
      <RoomCard room={c.room} name={c.name} size={c.size} items={c.items} {editing} />
      {#if editing}
        <CardEditor
          size={c.size}
          room={c.room}
          items={c.items}
          slots={c.slots}
          selected={selected === c.id}
          onSelect={() => (selected = c.id)}
          onDrag={drag}
          onSlots={(slots) => editor.setSlots(c.id, slots)}
        />
      {/if}
    {/snippet}
  </Board>
  {#if editing}
    {@const id = selectedCard?.id}
    <EditDock
      name={selectedCard?.name}
      haName={selectedCard?.room.area.name}
      onRename={(name) => selectedCard && editor.setRoomName(selectedCard.room.area, name)}
      size={selectedCard?.sizeName}
      onSize={(size) => id && resize(id, size)}
      onOwnRow={id && selectedCard?.stacked ? () => editor.setRows(ownRow(rows(), id)) : undefined}
      onHide={() => id && editor.setRoomHidden(id, true)}
      onClose={() => (selected = null)}
    />
  {/if}
</main>
