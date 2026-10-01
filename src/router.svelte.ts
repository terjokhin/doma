import { recordNavigation } from "./debug/stats";

// Hash routing: works from any base path and needs no server rewrites.
const read = () => location.hash.slice(1) || "/";

let path = $state(read());
window.addEventListener("hashchange", () => {
  recordNavigation(performance.now());
  path = read();
});

/** The current route, e.g. "/" or "/room/kitchen". Reactive. */
export const route = () => path;

export function navigate(to: string) {
  location.hash = to;
  window.scrollTo(0, 0);
}
