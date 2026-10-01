import { useSyncExternalStore } from "react";

// Hash routing: works from any base path and needs no server rewrites.
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export const useRoute = () => useSyncExternalStore(subscribe, () => location.hash.slice(1) || "/");

export function navigate(path: string) {
  location.hash = path;
  window.scrollTo(0, 0);
}
