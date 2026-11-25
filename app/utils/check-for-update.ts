import { useEventListener, useIntervalFn } from '@vueuse/core';
import { installAtMove, noteMove } from '@/utils/update-hold';

/** Asks the browser to fetch the service worker again; a newer one raises the Update button. */
export function checkForUpdate() {
  void navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => undefined);
}

/** Checks now, and installs a waiting update once nothing holds it. */
export function applyUpdates() {
  const pwa = useNuxtApp().$pwa;
  checkForUpdate();
  if (pwa) installAtMove(() => pwa.needRefresh, () => void pwa.updateServiceWorker(true));
}

const MINUTE = 60_000;
/** Steps come every few seconds; one check per this long is enough. */
const STEP_CHECK_GAP = 5_000;

const steps = new EventTarget();
/** A step in a game or a move to another page: an update gets looked for right away, and one waiting may install. */
export function noteStep() {
  noteMove();
  steps.dispatchEvent(new Event('step'));
}

/** While the app is in view, checks every minute, on coming back and on every step, so an update arrives without reloads. */
export function checkWhileOpen(check = checkForUpdate) {
  useIntervalFn(() => document.visibilityState === 'visible' && check(), MINUTE);
  useEventListener(document, 'visibilitychange', () => document.visibilityState === 'visible' && check());
  let checkedAt = -Infinity;
  useEventListener(steps, 'step', () => {
    if (Date.now() - checkedAt < STEP_CHECK_GAP) return;
    checkedAt = Date.now();
    check();
  });
}
