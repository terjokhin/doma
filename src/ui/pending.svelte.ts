import { SvelteSet } from "svelte/reactivity";
import { home } from "../ha/store.svelte";
import { t } from "../i18n/index.svelte";
import { toast } from "./toast.svelte";

/**
 * Commands waiting for Home Assistant to answer (LAYOUTS.md, "Feedback"). A tile shows a quiet spinner on its chip
 * once a command takes longer than a moment, until one of the entities it changes reports a new state. No answer
 * in time, or a refusal, says so at the bottom of the screen and offers to try again. Only for commands that always
 * change a state (switching, a mode): a brightness set to what it was would never answer.
 */
const SPIN_AFTER = 400;
const GIVE_UP_AFTER = 8000;

const spinning = new SvelteSet<string>();
const waiting = new Map<string, { ids: string[]; timers: ReturnType<typeof setTimeout>[] }>();

home.onChange((entityId) => {
  for (const [key, w] of waiting) if (w.ids.includes(entityId)) settle(key);
});

function settle(key: string) {
  const w = waiting.get(key);
  if (!w) return;
  w.timers.forEach(clearTimeout);
  waiting.delete(key);
  spinning.delete(key);
}

/** Whether the command sent under `key` is still waiting long enough to show it. Reactive. */
export const isPending = (key: string) => spinning.has(key);

/**
 * Send `call`, which should change `ids`, under `key` (one entity's ID, or a group's). `name` is what the messages
 * call it. Resolves to whether HA took the command.
 */
export function send(key: string, ids: string[], name: string, call: () => Promise<unknown> | undefined) {
  const sent = call();
  if (!sent) return undefined;
  settle(key);
  const retry = { label: t("feedback.retry"), run: () => send(key, ids, name, call) };
  waiting.set(key, {
    ids,
    timers: [
      setTimeout(() => spinning.add(key), SPIN_AFTER),
      setTimeout(() => {
        settle(key);
        toast.show({ text: t("feedback.noAnswer", { name }), action: retry, error: true });
      }, GIVE_UP_AFTER),
    ],
  });
  return sent.then(
    () => true,
    (err: unknown) => {
      settle(key);
      const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
      toast.show({ text: t("feedback.failed", { name, message }), action: retry, error: true });
      return false;
    },
  );
}
