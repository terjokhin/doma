<script lang="ts">
  import { onMount } from "svelte";
  import {
    ERR_CANNOT_CONNECT,
    ERR_HASS_HOST_REQUIRED,
    ERR_INVALID_AUTH,
    ERR_INVALID_AUTH_CALLBACK,
    ERR_INVALID_HTTPS_TO_HTTP,
  } from "home-assistant-js-websocket";
  import { connectFixture } from "./ha/fixture";
  import { connectLive, forgetLogin } from "./ha/live";
  import { home, justLoggedOut, setBackend } from "./ha/store.svelte";
  import { useBackend } from "./ha/subscriptions.svelte";
  import { useLayoutBackend } from "./layout/layoutStore.svelte";
  import { t } from "./i18n/index.svelte";
  import { route } from "./router.svelte";
  import { isLensId } from "./model/lenses";
  import HomeScreen from "./screens/HomeScreen.svelte";
  import LensScreen from "./screens/LensScreen.svelte";
  import RoomScreen from "./screens/RoomScreen.svelte";
  import SetupScreen from "./screens/SetupScreen.svelte";

  type Boot = { phase: "loading" } | { phase: "setup"; error?: string } | { phase: "ready" };

  const fixtureName = new URLSearchParams(location.search).get("fixture") ?? import.meta.env.VITE_FIXTURE;

  // The library rejects with bare numeric codes.
  const ERROR_KEYS: Record<number, string> = {
    [ERR_CANNOT_CONNECT]: "setup.errors.cannotConnect",
    [ERR_INVALID_AUTH]: "setup.errors.invalidAuth",
    [ERR_INVALID_HTTPS_TO_HTTP]: "setup.errors.httpsToHttp",
    [ERR_INVALID_AUTH_CALLBACK]: "setup.errors.authCallback",
  };

  function describe(err: unknown) {
    if (typeof err === "number" && ERROR_KEYS[err]) return t(ERROR_KEYS[err]);
    return err instanceof Error ? err.message : String(err);
  }

  const LAST_URL_KEY = "ha-ui.url";
  function lastUrl() {
    try {
      return localStorage.getItem(LAST_URL_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  }
  function rememberUrl(url: string) {
    try {
      localStorage.setItem(LAST_URL_KEY, url);
    } catch {
      /* storage unavailable */
    }
  }

  let boot = $state<Boot>({ phase: "loading" });

  function start(hassUrl?: string) {
    boot = { phase: "loading" };
    if (hassUrl) {
      rememberUrl(hassUrl);
      justLoggedOut(true);
    }
    const connect = fixtureName ? connectFixture(fixtureName) : connectLive(hassUrl);
    connect.then(
      async (backend) => {
        setBackend(backend);
        useBackend(backend);
        // Wait briefly for the home layout, so the home screen doesn't rearrange itself right after showing.
        await Promise.race([useLayoutBackend(backend), new Promise((r) => setTimeout(r, 2000))]);
        boot = { phase: "ready" };
      },
      (err) => {
        console.error("Connecting to Home Assistant failed:", err);
        if (err === ERR_HASS_HOST_REQUIRED) {
          // No saved login. A preset URL goes straight to HA's login page (handy on a fresh kiosk),
          // except right after a logout, when the user may want the demo or another HA.
          const preset = import.meta.env.VITE_HA_URL;
          if (preset && !hassUrl && !justLoggedOut()) return start(preset);
          boot = { phase: "setup" };
          return;
        }
        if (err === ERR_INVALID_AUTH) forgetLogin();
        boot = { phase: "setup", error: describe(err) };
      },
    );
  }

  onMount(() => start());

  const roomId = $derived(route().match(/^\/room\/([\w-]+)$/)?.[1]);
  const lensId = $derived(route().match(/^\/lens\/(\w+)$/)?.[1]);
</script>

{#if boot.phase === "loading"}
  <div class="center">{t("app.connecting")}</div>
{:else if boot.phase === "setup"}
  <SetupScreen defaultUrl={import.meta.env.VITE_HA_URL ?? lastUrl()} error={boot.error} onConnect={start} />
{:else}
  {#if roomId}
    {#key roomId}
      <RoomScreen areaId={roomId} />
    {/key}
  {:else if lensId && isLensId(lensId)}
    {#key lensId}
      <LensScreen lens={lensId} />
    {/key}
  {:else}
    <HomeScreen />
  {/if}
  {#if home.status === "disconnected"}
    <div class="status">{t("app.offline")}</div>
  {/if}
{/if}
