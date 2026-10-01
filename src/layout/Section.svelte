<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * A titled group, 4 cells wide: a title band of half a cell, then a 4-column grid of GridItems.
   * The band shows `title` (and an optional `action` on the right), or a custom `head`.
   */
  let {
    title,
    head,
    action,
    children,
  }: { title?: string; head?: Snippet; action?: Snippet; children?: Snippet } = $props();
</script>

<section class="section">
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
