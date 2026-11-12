import { checkForUpdate, checkWhileOpen } from '@/utils/check-for-update';
import { installWhenIdle } from '@/utils/update-hold';
import { announceUpdate } from '@/utils/announce-update';
import { reloadOnNewWorker } from '@/utils/new-worker';

/** A new version installs the first moment nothing holds it; the page reloads where it was. */
export default defineNuxtPlugin(nuxtApp => {
  announceUpdate(useRuntimeConfig().public.version as string);
  if (navigator.serviceWorker) reloadOnNewWorker(navigator.serviceWorker, () => location.reload());
  checkForUpdate();
  const pwa = nuxtApp.$pwa;
  if (!pwa) return;
  installWhenIdle(() => pwa.needRefresh, () => void pwa.updateServiceWorker(true));
  checkWhileOpen();
});
