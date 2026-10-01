<script lang="ts">
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { domainOf, entityName } from "../model/home";
  import { isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  /** A 1×1 switch for room cards (lights, switches): icon and name, tap to toggle. */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const on = $derived(s?.state === "on");
</script>

{#if s}
  <button
    class="mini"
    class:on
    class:unavailable={isUnavailable(s)}
    aria-pressed={on}
    disabled={isUnavailable(s)}
    onclick={() => void callService(domainOf(entityId), "toggle", {}, { entity_id: entityId })}
  >
    <span class="mini-icon"><Icon path={entityIcon(s)} size={20} /></span>
    <span class="mini-name">{entityName(s, home.registry[entityId], area)}</span>
  </button>
{/if}
