import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import Learn from './learn.vue';
import type { DeckCard } from '@/utils/deck';
import { installWhenIdle } from '@/utils/update-hold';
import { markUpdateReload } from '@/utils/update-reload';
import { sessions } from '@/db/sessions';

vi.mock('@/utils/speak');

const cards: DeckCard[] = Array.from({ length: 4 }, (_, i) => ({ id: `k${i}`, f: `p${i}`, b: `a${i}` }));

beforeEach(async () => {
  for (const k of sessions.keys()) sessions.remove(k);
  sessionStorage.clear();
  const store = useStore();
  await store.ready;
  store.progress.value = {};
  store.passed.value = {};
  store.deck.value = { id: 'root', name: 'Root', cards: structuredClone(cards) };
  store.updateSettings({ groupSize: 5, games: ['match', 'choice', 'recallNative', 'recall', 'type'], topUp: undefined });
});

describe('a section', () => {
  it('starts at its first card with no offer to continue', async () => {
    const w = await doMount();
    expect(w.find('[data-testid="resume"]').exists()).toBe(false);
    expect(promptOf(w)).toBe('p0');
  });
});

describe('the intro of a group with sections', () => {
  it('shows the group own words first, then each section in deck order', async () => {
    useStore().deck.value = {
      id: 'root', name: 'Root', cards: [{ id: 'o', f: 'own', b: 'own' }],
      children: [
        { id: 'a', name: 'A', cards: [{ id: 'a1', f: 'a1', b: 'a1' }], children: [{ id: 'aa', name: 'AA', cards: [{ id: 'aa1', f: 'aa1', b: 'aa1' }] }] },
        { id: 'b', name: 'B', cards: [{ id: 'b1', f: 'b1', b: 'b1' }] },
      ],
    };
    const w = await doMount();
    const seen = [];
    for (let i = 0; i < 4; i++) {
      seen.push(promptOf(w));
      await doClick(w, 'next');
    }
    expect(seen).toEqual(['own', 'a1', 'aa1', 'b1']);
  });
});

describe('a hard word', () => {
  it('missed on the last card moves to the next group, as the summary says', async () => {
    useStore().updateSettings({ games: ['recall'] });
    const w = await doMount();
    await introPrompts(w, 4);
    await doClick(w, 'start-game');
    while (!w.find('[data-testid="done"]').exists()) {
      const last = leftOf(w) === 1;
      await doClick(w, 'reveal');
      await doClick(w, last ? 'forgot' : 'remembered');
    }
    expect(w.get('[data-testid="carried"]').text()).toBe('1 hard word moves to the next group');
  });
});

