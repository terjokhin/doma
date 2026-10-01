<script lang="ts">
  import { t } from "../i18n/index.svelte";
  import { editor } from "../layout/layoutEditor.svelte";

  /** Replaces the header in edit mode, and stays at the top while the page scrolls. */
</script>

<div class="edit-bar">
  <div class="edit-bar-text">
    <h1>{t("edit.title")}</h1>
    <p class:error={!!editor.error}>
      {editor.error ? t("edit.saveFailed", { message: editor.error }) : t("edit.hint")}
    </p>
  </div>
  <button class="chip" disabled={editor.saving} onclick={editor.reset}>{t("edit.reset")}</button>
  <button class="chip" disabled={editor.saving} onclick={editor.cancel}>{t("edit.cancel")}</button>
  <button class="chip primary" disabled={editor.saving} onclick={() => void editor.done()}>{t("edit.done")}</button>
</div>
