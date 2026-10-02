<script lang="ts" module>
  import { grid, SECTION_WIDTH } from "../layout/grid.svelte";

  /** On a phone (one section wide) the tabs move to a bar at the bottom; screens with tabs then leave room for it. */
  export const docked = () => grid.cols === SECTION_WIDTH;
</script>

<script lang="ts">
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import { chipEntities, chips, type LensId } from "../model/lenses";
  import { homeModel } from "../model/model.svelte";
  import { navigate } from "../router.svelte";
  import Icon from "./Icon.svelte";
  import { VIEW_ICONS } from "./icons";

  /**
   * The navigation band under the header (ROADMAP.md, "Navigation"): tabs to Home and the user's lenses, and status
   * chips that only show when something needs a look; each chip opens its lens. While `editing`, it shows the draft
   * tabs and doesn't react.
   */
  let {
    current,
    tabs,
    editing = false,
  }: { current: "home" | LensId; tabs: readonly LensId[]; editing?: boolean } = $props();

  watchEntities(() => chipEntities(homeModel()));
  const shown = $derived(chips(homeModel()));
  const views = $derived(["home" as const, ...tabs]);

  const open = (view: "home" | LensId) => navigate(view === "home" ? "/" : `/lens/${view}`);
  const name = (view: "home" | LensId) => (view === "home" ? t("views.home") : t(`lens.names.${view}`));
</script>

{#snippet tabList()}
  {#each views as view (view)}
    <button class="tab" aria-current={view === current ? "page" : undefined} onclick={() => open(view)}>
      <Icon path={VIEW_ICONS[view]} size={20} />
      <span>{name(view)}</span>
    </button>
  {/each}
{/snippet}

{#if !docked() || shown.length}
  <nav class="nav-band" inert={editing}>
    {#if !docked()}
      <div class="tabs">{@render tabList()}</div>
    {/if}
    {#if shown.length}
      <div class="status-chips">
        {#each shown as chip (chip.lens)}
          <button class="chip status-chip {chip.tone ?? ''}" onclick={() => open(chip.lens)}>
            <Icon path={VIEW_ICONS[chip.lens]} size={18} />
            {chip.text}
          </button>
        {/each}
      </div>
    {/if}
  </nav>
{/if}
{#if docked()}
  <nav class="dock" inert={editing}>{@render tabList()}</nav>
{/if}
