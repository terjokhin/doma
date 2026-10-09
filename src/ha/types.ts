// Registry shapes, as returned by the HA WebSocket API.

export interface FloorEntry {
  floor_id: string;
  name: string;
  level: number | null;
  icon: string | null;
  aliases: string[];
}

export interface AreaEntry {
  area_id: string;
  name: string;
  floor_id: string | null;
  icon: string | null;
  picture: string | null;
  aliases: string[];
  labels: string[];
  temperature_entity_id?: string | null;
  humidity_entity_id?: string | null;
}

export interface DeviceEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  area_id: string | null;
  manufacturer: string | null;
  model: string | null;
  disabled_by: string | null;
}

/** Compact entry from `config/entity_registry/list_for_display` (the form HA's own frontend uses). */
export interface EntityEntry {
  ei: string; // entity_id
  pl: string; // platform
  ai?: string; // area_id, when set on the entity itself
  di?: string; // device_id
  en?: string; // entity name
  ec?: number; // entity category index; any value means config/diagnostic
  hb?: boolean; // hidden
  hn?: boolean; // has_entity_name
  ic?: string; // icon set on the entity in HA ("mdi:…")
  lb: string[]; // labels
}

export interface EntityRegistryDisplay {
  entity_categories: Record<string, string>;
  entities: EntityEntry[];
}
