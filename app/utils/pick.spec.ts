import { describe, expect, it } from 'vitest';
import { comeback, freshness, pickIndex, type PickState, weightedIndex } from './pick';

const item = (key: string, extra: { round?: number; missedAt?: number } = {}) => ({ key, ids: [key], ...extra });
const state = (overrides: Partial<PickState> = {}): PickState => ({ step: 10, shown: new Map(), mistakes: new Map(), ...overrides });

describe('freshness', () => {
  it('is zero for the item just shown', () => {
    expect(freshness(item('a'), state({ shown: new Map([['a', 9]]) }))).toBe(0);
  });

  it('grows with the time since the item was shown', () => {
    const s = state({ shown: new Map([['a', 7], ['b', 3]]) });
    expect(freshness(item('b'), s)).toBeGreaterThan(freshness(item('a'), s));
  });

  it('is highest for an item never shown', () => {
    const s = state({ shown: new Map([['a', 0]]) });
    expect(freshness(item('b'), s)).toBeGreaterThan(freshness(item('a'), s));
  });

  it('counts a card as shown when it was on screen with others', () => {
    const s = state({ shown: new Map([['a', 9], ['b', 9], ['c', 2]]) });
    expect(freshness(item('a'), s)).toBe(0);
    expect(freshness({ key: 'c', ids: ['c'] }, s)).toBeGreaterThan(0);
  });

  it('takes the latest showing of any card in a group', () => {
    const s = state({ shown: new Map([['a', 2], ['b', 9]]) });
    expect(freshness({ key: 'a,b', ids: ['a', 'b'] }, s)).toBe(0);
  });

  it('is proportional to one plus the mistakes', () => {
    const shown = new Map([['a', 5], ['b', 5]]);
    const s = state({ shown, mistakes: new Map([['b', 2]]) });
    expect(freshness(item('b'), s)).toBe(3 * freshness(item('a'), s));
  });

  it('is scaled by the odds of the card', () => {
    const s = state({ odds: new Map([['b', 2]]) });
    expect(freshness(item('b'), s)).toBe(2 * freshness(item('a'), s));
  });
});

describe('comeback', () => {
  it('is impossible before a gap', () => {
    expect(comeback(0, 9, 10)).toBe(0);
  });

  it('is certain from a gap on', () => {
    expect(comeback(0, 10, 10)).toBe(1);
    expect(comeback(0, 30, 10)).toBe(1);
  });
});

describe('weightedIndex', () => {
  it('never picks a zero weight', () => {
    expect(weightedIndex([0, 1, 0], () => 0)).toBe(1);
    expect(weightedIndex([1, 0], () => 0.9999)).toBe(0);
  });

  it('splits the roll by weight', () => {
    expect(weightedIndex([1, 3], () => 0.2)).toBe(0);
    expect(weightedIndex([1, 3], () => 0.3)).toBe(1);
  });

  it('is -1 when every weight is zero', () => {
    expect(weightedIndex([0, 0])).toBe(-1);
  });
});

describe('pickIndex', () => {
  it('never repeats the item just shown while another is left', () => {
    const items = [item('a'), item('b')];
    const s = state({ shown: new Map([['a', 9], ['b', 2]]), random: () => 0 });
    expect(pickIndex(items, s)).toBe(1);
  });

  it('repeats the item just shown when it is the only one', () => {
    expect(pickIndex([item('a')], state({ shown: new Map([['a', 9]]) }))).toBe(0);
  });

  it('keeps a later round for after the earlier one', () => {
    const items = [item('a', { round: 1 }), item('b')];
    expect(pickIndex(items, state({ random: () => 0 }))).toBe(1);
  });

  it('brings a miss back exactly at its gap', () => {
    const items = [item('a'), item('b', { missedAt: 0 })];
    expect(pickIndex(items, state({ step: 10, gap: 10, random: () => 0.999 }))).toBe(1);
  });

  it('holds a miss back before its gap, whatever its odds', () => {
    const items = [item('a'), item('b', { missedAt: 1 })];
    const s = state({ step: 10, gap: 10, shown: new Map([['a', 9], ['b', 1]]), mistakes: new Map([['b', 5]]), random: () => 0.999 });
    expect(pickIndex(items, s)).toBe(0);
  });

  it('falls back to the oldest miss when nothing else is eligible', () => {
    const items = [item('a', { missedAt: 9 }), item('b', { missedAt: 8 }), item('c', { round: 1 })];
    expect(pickIndex(items, state({ step: 10, gap: 10, random: () => 0.999 }))).toBe(1);
  });
});

describe('pickIndex in order', () => {
  it('takes the next item when none was missed', () => {
    const items = ['a', 'b', 'c'].map(k => item(k));
    expect([0.1, 0.5, 0.99].map(r => pickIndex(items, state({ ordered: true, random: () => r })))).toEqual([0, 0, 0]);
  });

  it('lets an item missed while learning come up early by its odds', () => {
    const items = ['a', 'b', 'c'].map(k => item(k));
    const odds = new Map([['c', 8]]);
    expect(pickIndex(items, state({ ordered: true, odds, random: () => 0.99 }))).toBe(2);
    expect(pickIndex(items, state({ ordered: true, odds, random: () => 0.01 }))).toBe(0);
  });
});
