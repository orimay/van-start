import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UpLink from './UpLink.vue';

afterEach(() => vi.restoreAllMocks());

describe('the link up', () => {
  it('leads where it says', async () => {
    using w = await doMount('/edit?id=a');
    expect(w.get('a').attributes('href')).toMatch(/\/edit\?id=a$/);
  });

  it('goes back when the page below is where it leads', async () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
    using w = await doMount('/');
    await givenHistory('/', '/settings');
    await doFollow(w);
    expect(back).toHaveBeenCalled();
  });

  it('takes the page\'s place otherwise, adding nothing to history', async () => {
    using w = await doMount('/edit?id=a');
    await givenHistory('/edit', '/settings');
    await doFollow(w);
    await vi.waitFor(() => expect(useRouter().currentRoute.value.fullPath).toBe('/edit?id=a'));
    expect(history.state.back).toBe('/edit');
  });
});

describe('home', () => {
  it('is the first stop of history once reached, so back on it can only leave', async () => {
    using w = await doMount('/');
    await givenHistory('/edit', '/settings');
    await doFollow(w);
    await vi.waitFor(() => expect(history.state.position).toBe(0));
    await flushPromises();
    expect(useRouter().currentRoute.value.fullPath).toBe('/');
  });

  it('stays where it is when a menu opens on it', async () => {
    await givenHistory('/edit', '/');
    await useRouter().push('/#menu');
    await flushPromises();
    expect(useRouter().currentRoute.value.fullPath).toBe('/#menu');
  });
});

// declarative helpers

async function givenHistory(below: string, at: string) {
  const router = useRouter();
  await router.replace(below);
  await router.push(at);
}

async function doMount(to: string) {
  const w = await mountSuspended(UpLink, { props: { to }, slots: { default: () => '‹' } });
  return Object.assign(w, { [Symbol.dispose]: () => w.unmount() });
}

async function doFollow(w: VueWrapper) {
  await w.get('a').trigger('click');
  await flushPromises();
}
