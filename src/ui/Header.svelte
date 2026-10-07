<script lang="ts">
  import { mdiViewDashboardEditOutline } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import { editor } from "../layout/layoutEditor.svelte";
  import { clock, formatDate, formatTime, greetingKey } from "./clock.svelte";
  import Icon from "./Icon.svelte";
  import SettingsMenu from "./SettingsMenu.svelte";
  import Weather from "./Weather.svelte";

  /**
   * Big clock, date and outside weather (its temperature, and the sky in words): readable from across the room.
   * On wide screens the sidebar (ui/Sidebar.svelte) shows them instead.
   */
</script>

<header class="header">
  <div>
    <div class="clock">{formatTime(clock.now)}</div>
    <div class="header-sub">
      {t(greetingKey(clock.now.getHours()))} · {formatDate(clock.now)}
    </div>
  </div>
  <div class="header-side">
    <Weather />
    <button class="round-btn" aria-label={t("edit.open")} onclick={() => editor.start("/")}>
      <Icon path={mdiViewDashboardEditOutline} />
    </button>
    <SettingsMenu />
  </div>
</header>
