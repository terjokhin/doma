<script lang="ts">
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { entityName } from "../model/home";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  /** A scene: tapping the tile activates it. A scene has no on or off, only when it was last activated. */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  // Only "unavailable" counts here: a scene that was never activated is "unknown", and still works.
  const unavailable = $derived(s?.state === "unavailable");
</script>

{#if s}
  <button
    class="tile"
    class:unavailable
    disabled={unavailable}
    onclick={() => void callService("scene", "turn_on", {}, { entity_id: entityId })}
  >
    <span class="tile-icon">
      <Icon path={entityIcon(s)} />
    </span>
    <span class="tile-body">
      <div class="tile-name">{entityName(s, home.registry[entityId], area)}</div>
    </span>
  </button>
{/if}
