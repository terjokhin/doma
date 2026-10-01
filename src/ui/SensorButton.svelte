<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { entityName } from "../model/home";
  import { formatState, isUnavailable } from "./format";

  /** A 1×1 sensor reading for room cards: the value, and the name below it. */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const shown = $derived(formatState(s));
</script>

{#if s}
  <div class="mini sensor" class:unavailable={isUnavailable(s)}>
    <span class="mini-value">{shown.value}{#if shown.unit}<small>{shown.unit}</small>{/if}</span>
    <span class="mini-name">{entityName(s, home.registry[entityId], area)}</span>
  </div>
{/if}
