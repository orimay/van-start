import { describe, expect, it } from 'vitest';
import { DEFAULT_GAMES, GAME_TITLES, GAMES, learnStages, reviewGameOf, savedGames, toggled } from './games';

describe('learnStages', () => {
  it('runs every game after the intro, from matching to typing', () => {
    expect(learnStages(['dictation', 'type', 'recall', 'listen', 'recallNative', 'choice', 'match'])).toEqual(['intro', 'match', 'choice', 'recallNative', 'listen', 'recall', 'type', 'dictation']);
  });

  it('opens with pronouncing in place of the intro on that choice, and plays it only there', () => {
    expect(learnStages(['match', 'pronounce', 'type'], true)).toEqual(['pronounce', 'match', 'type']);
  });

  it('keeps the intro when pronouncing is off', () => {
    expect(learnStages(['match', 'type'], true)).toEqual(['intro', 'match', 'type']);
  });

  it('names every game by the skill it trains', () => {
    expect([GAME_TITLES.match, GAME_TITLES.choice, GAME_TITLES.dictation]).toEqual(['Associating', 'Recognizing', 'Dictation']);
  });

  it('turns every game on at first', () => {
    expect(DEFAULT_GAMES).toEqual([...GAMES]);
  });

  it('leaves out a game turned off', () => {
    expect(learnStages(['match', 'type'])).toEqual(['intro', 'match', 'type']);
  });
});

describe('reviewGameOf', () => {
  it('is the chosen review game while it is off', () => {
    expect(reviewGameOf('type', ['match', 'recall'])).toBe('type');
  });

  it('is recall when none is chosen', () => {
    expect(reviewGameOf('', ['match', 'recallNative', 'recall'])).toBe('recall');
  });

  it('is the next review game on when recall is off', () => {
    expect(reviewGameOf('', ['match', 'recallNative'])).toBe('recallNative');
  });

  it('is a review game when the chosen one is not', () => {
    expect(reviewGameOf('choice', ['choice', 'type'])).toBe('type');
  });

  it('is recall when no review game is on', () => {
    expect(reviewGameOf('', ['choice'])).toBe('recall');
  });
});

describe('savedGames', () => {
  it('turns everything on for a learner still on the old default set', () => {
    expect(savedGames(['type', 'recall', 'match', 'choice', 'recallNative'])).toEqual([...GAMES]);
  });

  it('keeps a set the learner picked', () => {
    expect(savedGames(['match', 'type'])).toEqual(['match', 'type']);
  });

  it('turns everything on when nothing is saved', () => {
    expect(savedGames(undefined)).toEqual([...GAMES]);
  });
});

describe('toggled', () => {
  it('turns a game off', () => {
    expect(toggled(['match', 'type'], 'match')).toEqual(['type']);
  });

  it('turns a game on', () => {
    expect(toggled(['type'], 'match')).toEqual(['type', 'match']);
  });

  it('keeps the last game on', () => {
    expect(toggled(['type'], 'type')).toEqual(['type']);
  });
});
