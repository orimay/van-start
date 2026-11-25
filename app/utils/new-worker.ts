import { shallowRef } from 'vue';
import { useEventListener } from '@vueuse/core';
import { installAtMove } from '@/utils/update-hold';

/** Reloads once a newer service worker takes over the page, at a move while nothing holds the update. */
export function reloadOnNewWorker(container: EventTarget & { controller: object | null }, reload: () => void) {
  const hadWorker = container.controller !== null;
  const tookOver = shallowRef(false);
  useEventListener(container, 'controllerchange', () => (tookOver.value = hadWorker));
  installAtMove(() => tookOver.value, reload);
}

interface Registration extends EventTarget {
  waiting: { postMessage: (message: unknown) => void } | null;
  installing: (EventTarget & { state: string }) | null;
}

/** Lets a newer service worker take over at a move while nothing holds the update: one waiting on start, or one that finishes installing later. */
export function takeOverAtMove(registration: Registration) {
  const waiting = shallowRef(registration.waiting);
  useEventListener(registration, 'updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => worker.state === 'installed' && (waiting.value = registration.waiting));
  });
  installAtMove(() => waiting.value !== null, () => waiting.value?.postMessage({ type: 'SKIP_WAITING' }));
}
