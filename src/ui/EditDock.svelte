<script lang="ts">
  import { mdiClose, mdiEyeOffOutline, mdiPencilOutline, mdiTableRowPlusAfter } from "@mdi/js";
  import { tick } from "svelte";
  import { t } from "../i18n/index.svelte";
  import { CARD_SIZES, ROOM_NAME_MAX, type CardSize } from "../layout/homeLayout";
  import Icon from "./Icon.svelte";

  /**
   * In Home's edit mode, a bar at the bottom of the screen (LAYOUTS.md, "Edit mode"): for the selected room, its
   * name (tap it to rename the room in Doma), size, "Own row" (in a stack) and "Hide"; with none selected, a hint. Always in the same place, whichever room
   * is selected, and big enough to hit on a wall tablet. The card itself keeps its controls' × and "+".
   */
  let {
    name,
    haName,
    size,
    onRename,
    onSize,
    onOwnRow,
    onHide,
    onClose,
  }: {
    /** The selected room's name; undefined with none selected. */
    name?: string;
    /** Its name in HA, which an empty name goes back to. */
    haName?: string;
    size?: CardSize;
    onRename: (name: string) => void;
    onSize: (size: CardSize) => void;
    /** Take it out of its stack; undefined when it has a row of its own. */
    onOwnRow?: () => void;
    onHide: () => void;
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
        aria-label={t("edit.roomName")}
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
    <button class="edit-dock-action" onclick={onHide}>
      <Icon path={mdiEyeOffOutline} size={20} />{t("edit.hideItem")}
    </button>
    <button class="edit-dock-close" aria-label={t("edit.closeRoom", { name })} onclick={onClose}>
      <Icon path={mdiClose} size={22} />
    </button>
  {:else}
    <span class="edit-dock-hint">{t("edit.dockHint")}</span>
  {/if}
</div>
