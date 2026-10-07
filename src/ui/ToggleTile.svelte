<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import type { AreaEntry } from "../ha/types";
  import { t } from "../i18n/index.svelte";
  import { entityName } from "../model/home";
  import { formatState, isUnavailable } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";
  import { Dimmer } from "./dim.svelte";
  import { lightOf, setLevel, toggle } from "./light";
  import { isPending, send } from "./pending.svelte";
  import { sheet } from "./sheet.svelte";
  import { tintOf } from "./tint";

  /**
   * Lights, switches, fans on room screens and lenses: split like the tiles on Home (ui/Tile.svelte). The icon switches
   * it, the rest opens its pop-up; while on, only the icon takes a colour. A dimmable light fills to its brightness,
   * and dragging across the tile dims it (ui/dim.svelte.ts).
   */
  let { entityId, area }: { entityId: string; area?: AreaEntry } = $props();

  watchEntities(() => [entityId]);
  const s = $derived(home.entity(entityId));
  const on = $derived(s?.state === "on");
  const light = $derived(s && lightOf(s));
  const name = $derived(s ? entityName(s, home.registry[entityId], area) : "");
  const dims = $derived(!!light?.dimmable && !!s && !isUnavailable(s));

  const dimmer = new Dimmer(
    () => light?.brightness ?? 0,
    (percent) => {
      if (!s || (percent === 0 && !on)) return;
      const state = s;
      if (percent > 0 && on) void setLevel(state, percent);
      else send(entityId, [entityId], name, () => setLevel(state, percent));
    },
  );
  // A new state from HA replaces what was asked for.
  $effect(() => {
    void light?.brightness;
    void on;
    dimmer.reset();
  });
  /** While dragging, and until HA answers, the tile shows the brightness asked for. */
  const asked = $derived(dimmer.dragging ?? dimmer.sent);
  const shownOn = $derived(asked === null ? on : asked > 0);
  const stateText = $derived.by(() => {
    if (asked !== null) return asked > 0 ? `${asked}%` : t("state.off");
    return light?.brightness !== undefined ? `${light.brightness}%` : s ? formatState(s).value : "";
  });

  function body() {
    if (!dimmer.dragged() && area) sheet.open({ kind: "entity", entityId, area });
  }
</script>

{#if s}
  <div class="tile {tintOf(s)}" class:on={shownOn} class:unavailable={isUnavailable(s)} class:dimming={dimmer.dragging !== null}>
    {#if light?.dimmable}
      <span class="card-tile-fill" style:transform="scaleX({dimmer.shown / 100})"></span>
    {/if}
    <button
      class="tile-icon"
      class:pending={isPending(entityId)}
      aria-pressed={shownOn}
      aria-label={on ? t("tile.turnOff", { name }) : t("tile.turnOn", { name })}
      disabled={isUnavailable(s)}
      onclick={() => send(entityId, [entityId], name, () => toggle(s!))}
    >
      <Icon path={entityIcon(s)} />
    </button>
    <button
      class="tile-body"
      class:dims
      aria-label={t("tile.more", { name })}
      disabled={!area}
      onclick={body}
      onpointerdown={dims ? dimmer.down : undefined}
      onpointermove={dims ? dimmer.move : undefined}
      onpointerup={dims ? dimmer.up : undefined}
      onpointercancel={dims ? dimmer.cancel : undefined}
    >
      <div class="tile-name">{name}</div>
      <div class="tile-state">{stateText}</div>
    </button>
  </div>
{/if}
