import { describe, expect, it } from 'vitest';
import { readLexilize } from './lexilize';
import { card, deck, lxb, sub } from './lexilize.fixtures';

const DAY = 86_400_000;

describe('readLexilize', () => {
  it('reads state, due date and first study date by card uuid', () => {
    const file = lxb(deck(card('u1', { state: 3, due: 10 * DAY, since: 2 * DAY })));
    expect(readLexilize(file).get('u1')).toEqual({ state: 3, due: 10 * DAY, since: 2 * DAY });
  });

  it('finds cards inside subcategories', () => {
    const file = lxb(deck(sub(card('u1', { state: 2, due: 1, since: 0 }))));
    expect(readLexilize(file).has('u1')).toBe(true);
  });

  it('keeps the most advanced copy of a card found in several decks', () => {
    const file = lxb(deck(card('u1', { state: 2, due: 5, since: 0 })), deck(card('u1', { state: 3, due: 1, since: 0 })), deck(card('u1', { state: 3, due: 9, since: 0 })));
    expect(readLexilize(file).get('u1')).toMatchObject({ state: 3, due: 9 });
  });

  it('rejects a file that is not protobuf', () => {
    expect(() => readLexilize(new Uint8Array([0x0f, 0x00]).buffer)).toThrow(/Not a Lexilize file/);
  });
});
