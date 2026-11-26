import { holdBack } from './back';

const FIRST_ENTRY = 'home-first';

/**
 * Arriving on home from another page goes back to the app's first history entry and puts home there,
 * so the pages before it are no longer behind it and back on home can only leave the app.
 * A menu opening on home (a hash) is no arrival.
 */
export function keepHomeFirst(router: HomeRouter) {
  // The router numbers entries from the tab's history length, so the app's first entry need not be 0.
  const firstEntry = rememberFirstEntry();
  if (firstEntry === undefined) return;
  let release: (() => void) | undefined;
  const onFirstEntry = () => {
    const state = history.state as EntryState;
    return positionOf(state) === firstEntry && !state?.leaveGuard && !state?.backLayer;
  };
  // Entries of ours over an entry copy its position: one step more passes each of them.
  const stepBack = () => router.go(-Math.max(1, positionOf(history.state) - firstEntry));
  router.afterEach((to, from, failure) => {
    if (release) {
      if (!onFirstEntry() && positionOf(history.state) >= firstEntry) return stepBack();
      const done = release;
      release = undefined;
      // A step landing on home already is a duplicate, failed navigation.
      if (failure || to.path === '/' || !onFirstEntry()) return done();
      void router.replace('/').finally(done);
      return;
    }
    if (failure || to.path !== '/' || from.path === '/' || !from.matched.length || onFirstEntry()) return;
    release = holdBack();
    stepBack();
  });
}

type Place = { path: string; matched: readonly unknown[] };
/** Both vue-router copies (Nuxt's and the specs') fit it. */
interface HomeRouter {
  afterEach(guard: (to: Place, from: Place, failure?: unknown) => void): unknown;
  replace(to: string): Promise<unknown>;
  go(delta: number): void;
}

type EntryState = { back?: string | null; position?: number; leaveGuard?: boolean; backLayer?: boolean } | null;

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
