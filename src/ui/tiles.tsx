import { mdiMinus, mdiPlus } from "@mdi/js";
import { useTranslation } from "react-i18next";
import { callService, useEntity, useHome } from "../ha/store";
import { domainOf, entityName } from "../model/home";
import type { AreaEntry } from "../ha/types";
import { formatNumber, formatState, isUnavailable } from "./format";
import { Icon, entityIcon } from "./Icon";

interface TileProps {
  entityId: string;
  area?: AreaEntry;
}

/** Lights, switches, fans: the whole tile is the button. */
export function ToggleTile({ entityId, area }: TileProps) {
  useTranslation(); // re-render on language change
  const s = useEntity(entityId);
  const reg = useHome((st) => st.registry[entityId]);
  if (!s) return null;
  const on = s.state === "on";
  const off = isUnavailable(s);
  const brightness = on && typeof s.attributes.brightness === "number" ? Math.round((s.attributes.brightness / 255) * 100) : undefined;

  return (
    <button
      className={`tile ${on ? "on" : ""} ${off ? "unavailable" : ""}`}
      aria-pressed={on}
      disabled={off}
      onClick={() => void callService(domainOf(entityId), "toggle", {}, { entity_id: entityId })}
    >
      <span className="tile-icon">
        <Icon path={entityIcon(s)} />
      </span>
      <span className="tile-body">
        <div className="tile-name">{entityName(s, reg, area)}</div>
        <div className="tile-state">{brightness !== undefined ? `${brightness}%` : formatState(s).value}</div>
      </span>
    </button>
  );
}

export function SensorTile({ entityId, area }: TileProps) {
  useTranslation();
  const s = useEntity(entityId);
  const reg = useHome((st) => st.registry[entityId]);
  if (!s) return null;
  const { value, unit } = formatState(s);
  return (
    <div className={`tile ${isUnavailable(s) ? "unavailable" : ""}`}>
      <span className="tile-icon">
        <Icon path={entityIcon(s)} />
      </span>
      <span className="tile-body">
        <div className="tile-state">{entityName(s, reg, area)}</div>
        <div className="sensor-value">
          {value}
          {unit && <small>{unit}</small>}
        </div>
      </span>
    </div>
  );
}

export function ClimateTile({ entityId, area }: TileProps) {
  const { t } = useTranslation();
  const s = useEntity(entityId);
  const reg = useHome((st) => st.registry[entityId]);
  if (!s) return null;
  const a = s.attributes;
  const target = typeof a.temperature === "number" ? a.temperature : undefined;
  const step = typeof a.target_temp_step === "number" ? a.target_temp_step : 0.5;
  const min = typeof a.min_temp === "number" ? a.min_temp : 7;
  const max = typeof a.max_temp === "number" ? a.max_temp : 35;

  const setTarget = (delta: number) => {
    if (target === undefined) return;
    const temperature = Math.min(max, Math.max(min, Math.round((target + delta) / step) * step));
    void callService("climate", "set_temperature", { temperature }, { entity_id: entityId });
  };

  return (
    <div className={`tile climate ${s.state} ${isUnavailable(s) ? "unavailable" : ""}`}>
      <span className="tile-icon">
        <Icon path={entityIcon(s)} />
      </span>
      <span className="tile-body">
        <div className="tile-name">{entityName(s, reg, area)}</div>
        <div className="tile-state">{t(`hvac.${s.state}`, { defaultValue: formatState(s).value })}</div>
        {a.current_temperature != null && <div className="climate-temp">{formatNumber(a.current_temperature)}°</div>}
      </span>
      {target !== undefined && s.state !== "off" && (
        <div className="stepper">
          <button className="round-btn" aria-label="−" onClick={() => setTarget(-step)}>
            <Icon path={mdiMinus} />
          </button>
          <div className="stepper-value">{formatNumber(target)}°</div>
          <button className="round-btn" aria-label="+" onClick={() => setTarget(step)}>
            <Icon path={mdiPlus} />
          </button>
        </div>
      )}
    </div>
  );
}
