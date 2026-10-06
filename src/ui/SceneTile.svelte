<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { entityName } from "../model/home";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";
  import { isPending } from "./pending.svelte";
  import { runScene } from "./scene";

  /**
   * A scene: tapping the tile runs it, and offers Undo (ui/scene.ts). A scene has no on or off, only when it was last
   * activated.
   */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  // Only "unavailable" counts here: a scene that was never activated is "unknown", and still works.
  const unavailable = $derived(s?.state === "unavailable");
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
</script>

{#if s}
  <button
    class="tile"
    class:unavailable
    disabled={unavailable}
    onclick={() => void runScene(entityId, name)}
  >
    <span class="tile-icon" class:pending={isPending(entityId)}>
      <Icon path={entityIcon(s)} />
    </span>
    <span class="tile-body">
      <div class="tile-name">{name}</div>
    </span>
  </button>
{/if}
