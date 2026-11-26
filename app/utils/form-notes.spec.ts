import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; f: string; b: string; n?: string; nb?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; '));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `zelfstandige — самозанятый` on zelfstandig read as if the -e changed the meaning; the noun is its own card. */
function glossedForms(note: (c: Card) => string | undefined): string[] {
  return cardsOf(deck).flatMap(c => {
    const form = new RegExp(`^((de|het) )?${escape(c.b)}e [—-] `, 'i');
    return itemsOf(note(c) ?? '').filter(item => form.test(item)).map(item => `${c.b}: ${item}`);
  });
}

describe("a card's -e form", () => {
  it('is never glossed in its note as another word in Russian', () => {
    expect(glossedForms(c => c.n)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`is never glossed in its note as another word in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(glossedForms(c => rows[c.id]?.[3])).toEqual([]);
    });
  }
});

/** The word an -e card is the form of: the adjective its `!een … noun` example puts after the article. */
function pairsOf(): Array<{ card: Card; base: string }> {
  const sides = new Set(cardsOf(deck).map(c => c.b));
  return cardsOf(deck).flatMap(card => {
    if (!card.n?.includes('сразу за ним сущ.')) return [];
    const base = card.nb?.split('\n').find(l => l.startsWith('!'))?.split(' ')[1];
    return base && sides.has(base) ? [{ card, base }] : [];
  });
}

interface Texted extends Card { xb?: string }
const usedWords = new Set(cardsOf(deck).flatMap(c => [c.b, (c as Texted).xb, c.nb].join(' ').toLowerCase().split(/[^a-z\u00e0-\u00ff'-]+/)));
// Their -e form is only a noun, a verb or part of a fixed term here: de jarige, de oudere, hij gebruikte, het gemiddelde, de tegenwoordige tijd.
// een: de ene is a pronoun, its own card.
const NOT_ADJECTIVE_HERE = new Set(['een', 'jarig', 'ouder', 'gebruikt', 'gemiddeld', 'tegenwoordig']);

/** Spellings an -e form may take: groot → grote, wit → witte, lief → lieve, vies → vieze. */
function eFormsOf(base: string): string[] {
  const long = base.match(/^(.*?)([aeou])\2([^aeiou])$/);
  return [
    `${base}e`,
    ...(long ? [`${long[1]}${long[2]}${long[3]}e`] : []),
    ...(/[^aeiou][aeiou][bdfgklmnprst]$/.test(base) ? [`${base}${base.at(-1)}e`] : []),
    ...(base.endsWith('f') ? [`${base.slice(0, -1)}ve`] : []),
    ...(base.endsWith('s') ? [`${base.slice(0, -1)}ze`] : []),
  ];
}

describe('an adjective', () => {
  it('has its -e pair card once its base note or the deck shows the -e form', () => {
    const sides = new Set(cardsOf(deck).map(c => c.b));
    const paired = new Set(pairsOf().map(p => p.base));
    const unpaired = cardsOf(deck).filter(c => !paired.has(c.b) && !eFormsOf(c.b).some(f => sides.has(f)) && !NOT_ADJECTIVE_HERE.has(c.b)
      && (c.n?.startsWith('1) за ним нет сущ.') || /^[a-z]{3,}$/.test(c.b) && eFormsOf(c.b).some(f => usedWords.has(f))));
    expect(unpaired.map(c => c.b)).toEqual([]);
  });

  it('has its -e pair card once its translation gives an adjective sense', () => {
    const sides = new Set(cardsOf(deck).map(c => c.b));
    const paired = new Set(pairsOf().map(p => p.base));
    const unpaired = cardsOf(deck).filter(c => /^[a-zé]{3,}$/.test(c.b) && !/e$|en$/.test(c.b) && !/форма|степень/.test(c.n ?? '')
      && sensesOf(c.f).some(sense => /^[а-яё]+(ый|ий|ой)$/.test(sense))
      && !paired.has(c.b) && !eFormsOf(c.b).some(f => sides.has(f)) && !NOT_ADJECTIVE_HERE.has(c.b) && !NO_E_FORM.has(c.b));
    expect(unpaired.map(c => c.b)).toEqual([]);
  });
});

/** A translation's senses without their hints: `готовый (закончивший)` is `готовый`. */
const sensesOf = (front: string) => front.replace(/\s*\([^)]*\)/g, '').split(/; |, /).map(s => s.trim());
// Never inflected (prima, privé), only after a verb (klaar, gereed, kwijt, bezig), a determiner (mijn, ieder) or a noun here (schat).
const NO_E_FORM = new Set(['mijn', 'ieder', 'prima', 'extra', 'plastic', 'tweedehands', 'allerlei', 'privé', 'rechter',
  'klaar', 'gereed', 'kwijt', 'waard', 'bereid', 'bezig', 'voorbij', 'eens', 'schat', 'werkzaam']);

describe('an -e card', () => {
  it('has its base card, named by its `!een … noun` example', () => {
    const paired = new Set(pairsOf().map(p => p.card));
    expect(cardsOf(deck).filter(c => c.n?.includes('сразу за ним сущ.') && !paired.has(c)).map(c => c.b)).toEqual([]);
  });
});

const FORM_OF: Record<string, string> = { en: 'form of', es: 'forma de', pt: 'forma de', tr: 'biçimi', ro: 'forma lui' };
const FROM: Record<string, string> = { en: 'from', es: 'deriva de', pt: 'deriva de', tr: 'kökü', ro: 'de la' };

describe('an -e pair card', () => {
  it('names its base as the word it is a form of in Russian', () => {
    expect(pairsOf().filter(({ card, base }) => !itemsOf(card.n ?? '').some(i => i.startsWith(`форма от: ${base} (`))).map(p => p.card.b)).toEqual([]);
  });
  for (const [lang, label] of Object.entries(FORM_OF)) {
    it(`names its base as the word it is a form of in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(pairsOf().filter(({ card, base }) => !itemsOf(rows[card.id]?.[3] ?? '').some(i => i.startsWith(`${label}: ${base} (`))).map(p => p.card.b)).toEqual([]);
    });
  }
  // Its derivation sits on the base alone, so the chain reads volgen → volgend → volgende.
  it('leaves what its base is made from to the base in Russian', () => {
    expect(pairsOf().filter(({ card }) => itemsOf(card.n ?? '').some(i => i.startsWith('от: '))).map(p => p.card.b)).toEqual([]);
  });
  for (const [lang, label] of Object.entries(FROM)) {
    it(`leaves what its base is made from to the base in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(pairsOf().filter(({ card }) => itemsOf(rows[card.id]?.[3] ?? '').some(i => i.startsWith(`${label}: `))).map(p => p.card.b)).toEqual([]);
    });
  }
});
