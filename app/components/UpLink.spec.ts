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
    await givenHistory('/', '/settings');
    const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
    using w = await doMount('/');
    await doFollow(w);
    expect(back).toHaveBeenCalled();
  });

  it('takes the page\'s place otherwise, adding nothing to history', async () => {
    await givenHistory('/edit', '/settings');
    using w = await doMount('/');
    await doFollow(w);
    expect(useRouter().currentRoute.value.fullPath).toBe('/');
    expect(history.state.back).toBe('/edit');
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
