<script lang="ts">
  import type { HassEntity } from "home-assistant-js-websocket";
  import { t } from "../i18n/index.svelte";
  import Icon from "./Icon.svelte";
  import { ICON_SETS, iconName, setIcon, type IconKind } from "./icons";

  /**
   * In edit mode, the icons an entity can have, to say what it is (LAYOUTS.md, "Room screens"): a ceiling light or a
   * sconce, an air conditioner or a radiator, a kettle or a socket. In a room's dock for a selected tile, and in Home's
   * menu for a card's control. Changes the draft.
   */
  let { entity, kind }: { entity: HassEntity; kind: IconKind } = $props();

  const current = $derived(iconName(entity, kind));
</script>

<div class="icon-picker" role="radiogroup" aria-label={t("edit.icon")}>
  {#each Object.entries(ICON_SETS[kind]) as [key, path] (key)}
    <button
      role="radio"
      aria-checked={key === current}
      aria-label={t(`icons.${key}`)}
      title={t(`icons.${key}`)}
      onclick={() => key !== current && setIcon(entity, kind, key)}
    >
      <Icon {path} size={22} />
    </button>
  {/each}
</div>
