import type { HassEntity } from "home-assistant-js-websocket";
import { clock } from "./clock.svelte";
import { timeLeft } from "./routine";

/**
 * What's left of a timer, kept current: in minutes, it follows the app's clock (every 10 s), and in its last minute,
 * in seconds, it ticks every second; nothing ticks while the timer is idle. Create it while a component starts.
 */
export class Countdown {
  #timer: () => HassEntity | undefined;
  #tick = $state(0);

  /** Milliseconds left, or undefined while the timer is idle (or there's none). */
  left = $derived.by(() => {
    const timer = this.#timer();
    if (!timer || timer.state === "idle") return undefined;
    // Recomputed on each tick, and when the timer changes: then the clock's last tick may be 10 s old.
    void clock.now;
    void this.#tick;
    return timeLeft(timer, Date.now());
  });

  constructor(timer: () => HassEntity | undefined) {
    this.#timer = timer;
    const lastMinute = $derived(this.#timer()?.state === "active" && this.left !== undefined && this.left < 60_000);
    $effect(() => {
      if (!lastMinute) return;
      const id = setInterval(() => (this.#tick = Date.now()), 1000);
      return () => clearInterval(id);
    });
  }
}
