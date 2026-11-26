import { describe, expect, it } from 'vitest';
import { ladder } from './scheduler';

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
