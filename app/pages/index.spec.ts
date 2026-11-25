import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { Rating } from 'ts-fsrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import Index from './index.vue';
import { LONG_PRESS_MS } from '@/composables/useLongPress';
import type { ReviewGame } from '@/utils/games';
import { CUSTOM_ID, emptyCustom } from '@/utils/custom';

let store: ReturnType<typeof useStore>;

beforeEach(async () => {
  await useRouter().replace({ hash: '' });
  store = useStore();
  await store.ready;
  store.progress.value = {};
  store.reviews.value = {};
  store.passed.value = {};
  store.deck.value = { id: 'root', name: 'Root', cards: [{ id: 'k0', f: 'p0', b: 'a0' }, { id: 'k1', f: 'p1', b: 'a1' }] };
  store.updateSettings({ games: ['recall', 'type'] });
});

describe('learned count', () => {
  it('leaves out words not through every game on', async () => {
    store.rate('k0', Rating.Good);
    store.rate('k1', Rating.Good);
    store.pass('k1', 'intro');
    const w = await mountSuspended(Index);
    expect(w.text()).toContain('Learned 1');
  });

  it('leaves out words switched off', async () => {
    store.saveCustom({ id: CUSTOM_ID, name: 'My cards', cards: [{ id: 's', f: 'Я дома.', b: 'Ik ben thuis.', k: 'sentence' }] });
    store.rate('s', Rating.Good);
    store.updateSettings({ kinds: { sentence: false } });
    const w = await mountSuspended(Index);
    expect(w.text()).toContain('Learned 0');
    store.updateSettings({ kinds: {} });
    store.saveCustom(emptyCustom());
  });
});

describe('review button', () => {
  it('is not shown while nothing is due', async () => {
    store.rate('k0', Rating.Good);
    const w = await mountSuspended(Index);
    expect(w.find('[data-testid="review"]').exists()).toBe(false);
  });

  it('offers a menu even for one game with cards due', async () => {
    store.rate('k0', Rating.Good);
    givenDue('k0', 'type');
    const w = await mountSuspended(Index);
    await doOpenReview(w);
    expect(w.get('[data-testid="review-type"]').attributes('href')).toContain('game=type');
  });

  it('offers each game with cards due, with how many of them are reviewed today', async () => {
    store.rate('k0', Rating.Good);
    store.rate('k1', Rating.Good);
    givenDue('k0', 'type');
    givenDue('k1', 'type');
    givenDue('k0', 'recall');
    store.rate('k1', Rating.Good, 'type');
    const w = await mountSuspended(Index);
    await doOpenReview(w);
    expect(w.findAll('[data-testid="review-menu"] a').map(a => a.findAll('span').filter(s => !s.find('span').exists()).map(s => s.text()).filter(Boolean).join(' '))).toEqual(['Writing 1/2', 'Speaking 0/1']);
    expect(w.findAll('[data-testid="review-menu"] [role="progressbar"]').map(b => b.attributes('aria-valuenow'))).toEqual(['50', '0']);
    expect(w.get('[data-testid="review-recall"]').attributes('href')).toContain('game=recall');
  });

  it('offers a game turned off', async () => {
    store.updateSettings({ games: ['recall'] });
    store.rate('k0', Rating.Good);
    givenDue('k0', 'type');
    givenDue('k0', 'recall');
    const w = await mountSuspended(Index);
    await doOpenReview(w);
    expect(w.get('[data-testid="review-type"]').attributes('href')).toContain('game=type');
  });
});

describe('review menu', () => {
  it('closes on back', async () => {
    store.rate('k1', Rating.Good);
    givenDue('k1', 'type');
    const w = await mountSuspended(Index);
    await doOpenReview(w);
    expect(w.find('[data-testid="review-menu"]').exists()).toBe(true);
    useRouter().back();
    await vi.waitFor(() => expect(w.find('[data-testid="review-menu"]').exists()).toBe(false), { timeout: 5000 });
  });
});

