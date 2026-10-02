/**
 * Doma was first called ha-ui. What a screen stored in the browser under the old names moves to the new ones once,
 * before anything reads it, so it keeps its login, Home Assistant address and language. The old keys go, so a later
 * logout can't be undone by copying the old login back. (The home layout lives in HA: see live.ts.)
 */
const RENAMED = ["tokens", "url", "lang"];

try {
  for (const name of RENAMED) {
    const old = localStorage.getItem(`ha-ui.${name}`);
    if (old === null) continue;
    if (localStorage.getItem(`doma.${name}`) === null) localStorage.setItem(`doma.${name}`, old);
    localStorage.removeItem(`ha-ui.${name}`);
  }
} catch {
  /* storage unavailable: nothing to move */
}
