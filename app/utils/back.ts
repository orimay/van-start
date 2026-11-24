/**
 * The device's back button closes the topmost layer first. Layers stack back handlers over one
 * history entry of their own, so back never leaves the page while a layer is open, and the
 * entry goes once the last layer closes.
 */
const handlers: Array<() => void> = [];
const state = () => (history.state ?? {}) as Record<string, unknown>;
let listening = false;
/** Back steps taken here to drop the layers' entry: they close no layer. */
let ownBacks = 0;

function onPopState() {
  if (ownBacks) ownBacks--;
  else handlers.pop()?.();
  // Back took the layers' entry; layers still open need it again.
  if (handlers.length && !state().backLayer) history.pushState({ ...state(), backLayer: true }, '', location.href);
}

/** Registers a layer's back handler; the returned function drops it once the layer closes otherwise. */
export function onBack(handler: () => void): () => void {
  if (!listening) {
    window.addEventListener('popstate', onPopState);
    listening = true;
  }
  if (!handlers.length && !state().backLayer) history.pushState({ ...state(), backLayer: true }, '', location.href);
  handlers.push(handler);
  return () => {
    const at = handlers.lastIndexOf(handler);
    if (at < 0) return;
    handlers.splice(at, 1);
    // Closed by hand: the layers' entry goes, so the next back leaves the page as it would without layers.
    if (!handlers.length && state().backLayer) {
      ownBacks++;
      history.back();
    }
  };
}
