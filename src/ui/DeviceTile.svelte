<script lang="ts">
  import { mdiBatteryAlertVariantOutline, mdiBatteryHigh, mdiBatteryMedium, mdiLanDisconnect } from "@mdi/js";
  import { home } from "../ha/store.svelte";
  import { watchEntities } from "../ha/subscriptions.svelte";
  import { t } from "../i18n/index.svelte";
  import type { RoomDevice } from "../model/home";
  import { batteryLow, deviceOffline } from "../model/lenses";
  import { formatNumber } from "./format";
  import Tile from "./Tile.svelte";

  /**
   * A device in the Devices lens, as a slim tile (ui/Tile.svelte): its name, and whether it's offline or how full its
   * battery is; lit while it needs a look.
   */
  let { device }: { device: RoomDevice } = $props();

  watchEntities(() => [device.probe, device.battery]);
  const offline = $derived(deviceOffline(device));
  const low = $derived(batteryLow(device));
  const battery = $derived(home.entity(device.battery));

  const value = $derived.by(() => {
    if (offline) return t("devices.offline");
    if (!battery) return "";
    if (battery.entity_id.startsWith("binary_sensor.")) return low ? t("devices.batteryLow") : t("devices.batteryOk");
    return `${formatNumber(battery.state, 0)}%`;
  });
  const icon = $derived(
    offline ? mdiLanDisconnect : low ? mdiBatteryAlertVariantOutline : Number(battery?.state) >= 60 ? mdiBatteryHigh : mdiBatteryMedium,
  );
</script>

<Tile {icon} name={device.name} state={value} active={offline || low} tint="tint-light" />
