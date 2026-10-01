import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ERR_CANNOT_CONNECT,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_AUTH_CALLBACK,
  ERR_INVALID_HTTPS_TO_HTTP,
} from "home-assistant-js-websocket";
import i18n from "./i18n";
import { connectFixture } from "./ha/fixture";
import { connectLive, forgetLogin } from "./ha/live";
import { justLoggedOut, setBackend, useHome } from "./ha/store";
import { useRoute } from "./router";
import { HomeScreen } from "./screens/HomeScreen";
import { RoomScreen } from "./screens/RoomScreen";
import { SetupScreen } from "./screens/SetupScreen";

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
  if (typeof err === "number" && ERROR_KEYS[err]) return i18n.t(ERROR_KEYS[err]);
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

export function App() {
  const { t } = useTranslation();
  const [boot, setBoot] = useState<Boot>({ phase: "loading" });
  const status = useHome((s) => s.status);
  const route = useRoute();

  const start = (hassUrl?: string) => {
    setBoot({ phase: "loading" });
    if (hassUrl) {
      rememberUrl(hassUrl);
      justLoggedOut(true);
    }
    const connect = fixtureName ? connectFixture(fixtureName) : connectLive(hassUrl);
    connect.then(
      (backend) => {
        setBackend(backend);
        setBoot({ phase: "ready" });
      },
      (err) => {
        console.error("Connecting to Home Assistant failed:", err);
        if (err === ERR_HASS_HOST_REQUIRED) {
          // No saved login. A preset URL goes straight to HA's login page (handy on a fresh kiosk),
          // except right after a logout, when the user may want the demo or another HA.
          const preset = import.meta.env.VITE_HA_URL;
          if (preset && !hassUrl && !justLoggedOut()) return start(preset);
          return setBoot({ phase: "setup" });
        }
        if (err === ERR_INVALID_AUTH) forgetLogin();
        setBoot({ phase: "setup", error: describe(err) });
      },
    );
  };

  const started = useRef(false); // StrictMode runs effects twice in dev; connect once
  useEffect(() => {
    if (!started.current) start();
    started.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (boot.phase === "loading") return <div className="center">{t("app.connecting")}</div>;
  if (boot.phase === "setup")
    return <SetupScreen defaultUrl={import.meta.env.VITE_HA_URL ?? lastUrl()} error={boot.error} onConnect={start} />;

  const room = route.match(/^\/room\/([\w-]+)$/);
  return (
    <>
      {room ? <RoomScreen key={room[1]} areaId={room[1]} /> : <HomeScreen />}
      {status === "disconnected" && <div className="status">{t("app.offline")}</div>}
    </>
  );
}