describe('a group left halfway', () => {
  it('can be continued at the card it was left on', async () => {
    await doLeaveAfter(2);
    const w = await doMount();
    await doContinue(w);
    expect(promptOf(w)).toBe('p2');
  });

  it('continues at the page of the game it was left on', async () => {
    useStore().updateSettings({ games: ['recallNative', 'recall'] });
    const before = await doMount();
    for (let i = 0; i < cards.length; i++) await doClick(before, 'next');
    await doClick(before, 'start-game');
    for (let i = 0; i < 40 && !before.find('[data-testid="start-game"]').exists(); i++) {
      await doRecall(before);
    }
    expect(before.get('[data-testid="stage"]').text()).toContain('Speaking');
    before.unmount();
    const w = await doMount();
    await doClick(w, 'resume');
    expect(w.get('[data-testid="stage"]').text()).toContain('Speaking');
  });

  it('goes on at the page of the game it was left on after an app update', async () => {
    useStore().updateSettings({ games: ['recallNative', 'recall'] });
    const before = await doMount();
    for (let i = 0; i < cards.length; i++) await doClick(before, 'next');
    await doClick(before, 'start-game');
    for (let i = 0; i < 40 && !before.find('[data-testid="start-game"]').exists(); i++) await doRecall(before);
    history.replaceState(null, '', '/learn?path=all');
    await doUpdate(before);
    const w = await doMount();
    expect(w.get('[data-testid="stage"]').text()).toContain('Speaking');
    w.unmount();
    const again = await doMount();
    await doClick(again, 'resume');
    expect(again.get('[data-testid="stage"]').text()).toContain('Speaking');
  });

  it('keeps its misses on their ladder when continued', async () => {
    // Enough words after the miss to bring it back.
    useStore().deck.value = { id: 'root', name: 'Root', cards: Array.from({ length: 10 }, (_, i) => ({ id: `k${i}`, f: `p${i}`, b: `a${i}` })) };
    useStore().updateSettings({ groupSize: 10, games: ['pronounce', 'recall'], pronounceFirst: true });
    const before = await doMount();
    await doClick(before, 'start-game');
    await doClick(before, 'reveal');
    await doClick(before, 'forgot');
    await doRecall(before);
    before.unmount();
    const w = await doMount();
    await doContinue(w);
    while (promptOf(w) !== 'p0') await doRecall(w);
    ensureExists(w, 'shows-left');
  });

  it('starts afresh at the first game when the words it holds are no longer the group', async () => {
    useStore().updateSettings({ games: ['pronounce', 'recall'], pronounceFirst: true });
    useStore().passed.value = { k2: ['pronounce'], k3: ['pronounce'] };
    const at = { stage: 1, queue: [{ match: false, ids: ['k3'] }], size: 2, reported: [] };
    sessions.set('learn-resume:all', JSON.stringify({ path: 'all', ids: ['k2', 'k3'], stage: 1, typeMistakes: [], at }));
    const w = await doMount();
    await doContinue(w);
    expect(promptOf(w)).toBe('p0');
  });

  it('can be started over', async () => {
    await doLeaveAfter(2);
    const w = await doMount();
    await doClick(w, 'start-over');
    await doClick(w, 'confirm-start-over');
    expect(promptOf(w)).toBe('p0');
  });

  it('goes on without asking after an app update', async () => {
    await doLeaveAfter(2);
    history.replaceState(null, '', '/learn?path=all');
    markUpdateReload();
    const w = await doMount();
    expect(w.find('[data-testid="resume"]').exists()).toBe(false);
    expect(promptOf(w)).toBe('p2');
  });

  it('is offered as usual after an app update reloaded another page', async () => {
    await doLeaveAfter(2);
    history.replaceState(null, '', '/');
    markUpdateReload();
    history.replaceState(null, '', '/learn?path=all');
    const w = await doMount();
    expect(w.find('[data-testid="resume"]').exists()).toBe(true);
  });

  it('is offered as usual on the next visit after an update', async () => {
    await doLeaveAfter(2);
    markUpdateReload();
    (await doMount()).unmount();
    const w = await doMount();
    expect(w.find('[data-testid="resume"]').exists()).toBe(true);
  });

  it('shows the games its words passed', async () => {
    await doLeaveAfter(2);
    const w = await doMount();
    expect(readProgress(w)).toEqual([
      { game: 'Intro', passed: '2', of: '4' },
      { game: 'Associating', passed: '0', of: '4' },
      { game: 'Recognizing', passed: '0', of: '4' },
      { game: 'Reading', passed: '0', of: '4' },
      { game: 'Speaking', passed: '0', of: '4' },
      { game: 'Writing', passed: '0', of: '4' },
    ]);
  });

  it('counts an affix through the games played by ear', async () => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [{ id: 'af', f: 'acting on someone', b: 'be-', xb: 'bewonen' }, ...structuredClone(cards)] };
    useStore().updateSettings({ games: ['listen', 'recall', 'dictation'] });
    await doLeaveAfter(2);
    const w = await doMount();
    expect(readProgress(w)).toEqual([
      { game: 'Intro', passed: '2', of: '5' },
      { game: 'Listening', passed: '1', of: '5' },
      { game: 'Speaking', passed: '0', of: '5' },
      { game: 'Dictation', passed: '1', of: '5' },
    ]);
  });

  it('asks before dropping the games its words passed', async () => {
    await doLeaveAfter(2);
    const w = await doMount();
    await doClick(w, 'start-over');
    expect(w.get('[data-testid="passed-games"]').text()).toBe('Intro: 2 words');
    await doClick(w, 'keep-progress');
    await doContinue(w);
    expect(promptOf(w)).toBe('p2');
  });


  it('is not offered again after starting over', async () => {
    await doLeaveAfter(2);
    const first = await doMount();
    await doClick(first, 'start-over');
    await doClick(first, 'confirm-start-over');
    first.unmount();
    const w = await doMount();
    expect(w.find('[data-testid="resume"]').exists()).toBe(false);
  });

  it('is not offered in a section none of its words are in', async () => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [], children: [{ id: 'a', name: 'A', cards: structuredClone(cards).slice(0, 2) }, { id: 'b', name: 'B', cards: structuredClone(cards).slice(2) }] };
    useStore().updateSettings({ groupSize: 2 });
    await doLeaveAfter(1, '0');
    const w = await doMount('1');
    expect(w.find('[data-testid="resume"]').exists()).toBe(false);
  });
});

