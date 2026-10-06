<script lang="ts">
  /** A small ring with a label, in a tile's corner: a light's brightness, a thermostat's target. */
  let { value, label }: { /** 0–1: how much of the ring is drawn. */ value: number; label: string } = $props();

  const LENGTH = 2 * Math.PI * 13;
</script>

<span class="ring" aria-hidden="true">
  <svg viewBox="0 0 30 30">
    <circle class="ring-track" cx="15" cy="15" r="13" />
    {#if value > 0}
      <circle class="ring-arc" cx="15" cy="15" r="13" stroke-dasharray="{value * LENGTH} {LENGTH}" />
    {/if}
  </svg>
  <span class="ring-label">{label}</span>
</span>
