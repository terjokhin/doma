<script lang="ts">
  /**
   * A light's brightness as a thick bar to tap or drag, in %. The change goes to HA when the finger lifts (or on an
   * arrow key); until HA reports the new state, the bar keeps showing what was asked for, and `onShow` hears every
   * value shown, for a label beside it. The fill moves with a transform, so dragging repaints only the bar.
   */
  let {
    value,
    on,
    label,
    onChange,
    onShow,
  }: { value: number; on: boolean; label: string; onChange: (percent: number) => void; onShow?: (percent: number) => void } = $props();

  let bar: HTMLDivElement;
  let dragging = $state<number | null>(null);
  let sent = $state<number | null>(null);

  // A new state from HA replaces what was asked for.
  $effect(() => {
    void value;
    void on;
    sent = null;
  });

  const shown = $derived(dragging ?? sent ?? (on ? value : 0));
  $effect(() => onShow?.(shown));

  function at(e: PointerEvent) {
    const r = bar.getBoundingClientRect();
    return Math.max(1, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)));
  }

  function down(e: PointerEvent) {
    if (e.button > 0) return;
    bar.setPointerCapture(e.pointerId);
    dragging = at(e);
  }

  function move(e: PointerEvent) {
    if (dragging !== null) dragging = at(e);
  }

  function up() {
    if (dragging === null) return;
    sent = dragging;
    dragging = null;
    onChange(sent);
  }

  function key(e: KeyboardEvent) {
    const by = e.key === "ArrowRight" || e.key === "ArrowUp" ? 10 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -10 : 0;
    if (!by) return;
    e.preventDefault();
    sent = Math.max(1, Math.min(100, (shown || 0) + by));
    onChange(sent);
  }
</script>

<div
  class="bar"
  class:on={shown > 0}
  bind:this={bar}
  role="slider"
  tabindex="0"
  aria-label={label}
  aria-valuemin={1}
  aria-valuemax={100}
  aria-valuenow={shown}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
>
  <span class="bar-fill" style:transform="scaleX({shown / 100})"></span>
</div>
