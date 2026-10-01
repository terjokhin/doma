<script lang="ts" generics="T">
  import type { Snippet } from "svelte";
  import { grid } from "./grid.svelte";
  import { packColumns } from "./pack";

  /**
   * Sections packed into columns like a masonry layout (LAYOUTS.md, "Packing sections").
   * Heights come from the sections' contents, so nothing is measured; re-packs only when the
   * sections or the number of columns change.
   */
  let {
    sections,
    key,
    height,
    section,
  }: {
    sections: T[];
    key: (s: T) => string;
    /** Height in cells, from `sectionHeight`. */
    height: (s: T) => number;
    section: Snippet<[T]>;
  } = $props();

  const columns = $derived(packColumns(sections.map(height), grid.sectionColumns));
</script>

<div class="columns">
  {#each columns as column, i (i)}
    <div class="column">
      {#each column as index (key(sections[index]))}
        {@render section(sections[index])}
      {/each}
    </div>
  {/each}
</div>
