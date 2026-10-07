<script lang="ts">
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { exists, t } from "../i18n/index.svelte";
  import { weatherEntityId } from "../model/model.svelte";
  import { formatNumber } from "./format";
  import Icon from "./Icon.svelte";
  import { entityIcon } from "./icons";

  /** The outside weather: its icon, temperature and the sky in words. Nothing without a weather entity. */
  const weatherId = $derived(weatherEntityId());
  watchEntities(() => [weatherId]);
  const weather = $derived(home.entity(weatherId));
</script>

{#if weather && weather.attributes.temperature != null}
  <div class="weather">
    <Icon path={entityIcon(weather)} size={32} />
    <strong>{formatNumber(weather.attributes.temperature)}°</strong>
    {#if exists(`weather.${weather.state}`)}<span class="weather-text">{t(`weather.${weather.state}`)}</span>{/if}
  </div>
{/if}
