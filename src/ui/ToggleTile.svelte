<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { entityName } from "../model/home";
  import { formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";
  import { lightOf, toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import { sheet } from "./sheet.svelte";
  import { tintOf } from "./tint";

  /**
   * Lights, switches, fans on room screens and lenses: split like the tiles on Home (ui/Tile.svelte). The icon switches
   * it, the rest opens its pop-up; while on, only the icon takes a colour.
   */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const on = $derived(s?.state === "on");
  const brightness = $derived(s && lightOf(s).brightness);
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
</script>

{#if s}
  <div class="tile {tintOf(s)}" class:on class:unavailable={isUnavailable(s)}>
    <button
      class="tile-icon"
      class:pending={isPending(entityId)}
      aria-pressed={on}
      aria-label={on ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
      disabled={isUnavailable(s)}
      onclick={() => send(entityId, [entityId], name, () => toggle(s!))}
    >
      <Icon path={entityIcon(s)} />
    </button>
    <button
      class="tile-body"
      aria-label={t("tile.more", { name })}
      disabled={!area}
      onclick={() => area && sheet.open({ kind: "entity", entityId, area })}
    >
      <div class="tile-name">{name}</div>
      <div class="tile-state">{brightness !== undefined ? `${brightness}%` : formatState(s).value}</div>
    </button>
  </div>
{/if}
