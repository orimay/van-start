/**
 * The device's back button closes the topmost layer first. Layers stack back handlers over one
 * history entry of their own, so back never leaves the page while a layer is open, and the
 * entry goes once the last layer closes.
 * With no layer open, back on the app's first entry would leave the app: an entry of ours over it
 * catches that back and asks first.
 */
const handlers: Array<() => void> = [];
const state = () => (history.state ?? {}) as Record<string, unknown>;
let listening = false;
/** Back steps taken here to drop the layers' entry: they close no layer. */
let ownBacks = 0;
/** Asks whether to leave the app, while the app guards against leaving on back. */
let askLeave: (() => void) | undefined;
/** Set once the user chose to leave: back then goes on as the browser's own. */
let leaving = false;

/** The app's first history entry, where back leaves the app: the router keeps no `back` there, and no entry of ours sits on it. */
const atFirst = () => state().back == null && !state().leaveGuard && !state().backLayer;

/** Puts the guard over the app's first entry, so the back that would leave lands on it and asks. */
function guard() {
  if (askLeave && !leaving && !handlers.length && atFirst()) history.pushState({ ...state(), leaveGuard: true }, '', location.href);
}

function onPopState() {
  if (leaving) return;
  if (ownBacks) ownBacks--;
  else if (handlers.length) handlers.pop()!();
  else if (atFirst() && state().forward != null) arrivedFromPage();
  else if (askLeave && atFirst()) askLeave();
  // Back took the layers' entry; layers still open need it again.
  if (handlers.length && !state().backLayer) history.pushState({ ...state(), backLayer: true }, '', location.href);
  guard();
}

/** Back from a page the router opened on the first entry, not past the guard: nothing to ask. The router's note of that page goes, so the next back here asks. */
function arrivedFromPage() {
  history.replaceState({ ...state(), forward: null }, '', location.href);
}

function listen() {
  if (listening) return;
  window.addEventListener('popstate', onPopState);
  listening = true;
}

/** Registers a layer's back handler; the returned function drops it once the layer closes otherwise. */
export function onBack(handler: () => void): () => void {
  listen();
  if (!handlers.length && !state().backLayer) history.pushState({ ...state(), backLayer: true }, '', location.href);
  handlers.push(handler);
  return () => {
    const at = handlers.lastIndexOf(handler);
    if (at < 0) return;
    handlers.splice(at, 1);
    // Closed by hand: the layers' entry goes, so the next back lands where it would without layers.
    if (!handlers.length && state().backLayer) {
      ownBacks++;
      history.back();
    }
  };
}

/** Calls `ask` on a back that would leave the app, in its place; the returned function stops guarding. */
export function guardLeaving(ask: () => void): () => void {
  listen();
  askLeave = ask;
  guard();
  return () => {
    if (askLeave !== ask) return;
    askLeave = undefined;
    leaving = false;
  };
}

/** How long a back past the app gets to take effect before the app counts as still open. */
export const LEAVE_WAIT = 300;

/**
 * Leaves the app as back on its first entry would, past the entries of ours over it.
 * Resolves only when nothing comes before the app (an installed app, a fresh tab): it then tries
 * to close and else stands on the first entry, so the next back leaves.
 */
export function leaveApp(): Promise<void> {
  leaving = true;
  handlers.length = 0;
  const above = state().backLayer ? 2 : 1;
  let gone = false;
  window.addEventListener('pagehide', () => (gone = true), { once: true });
  history.go(-(above + 1));
  return new Promise(resolve =>
    setTimeout(() => {
      if (gone) return;
      window.close();
      history.go(-above);
      resolve();
    }, LEAVE_WAIT),
  );
}

/** Keeps the app open after asking: guards again against the next back. */
export function stayInApp() {
  leaving = false;
  guard();
}
