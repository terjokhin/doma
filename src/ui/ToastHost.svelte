<script lang="ts">
  import { toast } from "./toast.svelte";

  /** The message bar at the bottom of the screen (ui/toast.svelte.ts), above everything, pop-ups included. */
  const current = $derived(toast.current);
</script>

{#if current}
  <div class="toast" class:error={current.error} role="status">
    <span>{current.text}</span>
    {#if current.action}
      <button
        onclick={() => {
          const run = current.action!.run;
          toast.hide();
          run();
        }}>{current.action.label}</button
      >
    {/if}
  </div>
{/if}
