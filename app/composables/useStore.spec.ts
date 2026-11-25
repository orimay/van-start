import { CUSTOM_ID, emptyCustom } from '@/utils/custom';
import { cardsOf } from '@/utils/deck';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(async () => {
  const store = useStore();
  await store.ready;
  store.progress.value = {};
  store.passed.value = {};
  store.updateSettings({ games: ['recall'], pronounceFirst: false });
});

describe('a word', () => {
  it('is through once it passed every game on', () => {
    const store = useStore();
    store.pass('w', 'intro');
    store.pass('w', 'recall');
    expect(store.isThrough('w')).toBe(true);
  });

  it('is not through when learned under other settings', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    store.pass('w', 'intro');
    store.updateSettings({ games: ['pronounce', 'recall'], pronounceFirst: true });
    expect(store.isThrough('w')).toBe(false);
  });

  it('learned before games were tracked is through', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    expect(store.isThrough('w')).toBe(true);
  });
});

describe('an affix', () => {
  beforeEach(() => {
    const store = useStore();
    store.saveCustom({ id: CUSTOM_ID, name: 'My cards', cards: [{ id: 'af', f: 'acting on someone', b: 'be-', xb: 'bewonen' }] });
    store.updateSettings({ games: ['listen', 'recall', 'dictation'], pronounceFirst: false });
  });
  afterEach(() => useStore().saveCustom(emptyCustom()));

  it('is through without the games played by ear', () => {
    const store = useStore();
    store.pass('af', 'intro');
    store.pass('af', 'recall');
    expect(store.isThrough('af')).toBe(true);
  });

  it('is never due in the games played by ear', () => {
    const store = useStore();
    store.rate('af', store.Rating.Good);
    const later = new Date(Date.now() + 100 * 86_400_000);
    expect(['listen', 'dictation', 'recall'].map(g => store.isDue('af', later, g as 'recall'))).toEqual([false, false, true]);
  });
});

describe('a review schedule', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-01-01T09:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());
  const daysToDue = (store: ReturnType<typeof useStore>, game: 'recall' | 'type' = 'recall') => Math.round((new Date(store.scheduleOf('w', game)!.due).getTime() - Date.now()) / 86_400_000);
  const laterBy = (days: number) => vi.setSystemTime(Date.now() + days * 86_400_000);
  /** Answers right when due, as a review would. */
  const reviewOnTime = (store: ReturnType<typeof useStore>) => {
    laterBy(daysToDue(store));
    store.rate('w', store.Rating.Good, 'recall');
  };

  it('asks a learned word on day 2', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    expect(daysToDue(store)).toBe(2);
  });

  it('goes on to day 7 and day 30 with each right answer', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    reviewOnTime(store);
    expect(daysToDue(store)).toBe(7);
    reviewOnTime(store);
    expect(daysToDue(store)).toBe(30);
  });

  it('doubles the gap after day 30', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    for (let i = 0; i < 3; i++) reviewOnTime(store);
    expect(daysToDue(store)).toBe(60);
  });

  it('of one game stays apart from the others', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    reviewOnTime(store);
    expect(daysToDue(store, 'type')).toBe(0);
  });

  it('stays at day 2 when a miss is put right in the same session', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    reviewOnTime(store);
    store.rate('w', store.Rating.Again, 'recall');
    store.rate('w', store.Rating.Good, 'recall');
    expect(daysToDue(store)).toBe(2);
  });

  it('starts over at day 2 after a miss', () => {
    const store = useStore();
    store.rate('w', store.Rating.Good);
    reviewOnTime(store);
    store.rate('w', store.Rating.Again, 'recall');
    expect(daysToDue(store)).toBe(2);
  });

  describe('answered right before it is due', () => {
    it('counts for the gap the days since cover, not the one it waits out', () => {
      const store = useStore();
      store.rate('w', store.Rating.Good);
      reviewOnTime(store);
      laterBy(3);
      store.rate('w', store.Rating.Good, 'recall');
      expect(daysToDue(store)).toBe(7);
    });

    it('stays as it was when the days since cover no gap', () => {
      const store = useStore();
      store.rate('w', store.Rating.Good);
      reviewOnTime(store);
      laterBy(1);
      store.rate('w', store.Rating.Good, 'recall');
      expect(daysToDue(store)).toBe(6);
    });

    it('moves on a whole step once its due time has come, however early that was set', () => {
      const store = useStore();
      store.rate('w', store.Rating.Good);
      reviewOnTime(store);
      store.reviews.value.recall!.w!.due = new Date(Date.now() - 1000);
      store.rate('w', store.Rating.Good, 'recall');
      expect(daysToDue(store)).toBe(30);
    });
  });
});

