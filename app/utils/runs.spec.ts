import { describe, expect, it } from 'vitest';
import { diff, patch } from './runs';

const roundTrip = (from: string[], base: string[]) => patch(diff(from, base, String), base);

describe('runs', () => {
  it('restore a list from its base', () => {
    for (const [from, base] of [
      [['a', 'b', 'c'], ['a', 'b', 'c']],
      [['x', 'a', 'b', 'c'], ['a', 'b', 'c']],
      [['a', 'b', 'c', 'd'], ['c', 'a', 'b', 'd']],
      [['a', 'b'], []],
      [[], ['a']],
      [['a', 'a', 'b'], ['a', 'b']],
    ]) expect(roundTrip(from!, base!)).toEqual(from);
  });

  it('take the base itself as one run', () => {
    expect(diff(['a', 'b', 'c'], ['a', 'b', 'c'], String)).toEqual([[0, 3]]);
  });

  it('keep items missing from the base as they are', () => {
    expect(diff(['x', 'a', 'b'], ['a', 'b'], String)).toEqual(['x', [0, 2]]);
  });

  it('stay small when one item moves in a long list', () => {
    const base = Array.from({ length: 200 }, (_, i) => `c${i}`);
    const from = ['c150', ...base.filter(c => c !== 'c150')];
    expect(diff(from, base, String).length).toBeLessThanOrEqual(3);
  });
});
