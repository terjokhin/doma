<script lang="ts">
  import { mdiChevronRight } from "@mdi/js";
  import { callService, home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import GridItem from "../layout/GridItem.svelte";
  import { tabsOf } from "../layout/homeLayout";
  import { homeLayout } from "../layout/layoutStore.svelte";
  import { sectionHeight } from "../layout/pack";
  import Section from "../layout/Section.svelte";
  import SectionColumns from "../layout/SectionColumns.svelte";
  import { allRooms, LENSES, lensView, type LensId, type LensSection } from "../model/lenses";
  import { homeModel } from "../model/model.svelte";
  import { navigate } from "../router.svelte";
  import ClimateTile from "../ui/ClimateTile.svelte";
  import DeviceTile from "../ui/DeviceTile.svelte";
  import Icon from "../ui/Icon.svelte";
  import NavBand, { docked } from "../ui/NavBand.svelte";
  import SensorTile from "../ui/SensorTile.svelte";
  import ToggleTile from "../ui/ToggleTile.svelte";

  /**
   * One function across the house (LAYOUTS.md, "Lens screens"): the navigation band, a title band, then per floor
   * a heading and a section per room, packed into columns like a room screen. A room's name opens the room.
   */
  let { lens }: { lens: LensId } = $props();

  // What decides which rooms and devices show (e.g. which devices are offline) has to be live.
  watchEntities(() => allRooms(homeModel()).flatMap((room) => LENSES[lens].watched(room)));
  const floors = $derived(lensView(homeModel(), lens));
  const summary = $derived(LENSES[lens].chip(allRooms(homeModel())));

  const isOn = (id: string) => home.entity(id)?.state === "on";
  const lightsOn = (ids: string[]) => ids.filter(isOn);
  const houseLightsOn = $derived(lens === "lights" ? lightsOn(allRooms(homeModel()).flatMap((r) => r.lights)) : []);

  function switchLights(ids: string[], on: boolean) {
    if (ids.length) void callService("homeassistant", on ? "turn_on" : "turn_off", {}, { entity_id: ids });
  }
</script>

{#snippet section(s: LensSection)}
  {#snippet head()}
    <button class="section-link" onclick={() => navigate(`/room/${s.room.area.area_id}`)}>
      <h2>{s.room.area.name}</h2>
      <Icon path={mdiChevronRight} size={18} />
    </button>
    {#if lens === "lights" && s.room.lights.length > 1}
      {@const anyOn = lightsOn(s.room.lights).length > 0}
      <button class="chip" onclick={() => switchLights(s.room.lights, !anyOn)}>
        {anyOn ? t("room.allOff") : t("room.allOn")}
      </button>
    {/if}
  {/snippet}
  <Section {head}>
    {#each s.items as item (item.id)}
      <GridItem size={item.size}>
        {#if item.kind === "climate"}
          <ClimateTile entityId={item.id} area={s.room.area} />
        {:else if item.kind === "toggle"}
          <ToggleTile entityId={item.id} area={s.room.area} />
        {:else if item.kind === "device"}
          <DeviceTile device={item.device} />
        {:else}
          <SensorTile entityId={item.id} area={s.room.area} />
        {/if}
      </GridItem>
    {/each}
  </Section>
{/snippet}

<main class="screen" class:docked={docked()}>
  <NavBand current={lens} tabs={tabsOf(homeLayout())} />
  <header class="lens-header">
    <h1>{t(`lens.names.${lens}`)}</h1>
    <span class="lens-summary {summary?.tone ?? ''}">{summary?.text ?? t(`lens.calm.${lens}`)}</span>
    <span class="spacer"></span>
    {#if houseLightsOn.length}
      <button class="chip" onclick={() => switchLights(houseLightsOn, false)}>{t("lens.allLightsOff")}</button>
    {/if}
  </header>

  {#if !floors.length}<p class="empty">{t(`lens.empty.${lens}`)}</p>{/if}

  {#each floors as floor (floor.key)}
    <h2 class="floor-band">{floor.name ?? t("app.otherFloor")}</h2>
    <SectionColumns
      sections={floor.sections}
      key={(s) => s.room.area.area_id}
      height={(s) => sectionHeight(s.items.map((i) => i.size))}
      {section}
    />
  {/each}
</main>