describe('forgetting learning', () => {
  it('makes the words new again and leaves the others', () => {
    const store = useStore();
    for (const id of ['a', 'b']) store.rate(id, store.Rating.Good);
    store.pass('a', 'intro');
    store.forgetLearning(['a']);
    expect(store.isLearned('a')).toBe(false);
    expect(store.passed.value.a).toBeUndefined();
    expect(store.scheduleOf('a', 'recall')).toBeUndefined();
    expect(store.isLearned('b')).toBe(true);
  });

  it('keeps the right and wrong answer counts', () => {
    const store = useStore();
    store.rate('a', store.Rating.Good);
    store.saveScore('a', 'recall', { right: 3, wrong: 1 });
    store.forgetLearning(['a']);
    expect(store.scores.value.a?.recall).toEqual({ right: 3, wrong: 1 });
  });
});

describe('forgetting reviews', () => {
  it('makes the words due now in that game only', () => {
    const store = useStore();
    store.rate('a', store.Rating.Good);
    store.forgetReviews(['a'], ['recall']);
    expect(store.isDue('a', new Date(), 'recall')).toBe(true);
    expect(store.isDue('a', new Date(), 'type')).toBe(false);
  });

  it('starts the gaps over and keeps the words learned and their counts', () => {
    const store = useStore();
    store.rate('a', store.Rating.Good);
    store.rate('a', store.Rating.Good, 'recall');
    store.saveScore('a', 'recall', { right: 3, wrong: 1 });
    store.forgetReviews(['a'], ['recall']);
    store.rate('a', store.Rating.Good, 'recall');
    expect(Math.round((new Date(store.scheduleOf('a', 'recall')!.due).getTime() - Date.now()) / 86_400_000)).toBe(2);
    expect(store.isLearned('a')).toBe(true);
    expect(store.scores.value.a?.recall).toEqual({ right: 3, wrong: 1 });
  });

  it('leaves other words alone', () => {
    const store = useStore();
    for (const id of ['a', 'b']) store.rate(id, store.Rating.Good);
    store.forgetReviews(['a'], ['recall']);
    expect(store.isDue('b', new Date(), 'recall')).toBe(false);
  });
});

describe('a mix-up', () => {
  beforeEach(() => useStore().unconfuse('a', 'b'));

  it('links both cards', () => {
    const store = useStore();
    store.confuse('a', 'b');
    expect([store.confusions.value.a, store.confusions.value.b]).toEqual([['b'], ['a']]);
  });

  it('comes off both cards', () => {
    const store = useStore();
    store.confuse('a', 'b');
    store.unconfuse('b', 'a');
    expect(store.confusions.value).toEqual({});
  });
});

describe('saved progress', () => {
  it('brings back everything kept', () => {
    const store = useStore();
    store.rate('a', store.Rating.Good);
    store.rate('a', store.Rating.Good, 'recall');
    store.pass('b', 'intro');
    store.saveScore('a', 'recall', { right: 3, wrong: 1 });
    store.confuse('a', 'b');
    const kept = () => JSON.parse(JSON.stringify({ confusions: store.confusions.value, progress: store.progress.value, reviews: store.reviews.value, passed: store.passed.value, scores: store.scores.value, reviewLog: store.reviewLog.value, custom: store.custom.value, edits: store.edits.value }));
    const before = kept();
    const json = store.exportProgress();
    store.forgetLearning(['a', 'b']);
    store.scores.value = {};
    store.unconfuse('a', 'b');
    store.importProgress(json);
    expect(kept()).toEqual(before);
  });
});

describe('a kind switched off', () => {
  const later = () => new Date(Date.now() + 100 * 86_400_000);
  beforeEach(() => {
    const store = useStore();
    store.saveCustom({ id: CUSTOM_ID, name: 'My cards', cards: [{ id: 'word', f: 'дом', b: 'het huis' }, { id: 'sent', f: 'Я дома.', b: 'Ik ben thuis.', k: 'sentence' }] });
    for (const id of ['word', 'sent']) store.rate(id, store.Rating.Good);
  });
  afterEach(() => {
    const store = useStore();
    store.updateSettings({ kinds: {}, groupKinds: {} });
    store.saveCustom(emptyCustom());
  });
  const shown = () => cardsOf(useStore().deck.value!).map(c => c.id).filter(id => ['word', 'sent'].includes(id));

  it('takes its cards out of the deck and the reviews', () => {
    const store = useStore();
    store.updateSettings({ kinds: { sentence: false } });
    expect([shown(), store.dueIn('recall', later())]).toEqual([['word'], ['word']]);
  });

  it('keeps their progress for when it is back on', () => {
    const store = useStore();
    store.updateSettings({ kinds: { sentence: false } });
    store.updateSettings({ kinds: { sentence: true } });
    expect([shown(), store.isLearned('sent'), store.dueIn('recall', later())]).toEqual([['word', 'sent'], true, ['word', 'sent']]);
  });

  it('follows a group switch', () => {
    const store = useStore();
    store.updateSettings({ kinds: { sentence: false }, groupKinds: { [CUSTOM_ID]: { sentence: true } } });
    expect(shown()).toEqual(['word', 'sent']);
  });
});
