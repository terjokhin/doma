import { stats, subscribeAll } from "./stats";

/**
 * Debug overlay (`?debug`): live performance numbers in a corner, also posted to the dev server
 * every few seconds (saved to .probe/), since a wall tablet has no DevTools. Plain DOM, no framework,
 * and it repaints its text once a second, so it barely affects what it measures.
 */

const REPORT_EVERY_MS = 5000;
const SLOW_FRAME_MS = 25;

interface Summary {
  n: number;
  p50: number;
  p95: number;
  max: number;
}

function summarize(xs: number[]): Summary | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const r = (x: number) => Math.round(x * 10) / 10;
  return { n: s.length, p50: r(q(0.5)), p95: r(q(0.95)), max: r(s[s.length - 1]) };
}

export function startOverlay() {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;right:8px;bottom:8px;z-index:9999;padding:6px 8px;border-radius:8px;" +
    "background:rgb(0 0 0 / 0.75);color:#9f9;font:11px/1.35 ui-monospace,monospace;white-space:pre;" +
    "pointer-events:none;contain:strict;width:24em;height:8.4em;will-change:transform";
  document.body.appendChild(el);

  const errors: string[] = [];
  const onError = (msg: string) => errors.length < 20 && errors.push(msg.slice(0, 500));
  window.addEventListener("error", (e) => onError(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener("unhandledrejection", (e) => onError(`Unhandled rejection: ${String(e.reason)}`));
  const consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    onError(args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(" "));
    consoleError(...args);
  };

  // Frame intervals, for FPS and slow frames.
  let frames: number[] = [];
  let last = 0;
  const loop = (ts: number) => {
    if (last) frames.push(ts - last);
    last = ts;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // One-second window for the on-screen numbers; five-second window for reports.
  let shownAt = performance.now();
  let shownMessages = stats.messages;
  let reportAt = performance.now();
  let reported = { messages: stats.messages, changes: stats.entityChanges };
  let reportFrames: number[] = [];

  setInterval(() => {
    const now = performance.now();
    const secs = (now - shownAt) / 1000;
    const slow = frames.filter((f) => f > SLOW_FRAME_MS).length;
    reportFrames = reportFrames.concat(frames);
    const lastNav = stats.navigations[stats.navigations.length - 1];
    const recent = summarize(stats.updates.slice(-50).map((u) => u.script));
    const recentFrame = summarize(stats.updates.slice(-50).map((u) => u.frame));
    el.textContent =
      `fps ${(frames.length / secs).toFixed(0)}  slow ${slow}  (${subscribeAll ? "all" : "filtered"})\n` +
      `subscribed ${stats.subscribed}  msg/s ${((stats.messages - shownMessages) / secs).toFixed(1)}\n` +
      `update script p95 ${recent?.p95 ?? "–"} ms\n` +
      `update frame p95 ${recentFrame?.p95 ?? "–"} ms\n` +
      `last screen change ${lastNav ? `${Math.round(lastNav.total)} ms (frame ${Math.round(lastNav.frame)})` : "–"}\n` +
      `route ${location.hash || "#/"}  errors ${errors.length}`;
    frames = [];
    shownAt = now;
    shownMessages = stats.messages;

    if (now - reportAt >= REPORT_EVERY_MS) {
      const updates = stats.updates.splice(0);
      const navigations = stats.navigations.splice(0);
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      void fetch("/__perf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          at: new Date().toISOString(),
          userAgent: navigator.userAgent,
          route: location.hash || "#/",
          mode: subscribeAll ? "all" : "filtered",
          subscribed: stats.subscribed,
          seconds: Math.round((now - reportAt) / 100) / 10,
          messages: stats.messages - reported.messages,
          entityChanges: stats.entityChanges - reported.changes,
          updateScriptMs: summarize(updates.map((u) => u.script)),
          updateFrameMs: summarize(updates.map((u) => u.frame)),
          navigationMs: summarize(navigations.map((n) => n.total)),
          navigationFrameMs: summarize(navigations.map((n) => n.frame)),
          frameMs: summarize(reportFrames),
          slowFrames: reportFrames.filter((f) => f > SLOW_FRAME_MS).length,
          heapMB: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
          errors: errors.splice(0),
        }),
      }).catch(() => {}); // no dev server (a production build): the overlay still works
      reportAt = now;
      reported = { messages: stats.messages, changes: stats.entityChanges };
      reportFrames = [];
    }
  }, 1000);
}
