import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SERVED = ['public/deck.json', ...readdirSync('public/lang').map(f => `public/lang/${f}`)];
/** What a leak scanner takes for a card number: 12 or more digits, spaces or dashes allowed between them. */
const CARD_NUMBER = /\d(?:[ -]?\d){11,}/g;

describe.each(SERVED)('%s', (file) => {
  it('holds no run of digits a leak scanner reads as a card number', () => {
    expect(readFileSync(file, 'utf8').match(CARD_NUMBER) ?? []).toEqual([]);
  });
});
