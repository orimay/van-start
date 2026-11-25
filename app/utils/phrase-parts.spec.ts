import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckCard, type DeckNode } from './deck';

const cards: DeckCard[] = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const ORIGIN = /(?:^|; |\n!?)(?:уменьш\. )?от: /;
// No card for their parts yet: beetje is only ever een beetje; boarding is English; zich and the verbs wait for their own cards.
const NO_PART_CARD = new Set(['een beetje', 'de boarding time', 'zich aankleden', 'zich herinneren', 'ervoor zorgen']);
/** A phrase: several words, not a sentence, not a name, not a form of another card. */
const isPhrase = (c: DeckCard) =>
  !c.k && c.b.replace(/^(de|het) /, '').includes(' ') && !/[?!.]$/.test(c.b) && !/^[A-Z]/.test(c.b)
  && !/^(ik|jij|je|hij|zij|ze|u|we|wij|jullie|het) /.test(c.b) && !/^(мн\. ч\.|форма|просьба)/.test(c.n ?? '') && c.b !== 'om ... te';

describe('a phrase card', () => {
  it('names the cards it is made of', () => {
    expect(cards.filter(c => isPhrase(c) && !NO_PART_CARD.has(c.b) && !ORIGIN.test(c.n ?? '')).map(c => c.b)).toEqual([]);
  });

  it('is exempt only while it has no part card', () => {
    expect([...NO_PART_CARD].filter(b => ORIGIN.test(cards.find(c => c.b === b)?.n ?? ''))).toEqual([]);
  });
});
