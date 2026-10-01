<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { entityName } from "../model/home";
  import { formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const shown = $derived(formatState(s));
</script>

{#if s}
  <div class="tile" class:unavailable={isUnavailable(s)}>
    <span class="tile-icon">
      <Icon path={entityIcon(s)} />
    </span>
    <span class="tile-body">
      <div class="tile-state">{entityName(s, home.registry[entityId], area)}</div>
      <div class="sensor-value">
        {shown.value}{#if shown.unit}<small>{shown.unit}</small>{/if}
      </div>
    </span>
  </div>
{/if}
