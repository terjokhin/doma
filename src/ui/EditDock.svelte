<script lang="ts">
  import { mdiClose, mdiEyeOffOutline, mdiEyeOutline, mdiPencilOutline, mdiTableRowPlusAfter } from "@mdi/js";
  import { tick } from "svelte";
  import { t } from "../i18n/index.svelte";
  import { CARD_SIZES, ROOM_NAME_MAX, type CardSize } from "../layout/homeLayout";
  import Icon from "./Icon.svelte";

  /**
   * In a board's edit mode, a bar at the bottom of the screen (LAYOUTS.md, "Edit mode"): for the selected card (a room
   * on Home, a section on a room screen), its name (tap it to rename it in Doma), size, "Own row" (in a stack) and
   * "Hide" ("Show" for a hidden section); with none selected, a hint. Always in the same place, whichever card is
   * selected, and big enough to hit on a wall tablet. A room card itself keeps its controls' × and "+".
   */
  let {
    name,
    haName,
    nameLabel,
    hint,
    size,
    hidden = false,
    onRename,
    onSize,
    onOwnRow,
    onHide,
    onClose,
  }: {
    /** The selected card's name; undefined with none selected. */
    name?: string;
    /** The name it has when it isn't given one (HA's, or the section's own), which an empty name goes back to. */
    haName?: string;
    /** What the name field is called, for a screen reader. */
    nameLabel?: string;
    /** Shown with nothing selected. */
    hint?: string;
    size?: CardSize;
    /** The card is hidden (a section, shown in edit mode only): "Hide" shows it again instead. */
    hidden?: boolean;
    onRename: (name: string) => void;
    onSize: (size: CardSize) => void;
    /** Take it out of its stack; undefined when it has a row of its own. */
    onOwnRow?: () => void;
    /** Hide it, or show it again when `hidden`; no "Hide" without it. */
    onHide?: () => void;
    onClose: () => void;
  } = $props();

  let renaming = $state(false);
  let input = $state<HTMLInputElement>();

  async function startRename() {
    renaming = true;
    await tick();
    input?.select();
  }

  function finish(save: boolean) {
    if (!renaming) return;
    renaming = false;
    if (save && input) onRename(input.value);
  }

  function key(e: KeyboardEvent) {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") {
      e.stopPropagation(); // only the name, not the selection
      finish(false);
    }
  }

  // Another room selected: the field closes without saving.
  $effect(() => {
    void haName;
    renaming = false;
  });
</script>

<div class="edit-dock" role="toolbar" aria-label={name ?? t("edit.title")}>
  {#if name}
    {#if renaming}
      <input
        class="edit-dock-input"
        bind:this={input}
        value={name}
        placeholder={haName}
        maxlength={ROOM_NAME_MAX}
        aria-label={nameLabel ?? t("edit.roomName")}
        onkeydown={key}
        onblur={() => finish(true)}
      />
    {:else}
      <button class="edit-dock-name" aria-label={t("edit.rename", { name })} onclick={startRename}>
        <span>{name}</span><Icon path={mdiPencilOutline} size={16} />
      </button>
    {/if}
    <div class="edit-dock-sizes" role="radiogroup" aria-label={t("edit.size")}>
      {#each CARD_SIZES as s (s)}
        <button role="radio" aria-checked={s === size} onclick={() => s !== size && onSize(s)}>{t(`edit.sizes.${s}`)}</button>
      {/each}
    </div>
    {#if onOwnRow}
      <button class="edit-dock-action" onclick={onOwnRow}>
        <Icon path={mdiTableRowPlusAfter} size={20} />{t("edit.ownRowItem")}
      </button>
    {/if}
    {#if onHide}
      <button class="edit-dock-action" onclick={onHide}>
        <Icon path={hidden ? mdiEyeOutline : mdiEyeOffOutline} size={20} />{t(hidden ? "edit.showItem" : "edit.hideItem")}
      </button>
    {/if}
    <button class="edit-dock-close" aria-label={t("edit.closeRoom", { name })} onclick={onClose}>
      <Icon path={mdiClose} size={22} />
    </button>
  {:else}
    <span class="edit-dock-hint">{hint ?? t("edit.dockHint")}</span>
  {/if}
</div>
