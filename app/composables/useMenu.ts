import { computed, onScopeDispose, watch } from 'vue';

/** A menu open in history: back closes it, and a pick replaces its entry so back then skips it. */
export function useMenu(name: string) {
  const router = useRouter();
  const route = router.currentRoute;
  const openKey = computed(() => (route.value.hash.startsWith(`#${name}`) ? route.value.hash.slice(name.length + 2) : undefined));
  // An open menu holds the page still; every instance of a name writes the same value.
  const lock = (on: boolean) => [document.documentElement, document.body].forEach(el => (el.style.overflow = on ? 'hidden' : ''));
  watch(() => openKey.value !== undefined, lock, { immediate: true });
  onScopeDispose(() => lock(false));
  return {
    openKey,
    show: (key = '') => router.push({ hash: `#${name}${key === '' ? '' : `-${key}`}` }),
    /** Resolves once the menu has left history, so a layer opened next keeps the entry it pushes. */
    hide: () =>
      new Promise<void>(resolve => {
        const stop = router.afterEach(() => (stop(), resolve()));
        router.back();
      }),
  };
}
