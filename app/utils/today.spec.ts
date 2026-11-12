import { describe, expect, it } from 'vitest';
import { dayProgress, markReviewed, reviewedOn } from './today';

const MORNING = new Date(2026, 10, 16, 8);
const EVENING = new Date(2026, 10, 16, 22);
const NEXT_DAY = new Date(2026, 10, 17, 8);

describe('markReviewed', () => {
  it('adds a card to the day it was reviewed on', () => {
    const log = markReviewed(markReviewed(undefined, 'a', MORNING), 'b', EVENING);
    expect(reviewedOn(log, EVENING)).toEqual(['a', 'b']);
  });

  it('counts a card once a day', () => {
    expect(reviewedOn(markReviewed(markReviewed(undefined, 'a', MORNING), 'a', EVENING), EVENING)).toEqual(['a']);
  });

  it('starts over on a new day', () => {
    expect(reviewedOn(markReviewed(markReviewed(undefined, 'a', MORNING), 'b', NEXT_DAY), NEXT_DAY)).toEqual(['b']);
  });
});

describe('reviewedOn', () => {
  it('is empty for a day without reviews', () => {
    expect(reviewedOn(markReviewed(undefined, 'a', MORNING), NEXT_DAY)).toEqual([]);
  });
});

describe('dayProgress', () => {
  it('measures the reviewed cards against all the day would have had due', () => {
    expect(dayProgress(['a', 'b'], ['c', 'd', 'e'])).toEqual({ done: 2, total: 5 });
  });

  it('counts a reviewed card due again as not done', () => {
    expect(dayProgress(['a', 'b'], ['b', 'c'])).toEqual({ done: 1, total: 3 });
  });
});
