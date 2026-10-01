import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  defaultUrl?: string;
  error?: string;
  onConnect(url: string): void;
}

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

export function SetupScreen({ defaultUrl = "", error, onConnect }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | undefined>(error);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const target = normalizeUrl(url);
    if (!target) return setProblem(t("setup.badUrl"));
    setBusy(true);
    setProblem(undefined);
    if (!(await reachable(target))) {
      setBusy(false);
      return setProblem(t("setup.unreachable", { url: target }));
    }
    onConnect(target); // redirects to HA's login page
  };

  return (
    <div className="center">
      <form className="setup" onSubmit={submit} noValidate>
        <h1>{t("setup.title")}</h1>
        <p>{t("setup.lead")}</p>
        <label htmlFor="ha-url">{t("setup.url")}</label>
        <input
          id="ha-url"
          type="text"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="192.168.1.10:8123"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoFocus
        />
        {problem && <div className="error">{problem}</div>}
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? t("setup.checking") : t("setup.connect")}
          </button>
          <a className="btn" href="?fixture=demo">
            {t("setup.demo")}
          </a>
        </div>
      </form>
    </div>
  );
}
