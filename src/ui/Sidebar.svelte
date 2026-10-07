<script lang="ts">
  import { mdiViewDashboardEditOutline } from "@mdi/js";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import { tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { chipEntities, LENS_IDS, type LensId } from "../model/lenses";
  import { homeModel } from "../model/model.svelte";
  import { navigate, route } from "../router.svelte";
  import { clock, formatDate, formatTime, greetingKey } from "./clock.svelte";
  import Icon from "./Icon.svelte";
  import { VIEW_ICONS } from "./icons";
  import SettingsMenu from "./SettingsMenu.svelte";
  import StatusChip from "./StatusChip.svelte";
  import Weather from "./Weather.svelte";

  /**
   * On wide screens, a column at the left of every screen in place of the header and the tab band (ROADMAP.md,
   * "Navigation"): the clock, date and greeting, the weather, what's on (the lenses' status chips, each opening its
   * lens), then Home and the lenses that are tabs, and at the bottom the edit button (on Home) and settings. It
   * stays built while the screens change. While a screen is being edited it doesn't react, and its tabs follow
   * Home's draft.
   */
  watchEntities(() => chipEntities(homeModel()));
  const editing = $derived(editor.target !== null);
  const tabs = $derived(tabsOf(editor.target === "/" ? editor.layout : homeLayout()));
  const views = $derived(["home" as const, ...tabs]);
  const current = $derived(route() === "/" ? "home" : route().match(/^\/lens\/(\w+)$/)?.[1]);

  const open = (view: "home" | LensId) => navigate(view === "home" ? "/" : `/lens/${view}`);
  const name = (view: "home" | LensId) => (view === "home" ? t("views.home") : t(`lens.names.${view}`));
</script>

<aside class="sidebar" inert={editing}>
  <div class="sidebar-clock">{formatTime(clock.now)}</div>
  <div class="sidebar-date">{formatDate(clock.now)}</div>
  <div class="sidebar-greeting">{t(greetingKey(clock.now.getHours()))}</div>
  <Weather />
  <div class="sidebar-status">
    {#each LENS_IDS as lens (lens)}<StatusChip {lens} />{/each}
  </div>
  <nav class="sidebar-tabs">
    {#each views as view (view)}
      <button class="sidebar-tab" aria-current={view === current ? "page" : undefined} onclick={() => open(view)}>
        <Icon path={VIEW_ICONS[view]} size={22} />
        <span>{name(view)}</span>
      </button>
    {/each}
  </nav>
  <div class="sidebar-foot">
    {#if current === "home"}
      <button class="round-btn" aria-label={t("edit.open")} onclick={() => editor.start("/")}>
        <Icon path={mdiViewDashboardEditOutline} />
      </button>
    {/if}
    <SettingsMenu />
  </div>
</aside>
