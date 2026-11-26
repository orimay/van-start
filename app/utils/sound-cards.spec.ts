import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckNode } from './deck';

const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);

describe('the deck', () => {
  // ru fronts say «ү (как в «автобус»)»; the flag carries that to every language.
  it('flags a card as a sound exactly when its front names a sound', () => {
    const sounds = cards.filter(card => /\(как в «/.test(card.f)).map(card => card.b);
    expect(sounds.length).toBeGreaterThan(20);
    expect(cards.filter(card => card.k === 'sound').map(card => card.b)).toEqual(sounds);
  });
});
