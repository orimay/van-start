import { describe, expect, it } from 'vitest';
import { following, isShort, nextGroup } from './group';

const ids = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ id: `c${from + i}` }));

describe('next group', () => {
  it('takes the first unlearned cards up to the size', () => {
    expect(nextGroup(ids(7), {}, 5).map(c => c.id)).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
  });

  it('tops up a short last group with the most missed learned cards', () => {
    const cards = ids(6);
    const progress = { c0: { lapses: 0, difficulty: 3 }, c1: { lapses: 2, difficulty: 3 }, c2: { lapses: 1, difficulty: 3 }, c3: { lapses: 1, difficulty: 8 } };
    expect(nextGroup(cards, progress, 5).map(c => c.id)).toEqual(['c4', 'c5', 'c1', 'c3', 'c2']);
  });

  it('tops up with missed cards only to a multiple of five', () => {
    const progress = Object.fromEntries(ids(20, 10).map(c => [c.id, { lapses: 1, difficulty: 1 }]));
    expect(nextGroup([...ids(7), ...ids(20, 10)], progress, 1000)).toHaveLength(10);
  });

  it('stays short when there is nothing learned to top up with', () => {
    expect(nextGroup(ids(3), {}, 5)).toHaveLength(3);
  });

  describe('topped up from the next cards', () => {
    it('takes the unlearned cards that follow in deck order', () => {
      const after = ids(4, 10);
      expect(nextGroup(ids(3), { c10: { lapses: 0, difficulty: 1 } }, 5, after).map(c => c.id)).toEqual(['c0', 'c1', 'c2', 'c11', 'c12']);
    });

    it('take only enough to reach a multiple of five', () => {
      expect(nextGroup(ids(7), {}, 1000, ids(20, 10))).toHaveLength(10);
    });

    it('stays short when nothing follows', () => {
      expect(nextGroup(ids(3), {}, 5, [])).toHaveLength(3);
    });

    it('falls back to the most missed learned cards when nothing follows', () => {
      const cards = [...ids(3), ...ids(3, 10)];
      const progress = { c10: { lapses: 0, difficulty: 1 }, c11: { lapses: 3, difficulty: 1 }, c12: { lapses: 1, difficulty: 1 } };
      expect(nextGroup(cards, progress, 5, []).map(c => c.id)).toEqual(['c0', 'c1', 'c2', 'c11', 'c12']);
    });
  });

  describe('following cards', () => {
    it('are the deck cards after the last card of the section', () => {
      expect(following(ids(6), ids(2, 2)).map(c => c.id)).toEqual(['c4', 'c5']);
    });

    it('are none for an empty section', () => {
      expect(following(ids(3), [])).toEqual([]);
    });
  });

  describe('short', () => {
    it('holds when fewer unlearned cards are left than the size', () => {
      expect(isShort(ids(3), {}, 5)).toBe(true);
    });

    it('does not hold for a multiple of five', () => {
      expect(isShort(ids(10), {}, 1000)).toBe(false);
    });

    it('does not hold for a full group', () => {
      expect(isShort(ids(5), {}, 5)).toBe(false);
    });

    it('does not hold once every card is learned', () => {
      expect(isShort(ids(1), { c0: { lapses: 0, difficulty: 1 } }, 5)).toBe(false);
    });
  });

  it('is empty once every card is learned', () => {
    expect(nextGroup(ids(2), { c0: { lapses: 1, difficulty: 1 }, c1: { lapses: 1, difficulty: 1 } }, 5)).toEqual([]);
  });
});