describe('an app update', () => {
  it('keeps a learned group on its done screen', async () => {
    useStore().updateSettings({ games: ['recallNative'] });
    useStore().deck.value = { id: 'root', name: 'Root', cards: Array.from({ length: 8 }, (_, i) => ({ id: `k${i}`, f: `p${i}`, b: `a${i}` })) };
    useStore().updateSettings({ groupSize: 4 });
    const first = await doMount();
    await introPrompts(first, 4);
    await doClick(first, 'start-game');
    for (let i = 0; i < 4; i++) await doRecall(first);
    ensureExists(first, 'next-group');
    await doUpdate(first);
    ensureExists(await doMount(), 'next-group');
  });
});

describe('the games of a group', () => {
  it('follow the intro with the first game turned on', async () => {
    useStore().updateSettings({ games: ['recallNative', 'type'] });
    const w = await doMount();
    for (let i = 0; i < cards.length; i++) await doClick(w, 'next');
    expect(w.get('[data-testid="stage"]').text()).toBe('Reading · 2/3');
  });

  it('run recall native after choice', async () => {
    useStore().updateSettings({ games: ['choice', 'recallNative'] });
    const w = await doMount();
    expect(w.get('[data-testid="stage"]').text()).toBe('Intro · 1/3');
  });
});

describe('pronouncing in place of the intro', () => {
  it('meets the words in deck order', async () => {
    useStore().updateSettings({ games: ['pronounce', 'recall'], pronounceFirst: true });
    const w = await doMount();
    await doClick(w, 'start-game');
    const seen = [];
    for (let i = 0; i < 4; i++) {
      seen.push(promptOf(w));
      await doRecall(w);
    }
    expect(seen).toEqual(['p0', 'p1', 'p2', 'p3']);
  });

  it('meets the words of a continued group in deck order', async () => {
    useStore().updateSettings({ games: ['pronounce', 'recall'], pronounceFirst: true });
    useStore().pass('k2', 'recall');
    const w = await doMount();
    await doContinue(w);
    const seen = [];
    for (let i = 0; i < 4; i++) {
      seen.push(promptOf(w));
      await doRecall(w);
    }
    expect(seen).toEqual(['p0', 'p1', 'p2', 'p3']);
  });
});

