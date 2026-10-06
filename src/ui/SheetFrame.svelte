<script lang="ts">
  import { mdiClose } from "@mdi/js";
  import type { Snippet } from "svelte";
  import { t } from "../i18n/index.svelte";
  import { navigate } from "../router.svelte";
  import Icon from "./Icon.svelte";
  import { sheet } from "./sheet.svelte";

  /**
   * The frame every pop-up shares (ui/SheetHost.svelte): a header with the icon (the same chip as on the tile, and
   * it does the same thing), the name, a line of state and a close button; the controls; and a way to the room.
   */
  let {
    icon,
    tint,
    active,
    name,
    sub,
    chipLabel,
    chipDisabled = false,
    pending = false,
    onChip,
    areaId,
    roomName,
    children,
  }: {
    icon: string;
    tint: string;
    active: boolean;
    name: string;
    sub: string;
    chipLabel: string;
    chipDisabled?: boolean;
    pending?: boolean;
    onChip: () => void;
    areaId: string;
    roomName: string;
    children: Snippet;
  } = $props();
</script>

<header class="sheet-head {tint}" class:on={active}>
  <button class="tile-chip" class:pending aria-label={chipLabel} aria-pressed={active} disabled={chipDisabled} onclick={onChip}>
    <Icon path={icon} size={26} />
  </button>
  <div class="sheet-title">
    <h2>{name}</h2>
    <p>{sub}</p>
  </div>
  <button class="round-btn" aria-label={t("sheet.close")} onclick={sheet.close}>
    <Icon path={mdiClose} size={24} />
  </button>
</header>
<div class="sheet-body">
  {@render children()}
</div>
<footer class="sheet-foot">
  <button class="sheet-wide" onclick={() => navigate(`/room/${areaId}`)}>{t("sheet.openRoom", { room: roomName })}</button>
</footer>
