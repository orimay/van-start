/** How long a press holds before it counts as a long press. */
export const LONG_PRESS_MS = 600;

/** Listeners for `v-on`: holding the element runs `fn`, and the tap that ends the hold does nothing else. */
export function longPress(fn: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fired = false;
  const cancel = () => clearTimeout(timer);
  return {
    pointerdown: () => {
      fired = false;
      cancel();
      timer = setTimeout(() => {
        fired = true;
        fn();
      }, LONG_PRESS_MS);
    },
    pointerup: cancel,
    pointerleave: cancel,
    pointercancel: cancel,
    contextmenu: (event: Event) => event.preventDefault(),
    clickCapture: (event: Event) => {
      if (!fired) return;
      fired = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
  };
}
