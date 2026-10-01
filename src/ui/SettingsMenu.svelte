<script lang="ts">
  import { mdiCog, mdiLogout } from "@mdi/js";
  import { logout } from "../ha/store.svelte";
  import { LANGUAGES, language, setLanguage, t, type Language } from "../i18n/index.svelte";
  import Icon from "./Icon.svelte";

  /** Tucked behind a gear so nobody logs out the wall panel by brushing against it. */

  const inDemo = new URLSearchParams(location.search).has("fixture");
  const languages = Object.keys(LANGUAGES) as Language[];

  let open = $state(false);
  let root: HTMLDivElement;

  $effect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.contains(e.target as Node)) open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  });
</script>

<div class="menu-root" bind:this={root}>
  <button class="round-btn" aria-label={t("settings.title")} aria-expanded={open} onclick={() => (open = !open)}>
    <Icon path={mdiCog} />
  </button>
  {#if open}
    <div class="menu" role="menu">
      <div class="menu-label">{t("settings.language")}</div>
      <div class="menu-row">
        {#each languages as l (l)}
          <button class="chip" aria-pressed={language() === l} onclick={() => setLanguage(l)}>
            {LANGUAGES[l]}
          </button>
        {/each}
      </div>
      <button class="menu-item" role="menuitem" onclick={() => void logout()}>
        <Icon path={mdiLogout} />
        {inDemo ? t("settings.exitDemo") : t("settings.logout")}
      </button>
    </div>
  {/if}
</div>
