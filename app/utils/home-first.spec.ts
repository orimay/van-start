// @vitest-environment happy-dom
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createRouter, createWebHistory } from 'vue-router';
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
