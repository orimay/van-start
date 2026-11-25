import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckCard, type DeckNode } from './deck';
import { formsOf } from './verb-forms';

const cards: DeckCard[] = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const ORIGIN = /(?:^|; |\n!?)(?:уменьш\. )?от: /;
// No card for their parts yet: beetje is only ever een beetje; boarding is English; zich and the verbs wait for their own cards.
const NO_PART_CARD = new Set(['een beetje', 'de boarding time']);
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

const LANGS = ['en', 'es', 'pt', 'tr', 'ro'] as const;
const rowsOf = (lang: string): Record<string, string[]> => JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
const SPLIT: Record<string, RegExp> = {
  ru: /^(?:[^:]{0,60} )?от: (.+)$/,
  en: /^(?:[^:]{0,60} )?(?:from|of): (.+)$/,
  es: /^[^:]{0,60} de: (.+)$/,
  pt: /^[^:]{0,60} de: (.+)$/,
  tr: /^(?:[^:]{0,60} )?(?:kökü|biçimi): (.+)$/,
  ro: /^[^:]{0,60}(?:de la|lui): (.+)$/,
};
const SKIP = new Set(['de', 'het', 'een', "'s", 'ik', 'jij', 'je', 'u', 'hij', 'zij', 'ze', 'wij', 'we', 'jullie', 'me', 'zich', 'ons']);
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; '));
const unglossed = (part: string) => part.replace(/ \((?:[^()]|\([^()]*\))*\)/g, '').trim().toLowerCase();
/** The Dutch words a note splits the card into, `от: a (…) + b (…) = c (…)`. */
const partsIn = (note: string, split: RegExp) =>
  itemsOf(note).flatMap(item => split.exec(item)?.[1]?.split(/ \+ | = /).map(unglossed) ?? []);
/** Words a note explains on their own, `verenigd — «объединённые»`. */
const glossedIn = (note: string) => itemsOf(note).filter(item => / [—=] /.test(item) && !item.includes(': ')).flatMap(item => item.split(/ [—=] /)[0]!.toLowerCase().split(' '));
const lemmasOf = (w: string) => {
  const stem = w.slice(0, -1);
  return [w, ...(w.endsWith('e') ? [stem, stem.replace(/([^aeiou])\1$/, '$1'), stem.replace(/^(.*[^aeiou])([aeou])([^aeiou])$/, '$1$2$2$3')] : []),
    ...(w.endsWith('en') ? [w.slice(0, -2)] : []), ...(w.endsWith('s') ? [stem] : [])];
};
const wordsOf = (b: string) => b.toLowerCase().replace(/[?!.,]/g, '').split(' ').map(w => w.replace(/^-|-$/g, '')).filter(w => !SKIP.has(w) && /\p{L}/u.test(w) && !/^\d/.test(w));
const multiWord = cards.filter(c => c.k !== 'sentence' && wordsOf(c.b).length > 1 && partsIn(c.n ?? '', SPLIT.ru!).length && !/мн\. ч\. от: /.test(c.n ?? ''));

/** The words of the card its note does not account for: not named, not a form of a named verb, not glossed, not a compound of those. */
const unnamedIn = (c: DeckCard) => {
  const parts = partsIn(c.n ?? '', SPLIT.ru!);
  const known = new Set([...parts, ...parts.flatMap(p => p.split(' ')), ...glossedIn(c.n ?? '')].map(w => w.replace(/^-|-$/g, '').replace(/^(de|het) /, '')));
  for (const p of parts) for (const form of formsOf(p).keys()) for (const w of form.split(' ')) known.add(w);
  const isKnown = (w: string) => lemmasOf(w).some(l => known.has(l));
  const isCompound = (w: string) => [...w].some((_, i) => i > 1 && i < w.length - 1 && isKnown(w.slice(0, i)) && isKnown(w.slice(i)));
  return wordsOf(c.b).filter(w => !isKnown(w) && !isCompound(w));
};

describe('a multi-word card', () => {
  it('names every word it is made of', () => {
    expect(multiWord.map(c => ({ card: c.b, unnamed: unnamedIn(c) })).filter(r => r.unnamed.length)).toEqual([]);
  });

  it.each(LANGS)('names the same parts in %s', (lang) => {
    const rows = rowsOf(lang);
    const differ = multiWord.filter(c => partsIn(rows[c.id]?.[3] ?? '', SPLIT[lang]!).join(' + ') !== partsIn(c.n ?? '', SPLIT.ru!).join(' + '));
    expect(differ.map(c => [c.b, partsIn(c.n ?? '', SPLIT.ru!), partsIn(rows[c.id]?.[3] ?? '', SPLIT[lang]!)])).toEqual([]);
  });
});
