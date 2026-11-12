import { shallowRef } from 'vue';
import { useEventListener } from '@vueuse/core';
import { installWhenIdle } from '@/utils/update-hold';

/** Reloads once a newer service worker takes over the page, the first moment nothing holds the update. */
export function reloadOnNewWorker(container: EventTarget & { controller: object | null }, reload: () => void) {
  const hadWorker = container.controller !== null;
  const tookOver = shallowRef(false);
  useEventListener(container, 'controllerchange', () => (tookOver.value = hadWorker));
  installWhenIdle(() => tookOver.value, reload);
}
