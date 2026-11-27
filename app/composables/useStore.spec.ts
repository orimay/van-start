import { CUSTOM_ID, emptyCustom } from '@/utils/custom';
import { cardsOf } from '@/utils/deck';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { save } from '@/db/kv';

// Counts the writes; the store still saves for real.
vi.mock('@/db/kv', async importOriginal => {
  const kv = await importOriginal<typeof import('@/db/kv')>();
  return { ...kv, save: vi.fn(kv.save) };
});

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

// A sound card plays its letter's clip, so like an affix it has no sound of its own to hear.
describe('a sound', () => {
  beforeEach(() => {
    const store = useStore();
    store.saveCustom({ id: CUSTOM_ID, name: 'My cards', cards: [{ id: 'snd', f: 'өй (как в «дом»)', b: 'ui', xb: 'uit, de tuin', k: 'sound' }] });
    store.updateSettings({ games: ['listen', 'recall', 'dictation'], pronounceFirst: false });
  });
  afterEach(() => useStore().saveCustom(emptyCustom()));

  it('is through without the games played by ear', () => {
    const store = useStore();
    store.pass('snd', 'intro');
    store.pass('snd', 'recall');
    expect(store.isThrough('snd')).toBe(true);
  });

  it('is never due in the games played by ear', () => {
    const store = useStore();
    store.rate('snd', store.Rating.Good);
    const later = new Date(Date.now() + 100 * 86_400_000);
    expect(['listen', 'dictation', 'recall'].map(g => store.isDue('snd', later, g as 'recall'))).toEqual([false, false, true]);
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

describe('learning a word again', () => {
  beforeEach(() => {
    const store = useStore();
    store.saveCustom({ id: CUSTOM_ID, name: 'My cards', cards: [
      { id: 'koop', f: 'покупать', b: 'koop' },
      { id: 'verkoop', f: 'продавать', b: 'verkoop', n: 'от: koop (покупать)' },
      { id: 'verkoper', f: 'продавец', b: 'de verkoper', n: 'от: verkoop (продавать)' },
    ] });
    for (const id of ['koop', 'verkoop', 'verkoper']) store.rate(id, store.Rating.Good);
  });
  afterEach(() => useStore().saveCustom(emptyCustom()));
  const learned = () => ['koop', 'verkoop', 'verkoper'].filter(id => useStore().isLearned(id));

  it('makes only that word new when the family stays', () => {
    useStore().relearn('koop', false);
    expect(learned()).toEqual(['verkoop', 'verkoper']);
  });

  it('makes every word built on it new too, at any depth', () => {
    useStore().relearn('koop', true);
    expect(learned()).toEqual([]);
  });

  it('names the words built on it', () => {
    expect(useStore().familyOf('koop').sort()).toEqual(['verkoop', 'verkoper']);
  });

  it('remembers the last choice', () => {
    const store = useStore();
    store.relearn('verkoop', true);
    expect(store.settings.value.relearnDeep).toBe(true);
    store.relearn('verkoop', false);
    expect(store.settings.value.relearnDeep).toBe(false);
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

describe('a mix-up of two forms', () => {
  const card = (id: string, b: string, n?: string) => ({ id, f: id, b, ...(n && { n }) });
  beforeEach(() => {
    const store = useStore();
    store.saveCustom({ id: CUSTOM_ID, name: 'My cards', cards: [
      card('pakken', 'pakken'), card('nemen', 'nemen'),
      card('pakt', 'hij pakt', 'форма от: pakken (брать)'), card('neemt', 'hij neemt', 'форма от: nemen (брать)'),
    ] });
  });
  afterEach(() => {
    const store = useStore();
    store.unconfuse('pakt', 'neemt');
    store.unconfuse('pakken', 'nemen');
    store.saveCustom(emptyCustom());
  });

  it('mixes up their bases too', () => {
    const store = useStore();
    store.confuse('pakt', 'neemt');
    expect([store.confusions.value.pakken, store.confusions.value.nemen]).toEqual([['nemen'], ['pakken']]);
  });

  it('takes the bases back with it', () => {
    const store = useStore();
    store.confuse('pakt', 'neemt');
    store.unconfuse('neemt', 'pakt');
    expect(store.confusions.value).toEqual({});
  });

  it('comes off with its bases', () => {
    const store = useStore();
    store.confuse('pakt', 'neemt');
    store.unconfuse('nemen', 'pakken');
    expect(store.confusions.value).toEqual({});
  });

  it('keeps a base mix-up made on its own', () => {
    const store = useStore();
    store.confuse('pakken', 'nemen');
    store.confuse('pakt', 'neemt');
    store.unconfuse('pakt', 'neemt');
    expect(store.confusions.value).toEqual({ pakken: ['nemen'], nemen: ['pakken'] });
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

describe('a learned group', () => {
  const ids = Array.from({ length: 100 }, (_, i) => `g${i}`);

  it('is saved in one write of progress and one of reviews', () => {
    const store = useStore();
    vi.mocked(save).mockClear();
    store.learn(Object.fromEntries(ids.map(id => [id, store.Rating.Good])));
    expect(vi.mocked(save).mock.calls.map(([key]) => key).sort()).toEqual(['progress', 'reviews']);
  });

  it('is learned and scheduled word by word', () => {
    const store = useStore();
    store.learn({ a: store.Rating.Good, b: store.Rating.Hard });
    expect([store.isLearned('a'), store.isLearned('b'), store.scheduleOf('b', 'recall')?.scheduled_days]).toEqual([true, true, 2]);
  });
});

describe('the course', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keys its cards by the UUIDs saved progress was kept under', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ id: 'root', name: 'Course', cards: [{ id: 'dfnijojf-lcbj-eeii-ilfa-oabkafdmmcpg', f: 'дом', b: 'het huis' }] })));
    useStore().updateSettings({ language: 'ru' });
    await vi.waitFor(() => expect(cardsOf(useStore().course.value!).map(c => c.id)).toEqual(['35d89e95-b219-4488-8b50-e01a053cc2f6']));
  });

  it("links its notes to its old roots, read in the learner's language", async () => {
    const course = { id: 'root', name: 'Course', cards: [{ id: 'gemak', f: 'лёгкость', b: 'het gemak', n: 'от: mak (ручной)' }], roots: [{ id: 'dfnijojf-lcbj-eeii-ilfa-oabkafdmmcpg', f: 'ручной', b: 'mak', k: 'root' }] };
    const english = { names: {}, cards: { gemak: ['ease', '', 'хэмак', 'from: mak (tame)'], 'dfnijojf-lcbj-eeii-ilfa-oabkafdmmcpg': ['tame', '', 'мак'] } };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.endsWith('deck.json') ? course : english)));
    useStore().updateSettings({ language: 'en' });
    await vi.waitFor(() => expect(useStore().index.value.derived.get('35d89e95-b219-4488-8b50-e01a053cc2f6')).toEqual([{ id: 'gemak', gloss: 'tame' }]));
    expect(useStore().index.value.byId.get('35d89e95-b219-4488-8b50-e01a053cc2f6')?.f).toBe('tame');
  });
});
