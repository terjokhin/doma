declare global {
  interface Window {
    /** Written by public/config.js, which a container rewrites at start (docker/40-doma-config.sh). */
    DOMA_CONFIG?: { haUrl?: string };
  }
}

/**
 * The Home Assistant to log in to without asking, if the app was told: by its container when it started (HA_URL),
 * else when it was built (VITE_HA_URL). Undefined: the setup screen asks.
 */
export const presetHaUrl = (): string | undefined => window.DOMA_CONFIG?.haUrl || import.meta.env.VITE_HA_URL || undefined;
