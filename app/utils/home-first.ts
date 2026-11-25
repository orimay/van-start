import type { Router } from 'vue-router';

/**
 * Arriving on home from another page goes back to the app's first history entry and puts home there,
 * so the pages before it are no longer behind it and back on home can only leave the app.
 * A menu opening on home (a hash) is no arrival.
 */
export function keepHomeFirst(router: Router) {
  let rooting = false;
  router.afterEach((to, from, failure) => {
    // The step back lands on the first entry; one already showing home is a duplicate, failed navigation.
    if (rooting) {
      rooting = false;
      if (!failure && to.path !== '/') void router.replace('/');
      return;
    }
    if (failure) return;
    const position = Number((history.state as { position?: number } | null)?.position ?? 0);
    if (to.path !== '/' || from.path === '/' || !from.matched.length || position <= 0) return;
    rooting = true;
    router.go(-position);
  });
}
