import { describe, expect, it } from 'vitest';
import { showsLeft } from './shows-left';

const LADDER = [2, 4];
const plain = (step: number, rung: number) => LADDER[rung]!;
const count = (items: Parameters<typeof showsLeft>[0], fillers = 10, step = 0) => showsLeft(items, { step, ladder: LADDER, fillers, gapAt: plain });

describe('shows left', () => {
  it('are one per new card', () => {
    expect(count([{ size: 1 }, { size: 1 }, { size: 1 }])).toBe(3);
  });

  it('count every card of a match', () => {
    expect(count([{ size: 3 }])).toBe(3);
  });

  it('count the fillers a lone miss waits through on each rung', () => {
    // 2 fillers (the first on screen), the miss, 4 fillers, the miss again.
    expect(count([{ size: 1 }, { size: 1, rung: 0, missedAt: 1, spacing: 2 }], 10, 1)).toBe(8);
  });

  it('let new cards fill a miss wait before any filler', () => {
    // new, new, the miss, new, 3 fillers, the miss again.
    expect(count([{ size: 1 }, { size: 1, rung: 0, missedAt: 1, spacing: 2 }, { size: 1 }, { size: 1 }], 10, 1)).toBe(8);
  });

  it('start with the card on screen', () => {
    // The miss is due and shown now, then waits 4 behind the two new cards and 2 fillers.
    expect(count([{ size: 1, rung: 0, missedAt: 0, spacing: 2 }, { size: 1 }, { size: 1 }], 10, 2)).toBe(6);
  });

  it('end with a lone miss on screen when nothing could fill its wait', () => {
    expect(count([{ size: 1, rung: 0, missedAt: 0, spacing: 2 }], 0, 1)).toBe(1);
  });

  it('count a card answered for the last time as a filler from then on', () => {
    // new, the miss, the new card filling in, the miss again.
    expect(count([{ size: 1 }, { size: 1, rung: 0, missedAt: 1, spacing: 2 }], 0, 1)).toBe(4);
  });

  it('drop by one with each right answer', () => {
    const before = count([{ size: 1 }, { size: 1, rung: 1, missedAt: 0, spacing: 4 }], 10, 3);
    // The new card answered right: the miss is now first and still waits.
    const after = count([{ size: 1, rung: 1, missedAt: 0, spacing: 4 }], 10, 4);
    expect(after).toBe(before - 1);
  });
});
