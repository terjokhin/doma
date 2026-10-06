/**
 * One short message at the bottom of the screen (ui/ToastHost.svelte), with an optional action: "Undo" after a
 * scene, "Try again" when a command didn't go through. A new one replaces the last; each goes by itself.
 */
export interface Toast {
  text: string;
  action?: { label: string; run: () => void };
  /** Whether it's about something that went wrong. */
  error?: boolean;
}

let current = $state.raw<Toast | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

export const toast = {
  /** Reactive. */
  get current() {
    return current;
  },
  show(next: Toast, ms = next.action ? 8000 : 4000) {
    clearTimeout(timer);
    current = next;
    timer = setTimeout(() => (current = null), ms);
  },
  hide() {
    clearTimeout(timer);
    current = null;
  },
};
