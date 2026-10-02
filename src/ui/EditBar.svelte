<script lang="ts">
  import type { Snippet } from "svelte";
  import { t } from "../i18n/index.svelte";
  import { editor } from "../layout/layoutEditor.svelte";

  /**
   * Replaces the header in edit mode, and stays at the top while the page scrolls. The screen being edited gives
   * its title, hint and what Reset does, and may add controls of its own (`children`) before the buttons.
   */
  let {
    title,
    hint,
    onReset,
    children,
  }: { title: string; hint: string; onReset: () => void; children?: Snippet } = $props();
</script>

<div class="edit-bar">
  <div class="edit-bar-text">
    <h1>{title}</h1>
    <p class:error={!!editor.error}>
      {editor.error ? t("edit.saveFailed", { message: editor.error }) : hint}
    </p>
  </div>
  {@render children?.()}
  <button class="chip" disabled={editor.saving} onclick={onReset}>{t("edit.reset")}</button>
  <button class="chip" disabled={editor.saving} onclick={editor.cancel}>{t("edit.cancel")}</button>
  <button class="chip primary" disabled={editor.saving} onclick={() => void editor.done()}>{t("edit.done")}</button>
</div>
