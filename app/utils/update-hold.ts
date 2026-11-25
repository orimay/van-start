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

/** How long after a move an update may still install: a new worker takes over a moment after it is told to. */
const MOVE_GRACE = 2_000;
const moving = shallowRef(false);
let settle: ReturnType<typeof setTimeout> | undefined;
/** A move to another card or page: the one moment an update may reload the app under the learner. */
export function noteMove() {
  moving.value = true;
  clearTimeout(settle);
  settle = setTimeout(() => (moving.value = false), MOVE_GRACE);
}

/** Installs an update at a move, once one is `ready()` and nothing holds it. */
export function installAtMove(ready: () => boolean, update: () => void) {
  // Once: the saves below hold the update and release it again.
  let installed = false;
  watch(
    () => ready() && !held.value && moving.value,
    go => {
      if (!go || installed) return;
      installed = true;
      savers.forEach(save => save());
      markUpdateReload();
      update();
    },
    { immediate: true, flush: 'sync' },
  );
}
