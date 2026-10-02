<script lang="ts">
  import { mdiViewDashboardEditOutline } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { language, t } from "../i18n/index.svelte";
  import { editor } from "../layout/layoutEditor.svelte";
  import { weatherEntityId } from "../model/model.svelte";
  import { formatNumber } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";
  import SettingsMenu from "./SettingsMenu.svelte";

  /** Big clock, date and outside weather: readable from across the room. */

  let now = $state(new Date());
  $effect(() => {
    const id = setInterval(() => (now = new Date()), 10_000);
    return () => clearInterval(id);
  });

  function greetingKey(hour: number) {
    if (hour < 5) return "home.greeting_night";
    if (hour < 12) return "home.greeting_morning";
    if (hour < 18) return "home.greeting_afternoon";
    if (hour < 23) return "home.greeting_evening";
    return "home.greeting_night";
  }

  const timeFormat = $derived(new Intl.DateTimeFormat(language(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
  const dateFormat = $derived(new Intl.DateTimeFormat(language(), { weekday: "long", day: "numeric", month: "long" }));
  const weatherId = $derived(weatherEntityId());
  watchEntities(() => [weatherId]);
  const weather = $derived(home.entity(weatherId));
</script>

<header class="header">
  <div>
    <div class="clock">{timeFormat.format(now)}</div>
    <div class="header-sub">
      {t(greetingKey(now.getHours()))} · {dateFormat.format(now)}
    </div>
  </div>
  <div class="header-side">
    {#if weather && weather.attributes.temperature != null}
      <div class="weather">
        <Icon path={entityIcon(weather)} size={32} />
        <strong>{formatNumber(weather.attributes.temperature)}°</strong>
      </div>
    {/if}
    <button class="round-btn" aria-label={t("edit.open")} onclick={() => editor.start("/")}>
      <Icon path={mdiViewDashboardEditOutline} />
    </button>
    <SettingsMenu />
  </div>
</header>
