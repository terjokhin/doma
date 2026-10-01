import { mdiChevronLeft } from "@mdi/js";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { callService, useHome } from "../ha/store";
import { useRoom } from "../model/home";
import { formatHumidity, formatTemperature } from "../ui/format";
import { Icon } from "../ui/Icon";
import { ClimateTile, SensorTile, ToggleTile } from "../ui/tiles";
import { navigate } from "../router";

export function RoomScreen({ areaId }: { areaId: string }) {
  const { t } = useTranslation();
  const room = useRoom(areaId);
  const temperature = useHome((s) => (room?.temperature ? s.entities[room.temperature] : undefined));
  const humidity = useHome((s) => (room?.humidity ? s.entities[room.humidity] : undefined));
  const lightsOn = useHome((s) => room?.lights.some((id) => s.entities[id]?.state === "on") ?? false);

  if (!room) return <div className="center">{t("app.connecting")}</div>;
  const { area } = room;
  const empty = [room.lights, room.climate, room.switches, room.media, room.sensors].every((l) => l.length === 0);

  return (
    <main className="screen">
      <header className="room-header">
        <button className="round-btn" aria-label={t("room.back")} onClick={() => navigate("/")}>
          <Icon path={mdiChevronLeft} size={28} />
        </button>
        <h1>{area.name}</h1>
        <div className="room-climate">
          {temperature && <span>{formatTemperature(temperature)}</span>}
          {humidity && <span>{formatHumidity(humidity)}</span>}
        </div>
      </header>

      {empty && <p className="empty">{t("room.empty")}</p>}

      <Section
        title={t("room.lights")}
        ids={room.lights}
        action={
          room.lights.length > 1 && (
            <button
              className="chip"
              onClick={() => void callService("homeassistant", lightsOn ? "turn_off" : "turn_on", {}, { entity_id: room.lights })}
            >
              {lightsOn ? t("room.allOff") : t("room.allOn")}
            </button>
          )
        }
      >
        {room.lights.map((id) => <ToggleTile key={id} entityId={id} area={area} />)}
      </Section>
      <Section title={t("room.climate")} ids={room.climate}>
        {room.climate.map((id) => <ClimateTile key={id} entityId={id} area={area} />)}
      </Section>
      <Section title={t("room.switches")} ids={room.switches}>
        {room.switches.map((id) => <ToggleTile key={id} entityId={id} area={area} />)}
      </Section>
      <Section title={t("room.media")} ids={room.media}>
        {room.media.map((id) => <SensorTile key={id} entityId={id} area={area} />)}
      </Section>
      <Section title={t("room.sensors")} ids={room.sensors}>
        {room.sensors.map((id) => <SensorTile key={id} entityId={id} area={area} />)}
      </Section>
    </main>
  );
}

function Section({ title, ids, action, children }: { title: string; ids: string[]; action?: ReactNode; children: ReactNode }) {
  if (ids.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="grid">{children}</div>
    </section>
  );
}