describe('reminder', () => {
  it('says there are cards to review', async () => {
    store.rate('k0', Rating.Good);
    givenDue('k0', 'type');
    const w = await mountSuspended(Index);
    expect(w.get('[data-testid="reminder"]').text()).toBe('Cards are waiting for review');
    expect(w.find('[data-testid="reviewed-today"]').exists()).toBe(false);
  });

  it('is not shown while nothing is due', async () => {
    store.rate('k0', Rating.Good);
    const w = await mountSuspended(Index);
    expect(w.find('[data-testid="reminder"]').exists()).toBe(false);
  });
});

// declarative helpers

function givenDue(id: string, game: ReviewGame) {
  store.reviews.value = { ...store.reviews.value, [game]: { ...store.reviews.value[game], [id]: { ...store.reviews.value[game]![id]!, due: new Date(Date.now() - 1000) } } };
}

async function doOpenReview(w: VueWrapper) {
  await w.get('[data-testid="review"]').trigger('click');
  await vi.waitFor(() => w.get('[data-testid="review-menu"]'), { timeout: 5000 });
}

describe('a long press', () => {
  it('on review brings every learned word back to now in every game', async () => {
    store.rate('k0', Rating.Good);
    store.rate('k1', Rating.Good);
    givenDue('k0', 'type');
    const w = await mountSuspended(Index);
    await doLongPress(w, 'review');
    await doConfirm(w);
    await doConfirm(w);
    for (const game of ['type', 'recall'] as const) expect(store.dueIn(game)).toEqual(['k0', 'k1']);
    expect(store.isLearned('k0')).toBe(true);
  });

  it('on a game brings the words back to now in that game only', async () => {
    store.rate('k0', Rating.Good);
    store.rate('k1', Rating.Good);
    givenDue('k0', 'type');
    const w = await mountSuspended(Index);
    await doOpenReview(w);
    await doLongPress(w, 'review-type');
    await doConfirm(w);
    await doConfirm(w);
    expect(store.dueIn('type')).toEqual(['k0', 'k1']);
    expect(store.dueIn('recall')).toEqual([]);
  });

  it('changes nothing until the second yes', async () => {
    store.rate('k0', Rating.Good);
    store.rate('k1', Rating.Good);
    givenDue('k0', 'type');
    const w = await mountSuspended(Index);
    await doLongPress(w, 'review');
    await doConfirm(w);
    await w.get('[data-testid="reset-cancel"]').trigger('click');
    expect(store.dueIn('type')).toEqual(['k0']);
  });
});

async function doLongPress(w: VueWrapper, testId: string) {
  await w.get(`[data-testid="${testId}"]`).trigger('pointerdown');
  await new Promise(r => setTimeout(r, LONG_PRESS_MS + 50));
  await w.get(`[data-testid="${testId}"]`).trigger('pointerup');
  await nextTick();
}

async function doConfirm(w: VueWrapper) {
  await w.get('[data-testid="reset-confirm"]').trigger('click');
  await nextTick();
}

describe('update', () => {
  it('installs a waiting update as soon as the page shows', async () => {
    const pwa = useNuxtApp().$pwa!;
    const install = vi.spyOn(pwa, 'updateServiceWorker').mockResolvedValue();
    pwa.needRefresh = true;
    await mountSuspended(Index);
    await vi.waitFor(() => expect(install).toHaveBeenCalledWith(true));
    pwa.needRefresh = false;
  });

  it('installs an update found while the page shows', async () => {
    const pwa = useNuxtApp().$pwa!;
    const install = vi.spyOn(pwa, 'updateServiceWorker').mockResolvedValue();
    pwa.needRefresh = false;
    await mountSuspended(Index);
    expect(install).not.toHaveBeenCalled();
    pwa.needRefresh = true;
    await vi.waitFor(() => expect(install).toHaveBeenCalledWith(true));
    pwa.needRefresh = false;
  });

  it('checks for a new version when shown', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: () => Promise.resolve({ update }) } });
    await mountSuspended(Index);
    await vi.waitFor(() => expect(update).toHaveBeenCalled());
    vi.unstubAllGlobals();
  });
});
