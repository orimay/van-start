const FIRST_ENTRY = 'home-first';

/**
 * Arriving on home from another page goes back to the app's first history entry and puts home there,
 * so the pages before it are no longer behind it and back on home can only leave the app.
 * A menu opening on home (a hash) is no arrival.
 */
export function keepHomeFirst(router: HomeRouter) {
  // The router numbers entries from the tab's history length, so the app's first entry need not be 0.
  const firstEntry = rememberFirstEntry();
  let rooting = false;
  router.afterEach((to, from, failure) => {
    // The step back lands on the first entry; one already showing home is a duplicate, failed navigation.
    if (rooting) {
      rooting = false;
      if (!failure && to.path !== '/') void router.replace('/');
      return;
    }
    if (failure || firstEntry === undefined) return;
    const steps = positionOf(history.state) - firstEntry;
    if (to.path !== '/' || from.path === '/' || !from.matched.length || steps <= 0) return;
    rooting = true;
    router.go(-steps);
  });
}

type Place = { path: string; matched: readonly unknown[] };
/** Both vue-router copies (Nuxt's and the specs') fit it. */
interface HomeRouter {
  afterEach(guard: (to: Place, from: Place, failure?: unknown) => void): unknown;
  replace(to: string): Promise<unknown>;
  go(delta: number): void;
}

type EntryState = { back?: string | null; position?: number } | null;

function positionOf(state: EntryState) {
  return Number(state?.position ?? 0);
}

/** An entry with nothing of the app behind it is the first; a reload or a return from another site reads it back. */
function rememberFirstEntry() {
  const state = history.state as EntryState;
  try {
    if (state?.back == null) sessionStorage.setItem(FIRST_ENTRY, String(positionOf(state)));
    const stored = sessionStorage.getItem(FIRST_ENTRY);
    return stored === null ? undefined : Number(stored);
  } catch {
    return state?.back == null ? positionOf(state) : undefined;
  }
}
