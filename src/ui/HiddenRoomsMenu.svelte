<script lang="ts">
  import { mdiEyeOffOutline, mdiEyeOutline } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import { hiddenOf, roomNameOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { allRooms } from "../model/lenses";
  import { homeModel } from "../model/model.svelte";
  import Icon from "./Icon.svelte";

  /**
   * In Home's edit bar, once a room is hidden: the hidden rooms, each shown again with a tap. Changes go to the
   * editor's draft like the rest of edit mode. Rooms HA no longer has aren't listed.
   */

  let open = $state(false);
  let root = $state<HTMLDivElement>();

  const rooms = $derived.by(() => {
    const hidden = new Set(hiddenOf(editor.layout));
    return allRooms(homeModel()).filter((r) => hidden.has(r.area.area_id));
  });

  $effect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) open = false;
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && (open = false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  });

  function show(areaId: string) {
    editor.setRoomHidden(areaId, false);
    if (rooms.length <= 1) open = false;
  }
</script>

{#if rooms.length}
  <div class="menu-root" bind:this={root}>
    <button class="chip" aria-haspopup="menu" aria-expanded={open} disabled={editor.saving} onclick={() => (open = !open)}>
      <Icon path={mdiEyeOffOutline} size={18} />
      {t("edit.hiddenRooms")} · {rooms.length}
    </button>
    {#if open}
      <div class="menu tabs-menu" role="menu">
        <div class="menu-label">{t("edit.hiddenRoomsHint")}</div>
        {#each rooms as room (room.area.area_id)}
          <div class="tab-row">
            <button
              class="tab-check"
              role="menuitem"
              aria-label={t("edit.showRoom", { name: roomNameOf(editor.layout, room.area) })}
              onclick={() => show(room.area.area_id)}
            >
              <Icon path={mdiEyeOutline} size={20} />
              <span class="tab-name">{roomNameOf(editor.layout, room.area)}</span>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
