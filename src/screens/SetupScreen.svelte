<script lang="ts" module>
  /** "192.168.1.10:8123/lovelace" → "http://192.168.1.10:8123"; undefined if it isn't an address. */
  export function normalizeUrl(input: string): string | undefined {
    const text = input.trim();
    if (!text) return undefined;
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `http://${text}`);
      return url.hostname ? url.origin : undefined;
    } catch {
      return undefined;
    }
  }

  /** HA's endpoints don't allow cross-origin reads, but an opaque request still fails if the host is unreachable. */
  async function reachable(url: string) {
    try {
      await fetch(`${url}/manifest.json`, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(6000) });
      return true;
    } catch {
      return false;
    }
  }
</script>

<script lang="ts">
  import { t } from "../i18n/index.svelte";

  interface Props {
    defaultUrl?: string;
    error?: string;
    onConnect(url: string): void;
  }

  let { defaultUrl = "", error, onConnect }: Props = $props();

  // Seeded from the props once; the user edits them from here on.
  // svelte-ignore state_referenced_locally
  let url = $state(defaultUrl);
  let busy = $state(false);
  // svelte-ignore state_referenced_locally
  let problem = $state<string | undefined>(error);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const target = normalizeUrl(url);
    if (!target) return (problem = t("setup.badUrl"));
    busy = true;
    problem = undefined;
    if (!(await reachable(target))) {
      busy = false;
      return (problem = t("setup.unreachable", { url: target }));
    }
    onConnect(target); // redirects to HA's login page
  }
</script>

<div class="center">
  <form class="setup" onsubmit={submit} novalidate>
    <h1>{t("setup.title")}</h1>
    <p>{t("setup.lead")}</p>
    <label for="ha-url">{t("setup.url")}</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id="ha-url"
      type="text"
      inputmode="url"
      autocapitalize="off"
      autocorrect="off"
      spellcheck={false}
      placeholder="192.168.1.10:8123"
      bind:value={url}
      autofocus
    />
    {#if problem}<div class="error">{problem}</div>{/if}
    <div class="actions">
      <button class="btn primary" type="submit" disabled={busy}>
        {busy ? t("setup.checking") : t("setup.connect")}
      </button>
      <a class="btn" href="?fixture=demo">{t("setup.demo")}</a>
    </div>
  </form>
</div>
