import { mdiLightbulb, mdiLightbulbOutline } from "@mdi/js";
import { useTranslation } from "react-i18next";
import { callService, useHome } from "../ha/store";
import { useHomeModel, type Room } from "../model/home";
import { formatHumidity, formatTemperature } from "../ui/format";
import { Header } from "../ui/Header";
import { Icon } from "../ui/Icon";
import { navigate } from "../router";

export function HomeScreen() {
  const { t } = useTranslation();
  const home = useHomeModel();

  return (
    <main className="screen">
      <Header />
      {home.map((group) => (
        <section className="floor" key={group.floor?.floor_id ?? "_none"}>
          <h2 className="floor-title">{group.floor?.name ?? t("app.otherFloor")}</h2>
          <div className="grid">
            {group.rooms.map((room) => (
              <RoomCard key={room.area.area_id} room={room} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function RoomCard({ room }: { room: Room }) {
  const { t } = useTranslation();
  const temperature = useHome((s) => (room.temperature ? s.entities[room.temperature] : undefined));
  const humidity = useHome((s) => (room.humidity ? s.entities[room.humidity] : undefined));
  // A count, not an array, so the card re-renders only when it changes.
  const lightsOn = useHome((s) => room.lights.filter((id) => s.entities[id]?.state === "on").length);
  const lit = lightsOn > 0;

  return (
    <div
      className={`room-card ${lit ? "lit" : ""}`}
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/room/${room.area.area_id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/room/${room.area.area_id}`)}
    >
      <div>
        <div className="room-name">{room.area.name}</div>
        {(temperature || humidity) && (
          <div className="room-climate">
            {temperature && <span>{formatTemperature(temperature)}</span>}
            {humidity && <span>{formatHumidity(humidity)}</span>}
          </div>
        )}
      </div>
      {room.lights.length > 0 && (
        <div className="room-foot">
          <span className="room-lights">{t("home.lightsOn", { count: lightsOn })}</span>
          <button
            className={`round-btn ${lit ? "on" : ""}`}
            aria-label={lit ? t("room.allOff") : t("room.allOn")}
            onClick={(e) => {
              e.stopPropagation();
              void callService("homeassistant", lit ? "turn_off" : "turn_on", {}, { entity_id: room.lights });
            }}
          >
            <Icon path={lit ? mdiLightbulb : mdiLightbulbOutline} />
          </button>
        </div>
      )}
    </div>
  );
}
