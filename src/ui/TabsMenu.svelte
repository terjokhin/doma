<script lang="ts">
  import { mdiArrowDown, mdiArrowUp, mdiCheckboxBlankOutline, mdiCheckboxMarked, mdiTab } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import { tabsOf } from "../layout/homeLayout";
  import { editor } from "../layout/layoutEditor.svelte";
  import { LENS_IDS, type LensId } from "../model/lenses";
  import Icon from "./Icon.svelte";
  import { VIEW_ICONS } from "./icons";

  /**
   * In the edit bar: which lenses are tabs after Home, and their order. Arrows rather than dragging: a short list,
   * and easy to hit on a wall panel. Changes go to the editor's draft like the rest of edit mode.
   */

  let open = $state(false);
  let root: HTMLDivElement;

  const tabs = $derived(tabsOf(editor.layout));
  // The tabs in their order, then the lenses that aren't tabs.
  const rows = $derived([...tabs, ...LENS_IDS.filter((id) => !tabs.includes(id))]);

  $effect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.contains(e.target as Node)) open = false;
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && (open = false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  });

  function toggle(id: LensId) {
    editor.setTabs(tabs.includes(id) ? tabs.filter((x) => x !== id) : [...tabs, id]);
  }

  function move(index: number, by: number) {
    const next = [...tabs];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    editor.setTabs(next);
  }
</script>

<div class="menu-root" bind:this={root}>
  <button class="chip" aria-haspopup="menu" aria-expanded={open} disabled={editor.saving} onclick={() => (open = !open)}>
    <Icon path={mdiTab} size={18} />
    {t("edit.tabs")}
  </button>
  {#if open}
    <div class="menu tabs-menu" role="menu">
      <div class="menu-label">{t("edit.tabsHint")}</div>
      <div class="tab-row fixed">
        <span class="tab-check"><Icon path={mdiCheckboxMarked} size={20} /></span>
        <Icon path={VIEW_ICONS.home} size={20} />
        <span class="tab-name">{t("views.home")}</span>
      </div>
      {#each rows as id (id)}
        {@const index = tabs.indexOf(id)}
        <div class="tab-row">
          <button class="tab-check" role="menuitemcheckbox" aria-checked={index >= 0} onclick={() => toggle(id)}>
            <Icon path={index >= 0 ? mdiCheckboxMarked : mdiCheckboxBlankOutline} size={20} />
            <Icon path={VIEW_ICONS[id]} size={20} />
            <span class="tab-name">{t(`lens.names.${id}`)}</span>
          </button>
          {#if index >= 0}
            <button
              class="round-btn small"
              aria-label={t("edit.moveUp", { name: t(`lens.names.${id}`) })}
              disabled={index === 0}
              onclick={() => move(index, -1)}
            >
              <Icon path={mdiArrowUp} size={18} />
            </button>
            <button
              class="round-btn small"
              aria-label={t("edit.moveDown", { name: t(`lens.names.${id}`) })}
              disabled={index === tabs.length - 1}
              onclick={() => move(index, 1)}
            >
              <Icon path={mdiArrowDown} size={18} />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