describe('a short last group', () => {
  beforeEach(() => {
    const store = useStore();
    store.deck.value = {
      id: 'root', name: 'Root',
      children: [
        { id: 'a', name: 'A', cards: [{ id: 'a1', f: 'a1', b: 'a1' }, { id: 'a2', f: 'a2', b: 'a2' }, { id: 'a3', f: 'a3', b: 'a3' }] },
        { id: 'b', name: 'B', cards: [{ id: 'b1', f: 'b1', b: 'b1' }, { id: 'b2', f: 'b2', b: 'b2' }] },
      ],
    };
    store.updateSettings({ groupSize: 3 });
    store.rate('a1', store.Rating.Again);
  });

  it('is topped up from the next section when set so', async () => {
    useStore().updateSettings({ topUp: 'next' });
    const w = await doMount('0');
    expect(await introPrompts(w, 3)).toEqual(['a2', 'a3', 'b1']);
  });

  it('is topped up with the words that gave trouble by default', async () => {
    const w = await doMount('0');
    expect((await introPrompts(w, 3)).sort()).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('words met in another group', () => {
  beforeEach(() => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [], children: [{ id: 'a', name: 'A', cards: structuredClone(cards).slice(0, 3) }, { id: 'b', name: 'B', cards: structuredClone(cards).slice(3) }] };
    useStore().updateSettings({ groupSize: 3, games: ['recall'] });
  });

  it('are skipped in the intro of a section', async () => {
    await doLeaveAfter(2);
    const w = await doMount('0');
    await doContinue(w);
    expect(promptOf(w)).toBe('p2');
  });

  it('are skipped in the games they passed', async () => {
    const all = await doMount();
    await introPrompts(all, 3);
    await doClick(all, 'start-game');
    const recalled = [promptOf(all)];
    await doRecall(all);
    recalled.push(promptOf(all));
    await doRecall(all);
    all.unmount();
    const w = await doMount('0');
    await doContinue(w);
    expect(promptOf(w)).toBe(['p0', 'p1', 'p2'].find(p => !recalled.includes(p)));
    await doRecall(w);
    ensureExists(w, 'done');
  });

  it('are skipped in the parent group too', async () => {
    await doLeaveAfter(2, '0');
    const w = await doMount();
    await doContinue(w);
    expect(promptOf(w)).toBe('p2');
  });

  it('come back for a game turned on after they were learned', async () => {
    const store = useStore();
    for (const c of cards.slice(0, 3)) store.rate(c.id, store.Rating.Good);
    for (const c of cards.slice(0, 3)) for (const g of ['intro', 'recall']) store.pass(c.id, g);
    store.pass('k0', 'type');
    store.updateSettings({ groupSize: 2, games: ['recall', 'type'] });
    const w = await doMount('0');
    await doContinue(w);
    ensureExists(w, 'session-progress');
    expect(w.get('[data-testid="stage"]').text()).toContain('Writing');
    expect(w.get('[data-testid="left"]').text()).toBe('left 2');
  });

  it('skip the games they passed when they top up a short group', async () => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [], children: [{ id: 'a', name: 'A', cards: structuredClone(cards).slice(0, 1) }, { id: 'b', name: 'B', cards: structuredClone(cards).slice(1) }] };
    await doLeaveAfter(2, '1');
    useStore().updateSettings({ topUp: 'next' });
    const w = await doMount('0');
    expect(promptOf(w)).toBe('p0');
    await doClick(w, 'next');
    ensureExists(w, 'start-game');
  });


  it('continue a topped-up group at the card it was left on', async () => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [], children: [{ id: 'a', name: 'A', cards: structuredClone(cards).slice(0, 1) }, { id: 'b', name: 'B', cards: structuredClone(cards).slice(1) }] };
    useStore().updateSettings({ topUp: 'next' });
    const first = await doMount('0');
    await doClick(first, 'next');
    await doClick(first, 'next');
    first.unmount();
    const w = await doMount('0');
    await doContinue(w);
    expect(promptOf(w)).toBe('p2');
  });

  it('can be started over', async () => {
    await doLeaveAfter(2);
    const w = await doMount('0');
    await doClick(w, 'start-over');
    await doClick(w, 'confirm-start-over');
    expect(promptOf(w)).toBe('p0');
  });
});

describe('a continued group', () => {
  it('holds as many words as a group holds now', async () => {
    sessions.set('learn-resume:all', JSON.stringify({ path: 'all', ids: ['k0', 'k1', 'k2', 'k3'], stage: 0, typeMistakes: [] }));
    useStore().pass('k0', 'intro');
    useStore().updateSettings({ groupSize: 2 });
    const w = await doMount();
    await doContinue(w);
    expect(w.get('[data-testid="left"]').text()).toBe('left 1');
  });

  it('takes the words not learned yet in deck order, started or not', async () => {
    useStore().updateSettings({ games: ['pronounce', 'recall'], pronounceFirst: true, groupSize: 2 });
    useStore().pass('k3', 'recall');
    const w = await doMount();
    await doContinue(w);
    const seen = [promptOf(w)];
    await doRecall(w);
    seen.push(promptOf(w));
    expect(seen).toEqual(['p0', 'p1']);
  });
});

describe('a spot topped up past a multiple of five', () => {
  it('is not offered to continue', async () => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [], children: [{ id: 'a', name: 'A', cards: structuredClone(cards).slice(0, 1) }, { id: 'b', name: 'B', cards: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, f: `n${i}`, b: `n${i}` })) }] };
    sessions.set('learn-resume:0', JSON.stringify({ path: '0', ids: ['k0', 'n0', 'n1', 'n2', 'n3', 'n4'], stage: 0, typeMistakes: [] }));
    const w = await doMount('0');
    expect(w.find('[data-testid="resume"]').exists()).toBe(false);
  });
});

