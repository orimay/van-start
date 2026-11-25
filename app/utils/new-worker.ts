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

interface Registration extends EventTarget {
  waiting: { postMessage: (message: unknown) => void } | null;
  installing: (EventTarget & { state: string }) | null;
}

/** Lets a newer service worker take over the first moment nothing holds the update: one waiting on start, or one that finishes installing later. */
export function takeOverWhenIdle(registration: Registration) {
  const waiting = shallowRef(registration.waiting);
  useEventListener(registration, 'updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => worker.state === 'installed' && (waiting.value = registration.waiting));
  });
  installWhenIdle(() => waiting.value !== null, () => waiting.value?.postMessage({ type: 'SKIP_WAITING' }));
}
