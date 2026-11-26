// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
import { guardLeaving } from './back';
import { keepHomeFirst } from './home-first';

describe('home reached from a page', () => {
  // A tab that showed another site first: the router numbers the app's first entry from the tab's history length.
  it('stays in the app when a page from before it is in the tab', async () => {
    history.replaceState(null, '', '/elsewhere');
    history.pushState(null, '', '/learn');
    const router = await givenApp();
    const visited = recordBrowserVisits();
    await router.replace('/');
    await settle();
    expect(visited).not.toContain('/elsewhere');
  });

  // The leave guard is an entry over the first one that copies its position.
  it('stands on the first entry when reached from the leave guard over it', async () => {
    history.replaceState(null, '', '/learn');
    const router = await givenApp();
    onTestFinished(guardLeaving(() => undefined));
    await router.replace('/');
    await settle();
    const visited = recordBrowserVisits();
    history.back();
    await settle();
    expect(visited).not.toContain('/learn');
  });

  it('asks nothing on its way down to the first entry', async () => {
    history.replaceState(null, '', '/learn');
    const router = await givenApp();
    const ask = vi.fn();
    onTestFinished(guardLeaving(ask));
    await router.replace('/');
    await settle();
    expect(ask).not.toHaveBeenCalled();
  });

  it('leaves home standing guarded, so back asks before leaving', async () => {
    history.replaceState(null, '', '/learn');
    const router = await givenApp();
    const ask = vi.fn();
    onTestFinished(guardLeaving(ask));
    await router.replace('/');
    await settle();
    history.back();
    await settle();
    expect(ask).toHaveBeenCalledOnce();
  });
});

// declarative helpers

async function givenApp() {
  const page = { render: () => null };
  const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: page }, { path: '/learn', component: page }] });
  keepHomeFirst(router);
  await router.push(location.pathname);
  return router;
}

async function settle() {
  for (let i = 0; i < 5; i++) {
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

function recordBrowserVisits() {
  const visited: string[] = [];
  window.addEventListener('popstate', () => visited.push(location.pathname));
  return visited;
}
