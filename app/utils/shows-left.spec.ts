import { describe, expect, it } from 'vitest';
import { showsLeft } from './shows-left';

const LADDER = [2, 4];
const plain = (step: number, rung: number) => LADDER[rung]!;
const count = (items: Parameters<typeof showsLeft>[0], step = 0) => showsLeft(items, { step, ladder: LADDER, gapAt: plain });

describe('shows left', () => {
  it('are one per new card', () => {
    expect(count([{ size: 1 }, { size: 1 }, { size: 1 }])).toBe(3);
  });

  it('count every card of a match', () => {
    expect(count([{ size: 3 }])).toBe(3);
  });

  it('leave out a miss with nothing new left to space it', () => {
    expect(count([{ size: 1 }, { size: 1, rung: 0, missedAt: 1, spacing: 2 }], 1)).toBe(1);
  });

  it('count the climbs of a miss that new cards space', () => {
    // new, new, the miss, new; then it would only wait, so it is carried.
    expect(count([{ size: 1 }, { size: 1, rung: 0, missedAt: 1, spacing: 2 }, { size: 1 }, { size: 1 }], 1)).toBe(4);
  });

  it('start with the card on screen', () => {
    expect(count([{ size: 1, rung: 0, missedAt: 0, spacing: 2 }, { size: 1 }, { size: 1 }], 2)).toBe(3);
  });

  it('count a card put off, which comes back even with nothing to space it', () => {
    expect(count([{ size: 1 }, { size: 1, missedAt: 1, spacing: 2 }], 1)).toBe(2);
  });

  it('drop by one with each right answer', () => {
    const before = count([{ size: 1 }, { size: 1, rung: 1, missedAt: 0, spacing: 4 }], 3);
    const after = count([{ size: 1, rung: 1, missedAt: 0, spacing: 4 }], 4);
    expect(after).toBe(before - 1);
  });
});
