<script lang="ts">
  import { mdiChevronLeft } from "@mdi/js";
  import type { Snippet } from "svelte";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import { findRoom } from "../model/model.svelte";
  import { navigate } from "../router.svelte";
  import ClimateTile from "../ui/ClimateTile.svelte";
  import { formatHumidity, formatTemperature } from "../ui/format";
  import Icon from "../ui/Icon.svelte";
  import SensorTile from "../ui/SensorTile.svelte";
  import ToggleTile from "../ui/ToggleTile.svelte";

  let { areaId }: { areaId: string } = $props();

  const room = $derived(findRoom(areaId));
  watchEntities(() => [room?.temperature, room?.humidity, ...(room?.lights ?? [])]);
  const temperature = $derived(home.entity(room?.temperature));
  const humidity = $derived(home.entity(room?.humidity));
  const lightsOn = $derived(room?.lights.some((id) => home.entity(id)?.state === "on") ?? false);
  const empty = $derived(
    !!room && [room.lights, room.climate, room.switches, room.media, room.sensors].every((l) => l.length === 0),
  );

  function toggleAll() {
    if (room) void callService("homeassistant", lightsOn ? "turn_off" : "turn_on", {}, { entity_id: room.lights });
  }
</script>

{#snippet section(title: string, ids: string[], tile: Snippet<[string]>, action?: Snippet)}
  {#if ids.length > 0}
    <section class="section">
      <div class="section-head">
        <h2>{title}</h2>
        {@render action?.()}
      </div>
      <div class="grid">
        {#each ids as id (id)}
          {@render tile(id)}
        {/each}
      </div>
    </section>
  {/if}
{/snippet}

{#if !room}
  <div class="center">{t("app.connecting")}</div>
{:else}
  {@const area = room.area}

  {#snippet toggle(id: string)}<ToggleTile entityId={id} {area} />{/snippet}
  {#snippet climate(id: string)}<ClimateTile entityId={id} {area} />{/snippet}
  {#snippet sensor(id: string)}<SensorTile entityId={id} {area} />{/snippet}
  {#snippet allLights()}
    {#if room.lights.length > 1}
      <button class="chip" onclick={toggleAll}>{lightsOn ? t("room.allOff") : t("room.allOn")}</button>
    {/if}
  {/snippet}

  <main class="screen">
    <header class="room-header">
      <button class="round-btn" aria-label={t("room.back")} onclick={() => navigate("/")}>
        <Icon path={mdiChevronLeft} size={28} />
      </button>
      <h1>{area.name}</h1>
      <div class="room-climate">
        {#if temperature}<span>{formatTemperature(temperature)}</span>{/if}
        {#if humidity}<span>{formatHumidity(humidity)}</span>{/if}
      </div>
    </header>

    {#if empty}<p class="empty">{t("room.empty")}</p>{/if}

    {@render section(t("room.lights"), room.lights, toggle, allLights)}
    {@render section(t("room.climate"), room.climate, climate)}
    {@render section(t("room.switches"), room.switches, toggle)}
    {@render section(t("room.media"), room.media, sensor)}
    {@render section(t("room.sensors"), room.sensors, sensor)}
  </main>
{/if}
