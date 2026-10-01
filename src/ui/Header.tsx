import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHome } from "../ha/store";
import type { Language } from "../i18n";
import { formatNumber } from "./format";
import { Icon, entityIcon } from "./Icon";
import { SettingsMenu } from "./SettingsMenu";

function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function greetingKey(hour: number) {
  if (hour < 5) return "home.greeting_night";
  if (hour < 12) return "home.greeting_morning";
  if (hour < 18) return "home.greeting_afternoon";
  if (hour < 23) return "home.greeting_evening";
  return "home.greeting_night";
}

/** Big clock, date and outside weather: readable from across the room. */
export function Header() {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const weather = useHome((s) => Object.values(s.entities).find((e) => e.entity_id.startsWith("weather.")));
  const lang = i18n.language as Language;

  const time = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const date = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <header className="header">
      <div>
        <div className="clock">{time}</div>
        <div className="header-sub">
          {t(greetingKey(now.getHours()))} · {date}
        </div>
      </div>
      <div className="header-side">
        {weather && weather.attributes.temperature != null && (
          <div className="weather">
            <Icon path={entityIcon(weather)} size={32} />
            <strong>{formatNumber(weather.attributes.temperature)}°</strong>
          </div>
        )}
        <SettingsMenu />
      </div>
    </header>
  );
}
