import { recordNavigation } from "./debug/stats";

// Hash routing: works from any base path and needs no server rewrites.
// Routes: "/" Home, "/lens/<id>", "/room/<area id>".
const read = () => location.hash.slice(1) || "/";

let path = $state(read());
/** The route before this one, if we got here inside the app. */
let previous: string | undefined;

window.addEventListener("hashchange", () => {
  recordNavigation(performance.now());
  previous = path;
  path = read();
});

/** The current route, e.g. "/" or "/room/kitchen". Reactive. */
export const route = () => path;

export function navigate(to: string) {
  location.hash = to;
  window.scrollTo(0, 0);
}

/** Back to the screen we came from (Home or a lens), or Home when the app was opened here. */
export function back() {
  navigate(previous && previous !== path && !previous.startsWith("/room/") ? previous : "/");
}
