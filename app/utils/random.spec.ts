import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { shuffle } from './shuffle';

const draw = (seed: string) => Array.from({ length: 5 }, seeded(seed));

describe('seeded random', () => {
  it('repeats itself for the same seed', () => {
    expect(draw('lesson')).toEqual(draw('lesson'));
  });

  it('differs for another seed', () => {
    expect(draw('lesson')).not.toEqual(draw('lesson2'));
  });

  it('stays within [0, 1)', () => {
    expect(Array.from({ length: 1000 }, seeded('x')).every(n => n >= 0 && n < 1)).toBe(true);
  });
});

describe('shuffle', () => {
  it('repeats an order for the same seed', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(items, seeded('a'))).toEqual(shuffle(items, seeded('a')));
    expect(shuffle(items, seeded('a'))).not.toEqual(shuffle(items, seeded('b')));
  });
});
