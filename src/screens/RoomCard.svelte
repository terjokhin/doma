<script lang="ts">
  import { mdiLightbulb, mdiLightbulbOutline } from "@mdi/js";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import type { Room } from "../model/home";
  import { navigate } from "../router.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";

  let { room }: { room: Room } = $props();

  watchEntities(() => [room.temperature, room.humidity, ...room.lights]);
  const temperature = $derived(home.entity(room.temperature));
  const humidity = $derived(home.entity(room.humidity));
  const lightsOn = $derived(room.lights.filter((id) => home.entity(id)?.state === "on").length);
  const lit = $derived(lightsOn > 0);
  const open = () => navigate(`/room/${room.area.area_id}`);

  function toggleLights(e: MouseEvent) {
    e.stopPropagation();
    void callService("homeassistant", lit ? "turn_off" : "turn_on", {}, { entity_id: room.lights });
  }
</script>

<div class="room-card" class:lit role="link" tabindex="0" onclick={open} onkeydown={(e) => e.key === "Enter" && open()}>
  <div>
    <div class="room-name">{room.area.name}</div>
    {#if temperature || humidity}
      <div class="room-climate">
        {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
        {#if humidity}<span>{formatHumidity(humidity)}</span>{/if}
      </div>
    {/if}
  </div>
  {#if room.lights.length > 0}
    <div class="room-foot">
      <span class="room-lights">{t("home.lightsOn", { count: lightsOn })}</span>
      <button class="round-btn" class:on={lit} aria-label={lit ? t("room.allOff") : t("room.allOn")} onclick={toggleLights}>
        <Icon path={lit ? mdiLightbulb : mdiLightbulbOutline} />
      </button>
    </div>
  {/if}
</div>
