import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { Rating } from 'ts-fsrs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { installWhenIdle } from '@/utils/update-hold';
import Review from './review.vue';
import type { DeckCard } from '@/utils/deck';
import type { ReviewGame } from '@/utils/games';
import { sessions } from '@/db/sessions';

vi.mock('@/utils/speak');

const cards: DeckCard[] = Array.from({ length: 3 }, (_, i) => ({ id: `k${i}`, f: `p${i}`, b: `a${i}` }));
let store: ReturnType<typeof useStore>;

beforeEach(async () => {
  for (const k of sessions.keys()) sessions.remove(k);
  store = useStore();
  await store.ready;
  store.progress.value = {};
  store.reviews.value = {};
  store.deck.value = { id: 'root', name: 'Root', children: [{ id: 's', name: 'Section', cards: structuredClone(cards) }] };
  store.scores.value = {};
  store.updateSettings({ groupSize: 5, games: ['match', 'choice', 'recallNative', 'recall', 'type'] });
});

describe('review', () => {
  it('asks in the game the link names', async () => {
    givenLearned('k0');
    givenDue('k0', 'type');
    const w = await doMount(undefined, 'type');
    expect(w.get('[data-testid="stage"]').text()).toBe('Writing');
  });

  it('asks in the linked game while it is off', async () => {
    store.updateSettings({ games: ['match', 'recallNative'] });
    givenLearned('k0');
    givenDue('k0', 'type');
    const w = await doMount(undefined, 'type');
    expect(w.get('[data-testid="stage"]').text()).toBe('Writing');
  });

  it('asks only the cards due in its game', async () => {
    givenLearned('k0', 'k1');
    givenDue('k0', 'type');
    givenDue('k1', 'recall');
    const w = await doMount(undefined, 'recall');
    expect(promptOf(w)).toBe('p1');
  });

  it('moves the card along the schedule of its game only', async () => {
    givenLearned('k0');
    givenDue('k0', 'recall');
    givenDue('k0', 'type');
    await doRecall(await doMount(undefined, 'recall'), true);
    expect(store.isDue('k0', new Date(), 'recall')).toBe(false);
    expect(store.isDue('k0', new Date(), 'type')).toBe(true);
  });

  it('says nothing is due when no card is', async () => {
    givenLearned('k0');
    const w = await doMount();
    expect(w.get('[data-testid="done"]').text()).toBe('Nothing due yet');
  });

  it('asks only the due cards', async () => {
    givenLearned('k0', 'k1');
    givenDue('k1', 'recall');
    const w = await doMount(undefined, 'recall');
    expect(promptOf(w)).toBe('p1');
    await doRecall(w, true);
    expect(w.get('[data-testid="done"]').text()).toBe('Done');
  });

  it('ends at a miss nothing is left to space, leaving it rated forgotten', async () => {
    givenLearned('k0');
    givenDue('k0', 'recall');
    const w = await doMount();
    await doRecall(w, false);
    expect(w.get('[data-testid="done"]').text()).toBe('Done');
    expect(store.isDue('k0', new Date(Date.now() + 60_000 * 60 * 24 * 3), 'recall')).toBe(true);
  });

  it('asks every learned card of a section, due or not', async () => {
    givenLearned('k0', 'k2');
    const w = await doMount('0');
    expect(w.get('h1').text()).toBe('Review: Section');
    const asked = [promptOf(w)];
    await doRecall(w, true);
    asked.push(promptOf(w));
    expect(asked.sort()).toEqual(['p0', 'p2']);
  });

});


describe('an app update', () => {
  it('goes on at the same card', async () => {
    givenLearned('k0', 'k1', 'k2');
    for (const id of ['k0', 'k1', 'k2']) givenDue(id, 'recall');
    const first = await doMount();
    await doRecall(first, true);
    const at = promptOf(first);
    expect(first.get('[data-testid="left"]').text()).toBe('left 2');
    doUpdate(first);
    const w = await doMount();
    expect(promptOf(w)).toBe(at);
    expect(w.get('[data-testid="left"]').text()).toBe('left 2');
  });

  it('can still step back over an answer given before it', async () => {
    givenLearned('k0', 'k1');
    for (const id of ['k0', 'k1']) givenDue(id, 'recall');
    const first = await doMount();
    const asked = promptOf(first);
    await doRecall(first, true);
    doUpdate(first);
    const w = await doMount();
    await w.get('[data-testid="previous"]').trigger('click');
    await nextTick();
    expect(store.isDue(cards.find(c => c.f === asked)!.id, new Date(), 'recall')).toBe(true);
  });

});

