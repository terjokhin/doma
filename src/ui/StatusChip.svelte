<script lang="ts">
  import { lensChip } from "../model/chips.svelte";
  import type { LensId } from "../model/lenses";
  import { navigate } from "../router.svelte";
  import Icon from "./Icon.svelte";
  import { VIEW_ICONS } from "./icons";

  /**
   * One lens's status chip, shown only when the lens has something to say; it opens the lens. A component per
   * lens so that a state change only recomputes the chips that read it, not all of them.
   */
  let { lens }: { lens: LensId } = $props();

  const chip = $derived(lensChip(lens));
</script>

{#if chip}
  <button class="chip status-chip {chip.tone ?? ''}" onclick={() => navigate(`/lens/${lens}`)}>
    <Icon path={VIEW_ICONS[lens]} size={18} />
    {chip.text}
  </button>
{/if}