describe('words started under other settings', () => {
  it('count as new when they passed none of the games on', async () => {
    const store = useStore();
    for (const c of cards.slice(0, 3)) {
      store.rate(c.id, store.Rating.Good);
      store.pass(c.id, 'intro');
    }
    store.updateSettings({ groupSize: 2, games: ['pronounce', 'recall'], pronounceFirst: true });
    const w = await doMount();
    expect(w.find('[data-testid="resume"]').exists()).toBe(false);
    await doClick(w, 'start-game');
    expect(promptOf(w)).toBe('p0');
  });

  it('are offered to continue when they are past the first group', async () => {
    useStore().pass('k3', 'intro');
    useStore().updateSettings({ groupSize: 2, games: ['recall'] });
    const w = await doMount();
    // The group to continue is the first two words; the started k3 is not in it.
    expect(readProgress(w)).toEqual([{ game: 'Intro', passed: '0', of: '2' }, { game: 'Speaking', passed: '0', of: '2' }]);
  });

  it('are offered to continue before a short group asks to be topped up', async () => {
    useStore().deck.value = { id: 'root', name: 'Root', cards: [], children: [{ id: 'a', name: 'A', cards: structuredClone(cards).slice(0, 2) }, { id: 'b', name: 'B', cards: structuredClone(cards).slice(2) }] };
    useStore().pass('k1', 'intro');
    useStore().updateSettings({ groupSize: 3, games: ['recall'] });
    const w = await doMount('0');
    ensureExists(w, 'resume');
    expect(w.find('[data-testid="top-up-next"]').exists()).toBe(false);
  });
});

// declarative helpers

async function introPrompts(w: VueWrapper, n: number) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    seen.push(promptOf(w));
    await doClick(w, 'next');
  }
  return seen;
}

const mounted: VueWrapper[] = [];
afterEach(() => mounted.splice(0).forEach(w => w.unmount()));

async function doMount(path = 'all') {
  const w = await mountSuspended(Learn, { route: `/learn?path=${path}` });
  mounted.push(w);
  return w;
}

function promptOf(w: VueWrapper) {
  return w.get('[data-testid="prompt"]').text();
}

async function doClick(w: VueWrapper, testId: string) {
  await w.get(`[data-testid="${testId}"]`).trigger('click');
  await nextTick();
}

async function doRecall(w: VueWrapper) {
  await doClick(w, 'reveal');
  await doClick(w, 'remembered');
}

function ensureExists(w: VueWrapper, testId: string) {
  expect(w.find(`[data-testid="${testId}"]`).exists()).toBe(true);
}

/** Installs an update the way the app does, then leaves the page as the reload would. */
/** Installs an update the moment the writes so far have landed, as the app would. */
async function doUpdate(w: VueWrapper) {
  const scope = effectScope();
  let installed = false;
  scope.run(() => installWhenIdle(() => true, () => (installed = true)));
  await vi.waitFor(() => expect(installed).toBe(true));
  scope.stop();
  w.unmount();
}

async function doLeaveAfter(n: number, path = 'all') {
  const w = await doMount(path);
  for (let i = 0; i < n; i++) await doClick(w, 'next');
  w.unmount();
}

/** Each game's bar on the offer to continue. */
function readProgress(w: VueWrapper) {
  return w.findAll('[data-testid="resume-progress"]').map(row => {
    const bar = row.get('[role="progressbar"]');
    return { game: row.get('[data-testid="resume-game"]').text(), passed: bar.attributes('aria-valuenow'), of: bar.attributes('aria-valuemax') };
  });
}

/** Continues the saved spot, past the page of its game. */
async function doContinue(w: VueWrapper) {
  await doClick(w, 'resume');
  if (w.find('[data-testid="start-game"]').exists()) await doClick(w, 'start-game');
}

function leftOf(w: VueWrapper) {
  return Number(w.get('[data-testid="left"]').text().replace('left ', ''));
}

