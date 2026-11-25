/**
 * The device's back button closes the topmost layer first. Layers stack back handlers over one
 * history entry of their own, so back never leaves the page while a layer is open, and the
 * entry goes once the last layer closes.
 * With no layer open, back on the app's first entry would leave the app: an entry of ours over it
 * catches that back and asks first.
 * On a touch screen with CloseWatcher (Chrome on Android), back closes a watcher before it moves
 * history, so layers and the guard are watchers there: Chrome skips an entry pushed on back with no tap
 * since, and the back after it would leave the app.
 */
interface Watcher { onclose: (() => void) | null; destroy(): void }
const closeWatcher = () => (globalThis as { CloseWatcher?: new () => Watcher }).CloseWatcher;
const watching = () => !!closeWatcher() && matchMedia('(pointer: coarse)').matches;
const handlers: Array<() => void> = [];
/** The watchers of the open layers, in step with `handlers`. */
const watchers: Watcher[] = [];
let guardWatcher: Watcher | undefined;
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
  if (!askLeave || leaving || handlers.length || !atFirst()) return;
  if (!watching()) return history.pushState({ ...state(), leaveGuard: true }, '', location.href);
  if (guardWatcher) return;
  guardWatcher = watch(() => {
    guardWatcher = undefined;
    // Armed on the first entry, left armed by a page the router opened over it: that back is the page's.
    if (atFirst()) askLeave?.();
    else history.back();
  });
}

function unguard() {
  guardWatcher?.destroy();
  guardWatcher = undefined;
}

function watch(onClose: () => void): Watcher {
  const watcher = new (closeWatcher()!)();
  watcher.onclose = onClose;
  return watcher;
}

function onPopState() {
  if (leaving) return;
  if (watching()) return guard();
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
  if (watching()) return watchLayer(handler);
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

function watchLayer(handler: () => void): () => void {
  unguard();
  const drop = () => {
    const at = watchers.indexOf(watcher);
    if (at < 0) return false;
    watchers.splice(at, 1);
    handlers.splice(at, 1);
    return true;
  };
  const watcher = watch(() => {
    if (!drop()) return;
    handler();
    guard();
  });
  watchers.push(watcher);
  handlers.push(handler);
  return () => {
    if (!drop()) return;
    watcher.destroy();
    guard();
  };
}

/** Calls `ask` on a back that would leave the app, in its place; the returned function stops guarding. */
export function guardLeaving(ask: () => void): () => void {
  listen();
  askLeave = ask;
  guard();
  return () => {
    if (askLeave !== ask) return;
    unguard();
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
  for (const watcher of watchers.splice(0)) watcher.destroy();
  unguard();
  const above = watching() ? 0 : state().backLayer ? 2 : 1;
  let gone = false;
  window.addEventListener('pagehide', () => (gone = true), { once: true });
  history.go(-(above + 1));
  return new Promise(resolve =>
    setTimeout(() => {
      if (gone) return;
      window.close();
      if (above) history.go(-above);
      resolve();
    }, LEAVE_WAIT),
  );
}

/** Keeps the app open after asking: guards again against the next back. */
export function stayInApp() {
  leaving = false;
  guard();
}
