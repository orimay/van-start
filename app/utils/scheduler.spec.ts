import { describe, expect, it } from 'vitest';
import { answer, ladder, next, poolSize, startSession, type Answer, type Session } from './scheduler';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);

describe('ladder', () => {
  it('climbs by four up to the session size for a small session', () => {
    expect(ladder(10)).toEqual([4, 8, 10]);
  });

  it('keeps at least four rungs, ending at the session size', () => {
    expect(ladder(20)).toEqual([4, 7, 12, 20]);
    expect(ladder(100)).toEqual([4, 12, 34, 100]);
  });

  it('multiplies by four when the size allows', () => {
    expect(ladder(256)).toEqual([4, 16, 64, 256]);
    expect(ladder(1024)).toEqual([4, 16, 64, 256, 1024]);
  });

  it('is a single rung of four for a tiny session', () => {
    expect(ladder(3)).toEqual([4]);
  });
});

describe('a session', () => {
  it('shows new cards in queue order', () => {
    let s = startSession(ids(10), 'seed');
    const shown: string[] = [];
    for (let i = 0; i < 3; i++) {
      const pick = next(s)!;
      shown.push(pick.id);
      s = answer(s, pick.id, 'plus');
    }
    expect(shown).toEqual(['c0', 'c1', 'c2']);
  });

  it('closes a new card answered right at once', () => {
    const s = playAll(startSession(ids(3), 'seed'), () => 'plus');
    expect(s.shows).toEqual(['c0', 'c1', 'c2']);
  });

  it('ends when every card is closed', () => {
    const s = playAll(startSession(ids(5), 'seed'), () => 'plus');
    expect(next(s.session)).toBeNull();
  });

  it('brings a miss back after four cards', () => {
    const s = playAll(startSession(ids(10), 'seed'), (id, n) => (id === 'c0' && n === 0 ? 'minus' : 'plus'));
    expect(gapsOf(s.shows, 'c0')[0]).toBe(5);
  });

  it('widens the gap with each right answer along the ladder', () => {
    const s = playAll(startSession(ids(40), 'seed'), (id, n) => (id === 'c0' && n === 0 ? 'minus' : 'plus'));
    const gaps = gapsOf(s.shows, 'c0');
    expect(gaps[0]).toBe(5);
    expect(gaps[1]).toBeGreaterThanOrEqual(ladder(40)[1]! + 1);
    expect(gaps[1]).toBeLessThanOrEqual(ladder(40)[1]! + 1 + Math.floor(ladder(40)[1]! / 4));
  });

  it('starts a miss over at the first rung', () => {
    const s = playAll(startSession(ids(40), 'seed'), (id, n) => (id === 'c0' && (n === 0 || n === 2) ? 'minus' : 'plus'));
    expect(gapsOf(s.shows, 'c0')[2]).toBe(5);
  });

  it('treats a guess as a miss', () => {
    const s = playAll(startSession(ids(10), 'seed'), (id, n) => (id === 'c0' && n === 0 ? 'guessed' : 'plus'));
    expect(gapsOf(s.shows, 'c0')[0]).toBe(5);
  });

  it('counts a guess neither as an error nor toward accuracy', () => {
    const start = startSession(ids(10), 'seed');
    const s = answer(start, next(start)!.id, 'guessed');
    expect(s.cards.get(next(start)!.id)!.errors).toBe(0);
    expect(s.window).toEqual(start.window);
  });

  it('keeps a slow right answer on its rung', () => {
    const s = playAll(
      startSession(ids(40), 'seed'),
      (id, n) => (id === 'c0' && n === 0 ? 'minus' : 'plus'),
      (id, n) => id === 'c0' && n === 1,
    );
    expect(gapsOf(s.shows, 'c0').slice(0, 2)).toEqual([5, 5]);
  });

  it('jitters a gap of eight or more by up to a quarter', () => {
    const seen = new Set<number>();
    for (let k = 0; k < 20; k++) {
      const s = playAll(startSession(ids(40), `seed${k}`), (id, n) => (id === 'c0' && n === 0 ? 'minus' : 'plus'));
      seen.add(gapsOf(s.shows, 'c0')[1]!);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('is the same for the same seed', () => {
    const play = () => playAll(startSession(ids(30), 'same'), (id, n) => (n === 0 && id < 'c2' ? 'minus' : 'plus')).shows;
    expect(play()).toEqual(play());
  });
});

describe('postponing', () => {
  it('moves the card a rung further each time, not counting as a miss', () => {
    const s = playAll(startSession(ids(40), 'seed'), (id, n) => (id === 'c0' && n < 2 ? 'postpone' : 'plus'));
    const gaps = gapsOf(s.shows, 'c0');
    expect(gaps[0]).toBe(5);
    expect(gaps[1]).toBeGreaterThan(5);
    expect(s.session.cards.get('c0')!.errors).toBe(0);
  });
});

describe('the pool', () => {
  it('starts at four', () => {
    expect(poolSize(startSession(ids(10), 'seed'))).toBe(4);
  });

  it('grows when answers are mostly right', () => {
    let s = startSession(ids(60), 'seed');
    for (let i = 0; i < 10; i++) s = answer(s, next(s)!.id, 'plus');
    expect(poolSize(s)).toBe(5);
  });

  it('shrinks when too many answers are wrong, down to two', () => {
    let s = startSession(ids(60), 'seed');
    for (let i = 0; i < 60; i++) s = answer(s, next(s)!.id, 'minus');
    expect(poolSize(s)).toBe(2);
  });

  it('stops taking new cards while the ladder holds the pool', () => {
    let s = startSession(ids(20), 'seed');
    const shown: string[] = [];
    for (let i = 0; i < 6; i++) {
      const pick = next(s)!;
      shown.push(pick.id);
      s = answer(s, pick.id, 'minus');
    }
    expect(new Set(shown).size).toBe(4);
  });
});

describe('fillers', () => {
  it('fill a wait with a closed card that gave trouble', () => {
    let s = startSession(ids(12), 'seed');
    const log = playAll(s, (id, n) => (id === 'c0' && n === 0 ? 'minus' : 'plus'), undefined, 200);
    s = log.session;
    expect(next(s)).toBeNull();
    expect(log.sources).toContain('filler');
  });

  it('are never a card shown in the last ten shows', () => {
    const log = playAll(startSession(ids(14), 'seed'), (id, n) => (n === 0 && ['c0', 'c1', 'c2', 'c3'].includes(id) ? 'minus' : 'plus'));
    log.shows.forEach((id, i) => {
      if (log.sources[i] !== 'filler') return;
      expect(log.shows.slice(Math.max(0, i - 10), i)).not.toContain(id);
    });
  });

  it('send a missed card back to the ladder', () => {
    const log = playAll(startSession(ids(14), 'seed'), (id, n) => {
      if (id === 'c0' && n === 0) return 'minus';
      return 'plus';
    });
    const fillerAt = log.sources.indexOf('filler');
    if (fillerAt < 0) return;
    const id = log.shows[fillerAt]!;
    let s = replay(startSession(ids(14), 'seed'), log, fillerAt);
    s = answer(s, id, 'minus');
    expect(s.cards.get(id)!.closed).toBe(false);
  });
});

// declarative helpers

interface Log {
  session: Session;
  shows: string[];
  sources: string[];
  answers: Answer[];
}

function playAll(start: Session, decide: (id: string, nth: number) => Answer, slow?: (id: string, nth: number) => boolean, limit = 500): Log {
  let session = start;
  const shows: string[] = [];
  const sources: string[] = [];
  const answers: Answer[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < limit; i++) {
    const pick = next(session);
    if (!pick) break;
    const nth = seen.get(pick.id) ?? 0;
    seen.set(pick.id, nth + 1);
    const a = decide(pick.id, nth);
    shows.push(pick.id);
    sources.push(pick.source);
    answers.push(a);
    session = answer(session, pick.id, a, { slow: slow?.(pick.id, nth) ?? false });
  }
  return { session, shows, sources, answers };
}

function replay(start: Session, log: Log, upTo: number): Session {
  let s = start;
  for (let i = 0; i < upTo; i++) s = answer(s, log.shows[i]!, log.answers[i]!);
  return s;
}

/** Shows between consecutive appearances of a card, counted as positions apart. */
function gapsOf(shows: string[], id: string): number[] {
  const at = shows.flatMap((s, i) => (s === id ? [i] : []));
  return at.slice(1).map((p, i) => p - at[i]!);
}
