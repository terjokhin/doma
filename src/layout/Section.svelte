<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * A titled group, 4 cells wide (or `width` × 4 on a room screen): a title band of half a cell, then a grid of
   * GridItems as many cells wide. The band shows `title` (and an optional `action` on the right), or a custom `head`.
   */
  let {
    title,
    head,
    action,
    width = 1,
    children,
  }: {
    title?: string;
    head?: Snippet;
    action?: Snippet;
    /** In section columns of 4 cells. */
    width?: number;
    children?: Snippet;
  } = $props();
</script>

<section class="section" style:--section-cells={width > 1 ? 4 * width : undefined}>
  <div class="section-head">
    {#if head}
      {@render head()}
    {:else}
      <h2>{title}</h2>
      {@render action?.()}
    {/if}
  </div>
  {#if children}
    <div class="section-grid">
      {@render children()}
    </div>
  {/if}
</section>
