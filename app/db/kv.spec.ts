import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './connect';
import { forgetWritten, load, save } from './kv';

beforeEach(async () => {
  await resetDb();
  forgetWritten();
});

describe('a stored map of words', () => {
  it('reads back as saved, in its key order', async () => {
    await save('progress', { b: { due: 1 }, a: { due: 2 } });
    expect(Object.entries((await load('progress'))!)).toEqual([['b', { due: 1 }], ['a', { due: 2 }]]);
  });

  it('drops words removed since the last save', async () => {
    await save('passed', { a: ['intro'], b: ['recall'] });
    await save('passed', { b: ['recall', 'typing'] });
    expect(await load('passed')).toEqual({ b: ['recall', 'typing'] });
  });

  it('is undefined until saved, and empty once saved empty', async () => {
    expect(await load('gameScores')).toBeUndefined();
    await save('gameScores', {});
    expect(await load('gameScores')).toEqual({});
  });
});

describe('review schedules', () => {
  it('read back per game', async () => {
    const reviews = { recall: { a: { due: '2026-01-02T00:00:00.000Z' } }, typing: { a: { due: '2026-01-03T00:00:00.000Z' }, b: { due: '2026-01-04T00:00:00.000Z' } } };
    await save('reviews', reviews);
    expect(await load('reviews')).toEqual(reviews);
  });
});

describe('a document', () => {
  it('reads back as saved', async () => {
    await save('settings', { language: 'ru', games: ['recall'] });
    expect(await load('settings')).toEqual({ language: 'ru', games: ['recall'] });
  });

  it('keeps the last of several unawaited saves', async () => {
    void save('reviewed', { day: 1 });
    void save('reviewed', { day: 2 });
    expect(await load('reviewed')).toEqual({ day: 2 });
  });
});
