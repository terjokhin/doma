<script lang="ts">
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { domainOf, entityName } from "../model/home";
  import { formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  /** Lights, switches, fans: the whole tile is the button. */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const on = $derived(s?.state === "on");
  const brightness = $derived(
    on && typeof s?.attributes.brightness === "number" ? Math.round((s.attributes.brightness / 255) * 100) : undefined,
  );
</script>

{#if s}
  <button
    class="tile"
    class:on
    class:unavailable={isUnavailable(s)}
    aria-pressed={on}
    disabled={isUnavailable(s)}
    onclick={() => void callService(domainOf(entityId), "toggle", {}, { entity_id: entityId })}
  >
    <span class="tile-icon">
      <Icon path={entityIcon(s)} />
    </span>
    <span class="tile-body">
      <div class="tile-name">{entityName(s, home.registry[entityId], area)}</div>
      <div class="tile-state">{brightness !== undefined ? `${brightness}%` : formatState(s).value}</div>
    </span>
  </button>
{/if}
