import { mdiCog, mdiLogout } from "@mdi/js";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { logout } from "../ha/store";
import { LANGUAGES, setLanguage, type Language } from "../i18n";
import { Icon } from "./Icon";

const inDemo = new URLSearchParams(location.search).has("fixture");

/** Tucked behind a gear so nobody logs out the wall panel by brushing against it. */
export function SettingsMenu() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="menu-root" ref={root}>
      <button className="round-btn" aria-label={t("settings.title")} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon path={mdiCog} />
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-label">{t("settings.language")}</div>
          <div className="menu-row">
            {(Object.keys(LANGUAGES) as Language[]).map((l) => (
              <button key={l} className="chip" aria-pressed={i18n.language === l} onClick={() => setLanguage(l)}>
                {LANGUAGES[l]}
              </button>
            ))}
          </div>
          <button className="menu-item" role="menuitem" onClick={() => void logout()}>
            <Icon path={mdiLogout} />
            {inDemo ? t("settings.exitDemo") : t("settings.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
