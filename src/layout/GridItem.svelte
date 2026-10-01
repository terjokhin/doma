<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Size } from "./pack";

  /** One element in a section's grid, `size` cells large. The element inside fills it. */
  let { size, children }: { size: Size; children: Snippet } = $props();
</script>

<div class="grid-item" style:grid-column="span {size.w}" style:grid-row="span {size.h}">
  {@render children()}
</div>
