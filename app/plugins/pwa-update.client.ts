import { checkForUpdate, checkWhileOpen, noteStep } from '@/utils/check-for-update';
import { announceUpdate } from '@/utils/announce-update';
import { reloadOnNewWorker, takeOverAtMove } from '@/utils/new-worker';

/** A new version installs at a move to another card or page while nothing holds it; the page reloads where it was. */
export default defineNuxtPlugin(nuxtApp => {
  announceUpdate(useRuntimeConfig().public.version as string);
  if (navigator.serviceWorker) reloadOnNewWorker(navigator.serviceWorker, () => location.reload());
  // The PWA module's own plugin runs after this one, so the waiting worker is watched here, not through `$pwa`.
  void navigator.serviceWorker?.ready.then(takeOverAtMove);
  checkForUpdate();
  checkWhileOpen();
  nuxtApp.$router.afterEach(noteStep);
});
