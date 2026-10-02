<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import { grid } from "./grid.svelte";
  import { packSections, type Packed } from "./pack";

  /**
   * Sections packed into columns like a masonry layout (LAYOUTS.md, "Packing sections"). Heights come from the
   * sections' contents, so nothing is measured: each section is placed at its computed spot in one container. So a
   * section that changes column keeps its element (and its tiles), which dragging one relies on. Re-packs only when
   * the sections or the number of columns change. A room screen, where you arrange the sections, passes where they
   * go instead (`placed`).
   */
  let {
    sections,
    key,
    height,
    section,
    dragging,
    placed,
    showEmpty = false,
  }: {
    sections: T[];
    key: (s: T) => string;
    /** Height in cells, from `sectionHeight`. */
    height: (s: T) => number;
    section: Snippet<[T]>;
    /** The key of the section being dragged: a faint outline shows where it will land. */
    dragging?: string;
    /** Where each section goes, in the order of `sections`. */
    placed?: Packed;
    /** Outline empty columns (edit mode: a section can be dropped there). */
    showEmpty?: boolean;
  } = $props();

  const packed = $derived(placed ?? packSections(sections.map((s) => ({ w: 1, h: height(s) })), grid.sectionColumns));
  const empty = $derived.by(() => {
    if (!showEmpty) return [];
    const used = new Array<boolean>(grid.sectionColumns).fill(false);
    for (const { column, width } of packed.slots) used.fill(true, column, column + width);
    return used.flatMap((u, k) => (u ? [] : [k]));
  });
  const left = (column: number) => `calc(${column} * (4 * var(--cell) + 4 * var(--gap)))`;
  /** A section `w` section columns wide, and the gaps inside it. */
  const width = (w: number) => (w > 1 ? `calc(${4 * w} * var(--cell) + ${4 * w - 1} * var(--gap))` : undefined);
</script>

<div class="columns" style:height="calc({Math.max(packed.height, empty.length ? 1.5 : 0)} * var(--cell))">
  {#each empty as k (k)}
    <div class="packed column-empty" style:left={left(k)}></div>
  {/each}
  {#each sections as s, i (key(s))}
    {@const slot = packed.slots[i]}
    {#if key(s) === dragging}
      <div
        class="drop-ghost packed"
        style:left={left(slot.column)}
        style:top="calc({slot.top} * var(--cell))"
        style:width={width(slot.width)}
        style:height="calc({height(s)} * var(--cell))"
      ></div>
    {/if}
    <div
      class="packed"
      data-section={key(s)}
      style:left={left(slot.column)}
      style:top="calc({slot.top} * var(--cell))"
      style:width={width(slot.width)}
    >
      {@render section(s)}
    </div>
  {/each}
</div>
