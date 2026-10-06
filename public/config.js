// Settings read before the app starts. The Docker image rewrites this file from its environment (HA_URL) when the
// container starts; in a plain build it stays empty, and VITE_HA_URL or the setup screen decide where HA is.
window.DOMA_CONFIG = {};
