<script lang="ts">
  import { domainOf, isLight } from "../model/home";
  import { route } from "../router.svelte";
  import ClimateSheet from "./ClimateSheet.svelte";
  import LightSheet from "./LightSheet.svelte";
  import LightsSheet from "./LightsSheet.svelte";
  import { sheet } from "./sheet.svelte";
  import ToggleSheet from "./ToggleSheet.svelte";

  /**
   * Shows the open pop-up over every screen (ui/sheet.svelte.ts), on a dimmed backdrop: no blur, which the slowest
   * tablet can't afford. A tap on the backdrop, Escape or a change of screen closes it.
   */
  const target = $derived(sheet.current);

  $effect(() => {
    void route();
    sheet.close();
  });

  $effect(() => {
    if (!target) return;
    const escape = (e: KeyboardEvent) => e.key === "Escape" && sheet.close();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });
</script>

{#if target}
  <div class="sheet-scrim" role="presentation" onclick={(e) => e.target === e.currentTarget && sheet.close()}>
    <div class="sheet" role="dialog" aria-modal="true">
      {#if target.kind === "lights"}
        <LightsSheet room={target.room} />
      {:else}
        {#key target.entityId}
          {#if isLight(target.entityId)}
            <LightSheet entityId={target.entityId} area={target.area} />
          {:else if domainOf(target.entityId) === "climate"}
            <ClimateSheet entityId={target.entityId} area={target.area} />
          {:else}
            <ToggleSheet entityId={target.entityId} area={target.area} />
          {/if}
        {/key}
      {/if}
    </div>
  </div>
{/if}
