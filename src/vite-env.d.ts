/// <reference types="vite/client" />

/** The app's version: a release's, from its tag, or 0.0.0-dev (vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Home Assistant URL to log in to without asking, e.g. http://homeassistant.local:8123 */
  readonly VITE_HA_URL?: string;
  /** Run on a fixture instead of a live HA, e.g. "demo" */
  readonly VITE_FIXTURE?: string;
}
