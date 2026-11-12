import { computed, onScopeDispose, shallowReactive, shallowRef, watch, watchEffect } from 'vue';
import { playing } from '@/utils/play';
import { markUpdateReload } from '@/utils/update-reload';

const holds = shallowReactive(new Set<object>());
const savers = new Set<() => void>();

/** Holds a waiting update while `busy()` is true, for as long as the caller lives. */
export function holdUpdateWhile(busy: () => boolean) {
  const token = {};
  watchEffect(() => (busy() ? holds.add(token) : holds.delete(token)), { flush: 'sync' });
  onScopeDispose(() => holds.delete(token));
}

/** Runs `save` right before an update reloads the page. */
export function saveBeforeUpdate(save: () => void) {
  savers.add(save);
  onScopeDispose(() => savers.delete(save));
}

const pending = shallowRef(0);
/** Holds a waiting update until `work` settles: a write must land before the page reloads. */
export function holdUntilDone<T>(work: Promise<T>): Promise<T> {
  pending.value++;
  void work.finally(() => pending.value--).catch(() => undefined);
  return work;
}

const held = computed(() => playing.value !== undefined || holds.size > 0 || pending.value > 0);

/** Installs an update the first moment one is `ready()` and nothing holds it. */
export function installWhenIdle(ready: () => boolean, update: () => void) {
  watch(
    () => ready() && !held.value,
    go => {
      if (!go) return;
      savers.forEach(save => save());
      markUpdateReload();
      update();
    },
    { immediate: true, flush: 'sync' },
  );
}
