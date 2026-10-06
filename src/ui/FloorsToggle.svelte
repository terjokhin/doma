<script lang="ts">
  import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from "@mdi/js";
  import { t } from "../i18n/index.svelte";
  import { editor } from "../layout/layoutEditor.svelte";
  import Icon from "./Icon.svelte";

  /** In Home's edit bar: whether the cards are grouped by floor, under a heading each, or share one grid. */
  let { checked }: { checked: boolean } = $props();
</script>

<button
  class="chip"
  role="checkbox"
  aria-checked={checked}
  disabled={editor.saving}
  onclick={() => editor.setByFloor(!checked)}
>
  <Icon path={checked ? mdiCheckboxMarked : mdiCheckboxBlankOutline} size={18} />
  {t("edit.byFloor")}
</button>
