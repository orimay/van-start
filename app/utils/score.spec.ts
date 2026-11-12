import { describe, expect, it } from 'vitest';
import { countsAnswer, type GameScores, isMissed, oddsOf, type Score, scored, sessionScore, worstGame, worstScore } from './score';

describe('scored', () => {
  it('counts a session of right answers as one right', () => {
    expect(scored(undefined, [true, true])).toEqual({ right: 1, wrong: 0 });
  });

  it('counts a session with a miss as that miss alone', () => {
    expect(scored({ right: 2, wrong: 1 }, [true, false])).toEqual({ right: 2, wrong: 2 });
  });

  it('counts every miss of a session', () => {
    expect(scored(undefined, [false, true, false])).toEqual({ right: 0, wrong: 2 });
  });

  it('leaves the score of a session without answers', () => {
    expect(scored({ right: 1, wrong: 0 }, [])).toEqual({ right: 1, wrong: 0 });
  });
});

describe('isMissed', () => {
  it('holds for a card missed as often as answered right', () => {
    expect(isMissed({ right: 1, wrong: 1 })).toBe(true);
  });

  it('holds not for a card answered right more often', () => {
    expect(isMissed({ right: 2, wrong: 1 })).toBe(false);
  });

  it('holds not for a card never answered', () => {
    expect(isMissed(undefined)).toBe(false);
  });
});

describe('oddsOf', () => {
  it('is even for a card never answered', () => {
    expect(oddsOf(undefined)).toBe(1);
  });

  it('grows with each miss', () => {
    expect(oddsOf({ right: 0, wrong: 2 })).toBeGreaterThan(oddsOf({ right: 0, wrong: 1 }));
    expect(oddsOf({ right: 0, wrong: 1 })).toBeGreaterThan(1);
  });

  it('falls with each right answer', () => {
    expect(oddsOf({ right: 2, wrong: 0 })).toBeLessThan(oddsOf({ right: 1, wrong: 0 }));
    expect(oddsOf({ right: 1, wrong: 0 })).toBeLessThan(1);
  });

  it('depends on the balance alone', () => {
    expect(oddsOf({ right: 3, wrong: 3 })).toBe(1);
  });
});

describe('countsAnswer', () => {
  it('holds for listening', () => {
    expect(countsAnswer('listen')).toBe(true);
  });

  it('holds for recall and typing', () => {
    expect(['recall', 'recallNative', 'type'].every(countsAnswer)).toBe(true);
  });

  it('holds not for matching and choosing, where a slip of the finger shows as a miss', () => {
    expect(['match', 'choice'].some(countsAnswer)).toBe(false);
  });
});

describe('sessionScore', () => {
  function track(start: Record<string, GameScores> = {}) {
    const scores: Record<string, GameScores> = { ...start };
    const session = sessionScore((id, game) => scores[id]?.[game], (id, game, s) => (scores[id] = { ...scores[id], [game]: s }));
    return { scores, session };
  }

  it('records a counted answer on the card in its game', () => {
    const { scores, session } = track();
    session.answer('a', 'recall', false);
    expect(scores.a).toEqual({ recall: { right: 0, wrong: 1 } });
  });

  it('skips an answer of a game that does not count', () => {
    const { scores, session } = track();
    session.answer('a', 'choice', false);
    expect(scores.a).toBeUndefined();
  });

  it('keeps each game of a card apart', () => {
    const { scores, session } = track({ a: { recall: { right: 2, wrong: 0 } } });
    session.answer('a', 'recall', true);
    session.answer('a', 'type', false);
    expect(scores.a).toEqual({ recall: { right: 3, wrong: 0 }, type: { right: 0, wrong: 1 } });
  });

  it('turns a right of the session into the miss that follows it in the same game', () => {
    const { scores, session } = track({ a: { recall: { right: 2, wrong: 0 } } });
    session.answer('a', 'recall', true);
    session.answer('a', 'recall', false);
    expect(scores.a?.recall).toEqual({ right: 2, wrong: 1 });
  });

  it('takes back the last answer of the card in that game on undo', () => {
    const { scores, session } = track({ a: { recall: { right: 2, wrong: 0 } } });
    session.answer('a', 'recall', true);
    session.answer('a', 'recall', false);
    session.undo('a', 'recall');
    expect(scores.a?.recall).toEqual({ right: 3, wrong: 0 });
  });
});

describe('worstGame', () => {
  const games = ['recallNative', 'recall', 'type'];

  it('is the missed game with the most misses over right answers', () => {
    expect(worstGame({ recall: { right: 0, wrong: 1 }, type: { right: 1, wrong: 3 } }, games)).toBe('type');
  });

  it('is none when no game is missed', () => {
    expect(worstGame({ recall: { right: 2, wrong: 1 } }, games)).toBeUndefined();
  });

  it('skips a game left out', () => {
    expect(worstGame({ type: { right: 0, wrong: 2 } }, ['recall'])).toBeUndefined();
  });
});

describe('worstScore', () => {
  it('is the score with the most misses over right answers among the games', () => {
    expect(worstScore({ recall: { right: 3, wrong: 0 }, type: { right: 1, wrong: 1 } }, ['recall', 'type'])).toEqual({ right: 1, wrong: 1 });
  });

  it('is none for a card never answered', () => {
    expect(worstScore(undefined, ['recall'])).toBeUndefined();
  });
});
