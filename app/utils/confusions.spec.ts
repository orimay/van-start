import { describe, expect, it } from 'vitest';
import { groupsOf, linked, unlinked, withConfusions } from './confusions';

const cards = (...ids: string[]) => ids.map(id => ({ id }));
const idsOf = (list: { id: string }[]) => list.map(c => c.id);
/** Links given as pairs, each pair both ways. */
const links = (...pairs: Array<[string, string]>) => pairs.reduce((all, [a, b]) => linked(all, a, b), {} as Record<string, string[]>);

describe('confusion links', () => {
  it('go both ways', () => {
    expect(links(['a', 'b'])).toEqual({ a: ['b'], b: ['a'] });
  });

  it('are never doubled', () => {
    expect(links(['a', 'b'], ['b', 'a'])).toEqual({ a: ['b'], b: ['a'] });
  });

  it('move a pair linked again to the end, so the newest comes last', () => {
    expect(links(['a', 'b'], ['a', 'c'], ['b', 'a'])).toEqual({ a: ['c', 'b'], b: ['a'], c: ['a'] });
  });

  it('never link a card to itself', () => {
    expect(links(['a', 'a'])).toEqual({});
  });

  it('come off both ends', () => {
    expect(unlinked(links(['a', 'b'], ['a', 'c']), 'b', 'a')).toEqual({ a: ['c'], c: ['a'] });
  });
});

describe('confusion groups', () => {
  it('chain through shared cards', () => {
    expect(groupsOf(links(['a', 'b'], ['c', 'b'], ['x', 'y']))).toEqual([['a', 'b', 'c'], ['x', 'y']]);
  });
});

describe('a deck with confusions', () => {
  const deck = (base: string[], others: string[], pairs: Array<[string, string]>, size = 10) =>
    idsOf(withConfusions(cards(...base), cards(...base, ...others), links(...pairs), size));

  it('stays as it was without links', () => {
    expect(deck(['a', 'b'], ['x'], [])).toEqual(['a', 'b']);
  });

  it('takes in the whole group of a card, right after it', () => {
    expect(deck(['a', 's'], ['b', 'c'], [['a', 'b'], ['b', 'c']])).toEqual(['a', 'b', 'c', 's']);
  });

  it('takes in only cards it may hold', () => {
    expect(deck(['a'], [], [['a', 'b']])).toEqual(['a']);
  });

  it('keeps a group whole by leaving out the last unlinked cards', () => {
    expect(deck(['s1', 's2', 'a'], ['b'], [['a', 'b']], 3)).toEqual(['s1', 'a', 'b']);
  });

  it('takes part of a group too big for it, its own cards first', () => {
    expect(deck(['s', 'c'], ['a', 'b', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']], 2)).toEqual(['c', 'a']);
  });

  it('leaves out the smallest groups until the rest fit', () => {
    expect(deck(['a', 'c'], ['b', 'd', 'e'], [['a', 'b'], ['c', 'd'], ['d', 'e']], 3)).toEqual(['c', 'd', 'e']);
  });

  it('fills what the groups leave with unlinked cards', () => {
    expect(deck(['s1', 'a', 'c', 's2'], ['b', 'd'], [['a', 'b'], ['c', 'd']], 3)).toEqual(['s1', 'a', 'b']);
  });
});
