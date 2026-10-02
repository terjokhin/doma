<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import { grid } from "./grid.svelte";
  import { packSections, stackSections } from "./pack";

  /**
   * Sections packed into columns like a masonry layout (LAYOUTS.md, "Packing sections"). Heights come from the
   * sections' contents, so nothing is measured: each section is placed at its computed spot in one container. So a
   * section that changes column keeps its element (and its tiles), which dragging one relies on. Re-packs only when
   * the sections or the number of columns change. With `columns`, sections go in the columns given instead (a room
   * screen, where you arrange them); every section must be in one of them.
   */
  let {
    sections,
    key,
    height,
    section,
    dragging,
    columns,
    showEmpty = false,
  }: {
    sections: T[];
    key: (s: T) => string;
    /** Height in cells, from `sectionHeight`. */
    height: (s: T) => number;
    section: Snippet<[T]>;
    /** The key of the section being dragged: a faint outline shows where it will land. */
    dragging?: string;
    /** Section keys by column, top to bottom. */
    columns?: string[][];
    /** Outline empty columns (edit mode: a section can be dropped there). */
    showEmpty?: boolean;
  } = $props();

  const packed = $derived.by(() => {
    const heights = sections.map(height);
    if (!columns) return packSections(heights, grid.sectionColumns);
    const index = new Map(sections.map((s, i) => [key(s), i]));
    return stackSections(heights, columns.map((c) => c.map((k) => index.get(k)!)));
  });
  const left = (column: number) => `calc(${column} * (4 * var(--cell) + 4 * var(--gap)))`;
</script>

<div class="columns" style:height="calc({Math.max(packed.height, showEmpty ? 1.5 : 0)} * var(--cell))">
  {#if showEmpty && columns}
    {#each columns as column, k (k)}
      {#if column.length === 0}
        <div class="packed column-empty" style:left={left(k)}></div>
      {/if}
    {/each}
  {/if}
  {#each sections as s, i (key(s))}
    {@const slot = packed.slots[i]}
    {#if key(s) === dragging}
      <div
        class="drop-ghost packed"
        style:left={left(slot.column)}
        style:top="calc({slot.top} * var(--cell))"
        style:height="calc({height(s)} * var(--cell))"
      ></div>
    {/if}
    <div class="packed" data-section={key(s)} style:left={left(slot.column)} style:top="calc({slot.top} * var(--cell))">
      {@render section(s)}
    </div>
  {/each}
</div>
