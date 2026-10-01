<script lang="ts">
  import { mdiChevronLeft } from "@mdi/js";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import { sectionHeight, type Size } from "../layout/pack";
  import Section from "../layout/Section.svelte";
  import SectionColumns from "../layout/SectionColumns.svelte";
  import { SIZES } from "../layout/sizes";
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

  interface Group {
    kind: "lights" | "climate" | "switches" | "media" | "sensors";
    title: string;
    ids: string[];
    size: Size;
  }

  // The room's sections, in reading order; empty ones are left out.
  const groups = $derived.by((): Group[] => {
    if (!room) return [];
    const all: Group[] = [
      { kind: "lights", title: t("room.lights"), ids: room.lights, size: SIZES.toggle },
      { kind: "climate", title: t("room.climate"), ids: room.climate, size: SIZES.climate },
      { kind: "switches", title: t("room.switches"), ids: room.switches, size: SIZES.toggle },
      { kind: "media", title: t("room.media"), ids: room.media, size: SIZES.media },
      { kind: "sensors", title: t("room.sensors"), ids: room.sensors, size: SIZES.sensor },
    ];
    return all.filter((g) => g.ids.length > 0);
  });
  const empty = $derived(groups.length === 0);

  function toggleAll() {
    if (room) void callService("homeassistant", lightsOn ? "turn_off" : "turn_on", {}, { entity_id: room.lights });
  }
</script>

{#if !room}
  <div class="center">{t("app.connecting")}</div>
{:else}
  {@const area = room.area}

  {#snippet allLights()}
    {#if room.lights.length > 1}
      <button class="chip" onclick={toggleAll}>{lightsOn ? t("room.allOff") : t("room.allOn")}</button>
    {/if}
  {/snippet}

  {#snippet group(g: Group)}
    <Section title={g.title} action={g.kind === "lights" ? allLights : undefined}>
      {#each g.ids as id (id)}
        <GridItem size={g.size}>
          {#if g.kind === "climate"}
            <ClimateTile entityId={id} {area} />
          {:else if g.kind === "lights" || g.kind === "switches"}
            <ToggleTile entityId={id} {area} />
          {:else}
            <SensorTile entityId={id} {area} />
          {/if}
        </GridItem>
      {/each}
    </Section>
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

    <SectionColumns sections={groups} key={(g) => g.kind} height={(g) => sectionHeight(g.ids.map(() => g.size))} section={group} />
  </main>
{/if}
