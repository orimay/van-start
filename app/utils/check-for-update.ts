import { useEventListener, useIntervalFn } from '@vueuse/core';
import { installWhenIdle } from '@/utils/update-hold';

/** Asks the browser to fetch the service worker again; a newer one raises the Update button. */
export function checkForUpdate() {
  void navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => undefined);
}

/** Checks now, and installs a waiting update once nothing holds it. */
export function applyUpdates() {
  const pwa = useNuxtApp().$pwa;
  checkForUpdate();
  if (pwa) installWhenIdle(() => pwa.needRefresh, () => void pwa.updateServiceWorker(true));
}

const MINUTE = 60_000;

/** While the app is in view, checks every minute and on coming back, so an update arrives without reloads. */
export function checkWhileOpen(check = checkForUpdate) {
  useIntervalFn(() => document.visibilityState === 'visible' && check(), MINUTE);
  useEventListener(document, 'visibilitychange', () => document.visibilityState === 'visible' && check());
}
