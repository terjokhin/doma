<script lang="ts">
  import { mdiClose, mdiEyeOffOutline, mdiEyeOutline } from "@mdi/js";
  import type { HassEntity } from "home-assistant-js-websocket";
  import { t } from "../i18n/index.svelte";
  import Icon from "./Icon.svelte";
  import IconPicker from "./IconPicker.svelte";
  import type { IconKind } from "./icons";

  /**
   * In a room's edit mode, the dock (ui/EditDock.svelte's place and look) for the selected tile: "Hide" ("Show" for a
   * hidden one) and, for a light, a thermostat or a switch, the icons it can have, to say what it is.
   */
  let {
    name,
    hidden,
    entity,
    kind,
    onHide,
    onClose,
  }: {
    name: string;
    hidden: boolean;
    entity: HassEntity;
    /** Which icons it can be given; undefined when it keeps its own (a sensor, a media player). */
    kind?: IconKind;
    onHide: () => void;
    onClose: () => void;
  } = $props();
</script>

<div class="edit-dock tile-dock" role="toolbar" aria-label={name}>
  <span class="edit-dock-title">{name}</span>
  <button class="edit-dock-action" onclick={onHide}>
    <Icon path={hidden ? mdiEyeOutline : mdiEyeOffOutline} size={20} />{t(hidden ? "edit.showItem" : "edit.hideItem")}
  </button>
  <button class="edit-dock-close" aria-label={t("edit.closeRoom", { name })} onclick={onClose}>
    <Icon path={mdiClose} size={22} />
  </button>
  {#if kind}<IconPicker {entity} {kind} />{/if}
</div>
