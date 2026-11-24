import { beforeEach, describe, expect, it } from 'vitest';
import { exportLog } from './backup';
import { resetDb } from './connect';
import { flushShows, forgetTypical, isSlow, loadTypical, logShow, recallMs, seenBefore, seenInDeckOrder, sessionLog, unlogShow } from './shows';

beforeEach(async () => {
  await resetDb();
  forgetTypical();
});

const plus = (ms: number) => ({ word: 'w', game: 'recall', session: 's', t: 0, answer: 'plus', ms, rung: 0, source: 'new' });

describe('a slow answer', () => {
  it('is never slow before the game has ten pluses', async () => {
    for (let i = 0; i < 9; i++) void logShow(plus(1000));
    await flushShows();
    expect(isSlow('recall', 10_000)).toBe(false);
  });

  it('takes at least one and a half times the typical time when answers are steady', async () => {
    for (let i = 0; i < 10; i++) void logShow(plus(4000));
    await flushShows();
    expect(isSlow('recall', 6100)).toBe(true);
    expect(isSlow('recall', 5900)).toBe(false);
  });

  it('takes at least a second over the typical time', async () => {
    for (let i = 0; i < 10; i++) void logShow(plus(1000));
    await flushShows();
    expect(isSlow('recall', 2100)).toBe(true);
    expect(isSlow('recall', 1900)).toBe(false);
  });

  it('is an outlier beyond the usual spread of the game', async () => {
    for (let i = 0; i < 4; i++) for (const ms of [500, 1000, 2000]) void logShow(plus(ms));
    await flushShows();
    expect(isSlow('recall', 15_000)).toBe(false);
    expect(isSlow('recall', 25_000)).toBe(true);
  });

  it('is judged per game', async () => {
    for (let i = 0; i < 10; i++) void logShow(plus(1000));
    await flushShows();
    expect(isSlow('type', 5000)).toBe(false);
  });

  it('is judged from the stored times after a restart', async () => {
    for (let i = 0; i < 10; i++) void logShow(plus(1000));
    await flushShows();
    forgetTypical();
    await loadTypical();
    expect(isSlow('recall', 2100)).toBe(true);
  });
});

describe('recall time of a card', () => {
  it('is the median of its last five right answers in a game', async () => {
    for (const ms of [9000, 9000, 1000, 2000, 3000, 4000, 99_000]) void logShow(plus(ms));
    await flushShows();
    expect(recallMs('w', 'recall')).toBe(3000);
  });

  it('is unknown in a game it was never answered right in', async () => {
    void logShow({ ...plus(1000), answer: 'minus' });
    void logShow({ ...plus(1000), game: 'type' });
    await flushShows();
    expect(recallMs('w', 'recall')).toBeUndefined();
  });

  it('forgets an answer taken back', async () => {
    void logShow(plus(1000));
    unlogShow(logShow(plus(5000)));
    await flushShows();
    expect(recallMs('w', 'recall')).toBe(1000);
  });

  it('is read from the stored times after a restart', async () => {
    void logShow(plus(1000));
    await flushShows();
    forgetTypical();
    await loadTypical();
    expect(recallMs('w', 'recall')).toBe(1000);
  });
});

describe('the last time a card was seen before this run', () => {
  it('is read from the stored shows on load, per game', async () => {
    void logShow(plus(1000));
    await flushShows();
    forgetTypical();
    await loadTypical();
    expect(Date.now() - seenBefore('w', 'recall')!).toBeLessThan(60_000);
    expect(seenBefore('w', 'type')).toBeUndefined();
  });

  it('is backfilled for a card answered before shows were kept, older the earlier it is in the deck', async () => {
    void logShow(plus(1000));
    await flushShows();
    forgetTypical();
    await loadTypical();
    const seen = seenInDeckOrder(['a', 'b', 'w', 'c'], id => id !== 'c');
    expect(seen('a', 'recall')!).toBeLessThan(seen('b', 'recall')!);
    expect(seen('b', 'recall')!).toBeLessThan(seenBefore('w', 'recall')!);
    expect(seen('w', 'recall')).toBe(seenBefore('w', 'recall'));
    expect(seen('c', 'recall')).toBeUndefined();
  });

  it('is not moved by the answers of this run', async () => {
    await loadTypical();
    void logShow(plus(1000));
    await flushShows();
    expect(seenBefore('w', 'recall')).toBeUndefined();
  });
});

describe('a logged answer', () => {
  it('goes away when taken back', async () => {
    const id = logShow(plus(1000));
    void logShow({ ...plus(500), word: 'v' });
    unlogShow(id);
    await flushShows();
    expect((await exportLog()).shows.map(s => s.word)).toEqual(['v']);
  });
});

describe('a session log', () => {
  it('logs each show in order under its session', async () => {
    const log = sessionLog('s1');
    log.show({ id: 'a', game: 'recall', answer: 'minus', ms: 900, rung: -1, source: 'new' });
    log.show({ id: 'b', game: 'recall', answer: 'plus', ms: 800, rung: -1, source: 'new' });
    await flushShows();
    const { shows } = await exportLog();
    expect(shows.map(s => [s.word, s.session, s.t, s.answer])).toEqual([['a', 's1', 0, 'minus'], ['b', 's1', 1, 'plus']]);
  });

  it('takes the last show of a card away on unshow', async () => {
    const log = sessionLog('s1');
    log.show({ id: 'a', game: 'recall', answer: 'minus', ms: 900, rung: -1, source: 'new' });
    log.show({ id: 'a', game: 'recall', answer: 'plus', ms: 800, rung: 0, source: 'ladder' });
    log.unshow('a');
    await flushShows();
    const { shows } = await exportLog();
    expect(shows.map(s => s.answer)).toEqual(['minus']);
  });
});