describe('the order', () => {
  it('ignores misses in other games', async () => {
    givenLearned('k0', 'k1', 'k2');
    for (const id of ['k0', 'k1', 'k2']) givenDue(id, 'recall');
    store.scores.value = { k2: { type: { right: 0, wrong: 20 } } };
    const w = await doMount();
    const asked: string[] = [];
    for (let i = 0; i < 3; i++) {
      asked.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(asked).toEqual(['p0', 'p1', 'p2']);
  });

  it('follows the order the cards were learned in', async () => {
    givenLearned('k2', 'k0', 'k1');
    for (const id of ['k0', 'k1', 'k2']) givenDue(id, 'recall');
    const w = await doMount();
    const asked: string[] = [];
    for (let i = 0; i < 3; i++) {
      asked.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(asked).toEqual(['p2', 'p0', 'p1']);
  });

  it('starts with the hardest words of the game', async () => {
    givenLearned('k0', 'k1', 'k2');
    for (const id of ['k0', 'k1', 'k2']) givenDue(id, 'recall');
    store.saveScore('k1', 'recall', { right: 1, wrong: 2 });
    store.saveScore('k2', 'recall', { right: 1, wrong: 4 });
    const w = await doMount();
    const asked: string[] = [];
    for (let i = 0; i < 3; i++) {
      asked.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(asked).toEqual(['p2', 'p1', 'p0']);
  });
});

describe('leaving and coming back', () => {
  it('goes on at the same card', async () => {
    givenLearned('k0', 'k1', 'k2');
    for (const id of ['k0', 'k1', 'k2']) givenDue(id, 'recall');
    const first = await doMount();
    await doRecall(first, true);
    const at = promptOf(first);
    first.unmount();
    const w = await doMount();
    expect(promptOf(w)).toBe(at);
    expect(w.get('[data-testid="left"]').text()).toBe('left 2');
  });

  it('keeps a missed card coming back', async () => {
    store.deck.value = { id: 'root', name: 'Root', cards: Array.from({ length: 6 }, (_, i) => ({ id: `k${i}`, f: `p${i}`, b: `a${i}` })) };
    const ids = Array.from({ length: 6 }, (_, i) => `k${i}`);
    givenLearned(...ids);
    for (const id of ids) givenDue(id, 'recall');
    const first = await doMount();
    const missed = promptOf(first);
    await doRecall(first, false);
    first.unmount();
    const w = await doMount();
    const asked = [promptOf(w)];
    for (let i = 0; i < 4; i++) {
      await doRecall(w, true);
      asked.push(promptOf(w));
    }
    expect(asked).toContain(missed);
  });

  it('brings a miss back as soon as it would without leaving', async () => {
    store.deck.value = { id: 'root', name: 'Root', children: [{ id: 's', name: 'Section', cards: Array.from({ length: 10 }, (_, i) => ({ id: `k${i}`, f: `p${i}`, b: `a${i}` })) }] };
    const ids = Array.from({ length: 10 }, (_, i) => `k${i}`);
    givenLearned(...ids);
    for (const id of ids) givenDue(id, 'recall');
    store.updateSettings({ groupSize: 15 });
    let w = await doMount();
    const asked: string[] = [];
    for (let i = 0; i < 7; i++) {
      asked.push(promptOf(w));
      await doRecall(w, !(i === 0));
      w.unmount();
      w = await doMount();
    }
    expect(asked.indexOf('p0', 1)).toBeGreaterThan(0);
  });

  it('starts afresh once the session is done', async () => {
    givenLearned('k0');
    givenDue('k0', 'recall');
    const first = await doMount();
    await doRecall(first, true);
    first.unmount();
    givenDue('k0', 'recall');
    const w = await doMount();
    expect(promptOf(w)).toBe('p0');
  });
});

// declarative helpers

/** Installs an update the way the app does, then leaves the page as the reload would. */
function doUpdate(w: VueWrapper) {
  effectScope().run(() => installWhenIdle(() => true, () => undefined));
  w.unmount();
}

function givenLearned(...ids: string[]) {
  for (const id of ids) store.rate(id, Rating.Good);
}

function givenDue(id: string, game: ReviewGame) {
  store.reviews.value = { ...store.reviews.value, [game]: { ...store.reviews.value[game], [id]: { ...store.reviews.value[game]![id]!, due: new Date(Date.now() - 1000) } } };
}

function doMount(path?: string, game: ReviewGame = 'recall') {
  return mountSuspended(Review, { route: `/review?game=${game}${path ? `&path=${path}` : ''}` });
}

function promptOf(w: VueWrapper) {
  return w.get('[data-testid="prompt"]').text();
}

async function doRecall(w: VueWrapper, remembered: boolean) {
  await w.get('[data-testid="reveal"]').trigger('click');
  await nextTick();
  await w.get(`[data-testid="${remembered ? 'remembered' : 'forgot'}"]`).trigger('click');
  await nextTick();
}
