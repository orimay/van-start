import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));

const word = (b: string) => b.replace(/^(de|het) /, '');
const affixes = (shape: RegExp) => deck.map(c => c.b).filter(b => shape.test(b)).map(b => b.replace('-', ''));
const PREFIXES = affixes(/^[a-z]+-$/);
const SUFFIXES = affixes(/^-[a-z]+$/);
const WORDS = new Set(deck.map(c => word(c.b)));
/** Deck words a stem can be a form of: itself, its infinitive, its spelling with the vowel or consonant doubling undone (langzam → langzaam, dunn → dun). */
const basesOf = (stem: string) => [
  stem, `${stem}en`, `${stem}n`, `${stem}e`, stem.replace(/(.)\1$/, '$1'), `${stem.replace(/(.)\1$/, '$1')}en`,
  stem.replace(/([^aeiou])([aeou])([^aeiou])$/, '$1$2$2$3'), `${stem.replace(/([^aeiou])([aeou])([^aeiou])$/, '$1$2$2$3')}en`,
].filter(base => base.length > 2 && WORDS.has(base));
/** A word that is a deck affix plus another deck word. */
const looksAffixed = (w: string) =>
  PREFIXES.some(p => w.startsWith(p) && basesOf(w.slice(p.length)).length > 0) || SUFFIXES.some(s => w.endsWith(s) && basesOf(w.slice(0, -s.length)).length > 0);
// Words that only look affixed: the rest is a deck word by chance (de kamer is no kam + -er, het water no wat + -er)
const NOT_SPLIT = [
  'achter', 'geen', 'over', 'meer', 'haar', 'de heer', 'de kamer', 'het water', 'bijten', 'per', 'de broer', 'het gezin', 'het paar',
  'lekker', 'open', 'de lente', 'het tennis', 'het dier', 'het haar', 'de eer', 'het leger', 'de boer', 'de haring', 'de boter',
  'de paling', 'de meter', 'de veter', 'de peer', 'de latte', 'de halte', 'het gevaar', 'de hoes', 'de beker', 'beide', 'de kier',
  'de wekker', 'de kies', 'de navel', 'de penis', 'het been', 'de lever', 'misselijk', 'het zeer', 'mager', 'de nagel', 'de schaar',
  'de meester', 'de inversie', 'de optie', 'het weekend',
  // A marked affix only by look (geen, de koning), or a fossil one (bellen, plotseling, geloven)
  'het beeld', 'geven', 'gelden', 'de koning', 'best', 'bellen', 'weinig', 'de bezem', 'het bed', 'de herfst', 'de bek', 'geel', 'gek',
  'de beurt', 'het ding', 'lelijk', 'vers', 'beige', 'de ring', 'de beschuit', 'de honing', 'ver', 'de verf', 'de ketting', 'de bes',
  'zalig', 'de camping', 'veilig', 'de benzine', 'de geit', 'de hersenen', 'de catering', 'de geest', 'de bende', 'stevig', 'de versie',
  'bezig', 'plotseling', 'ig', 'lijk', 'twaalfhonderdvijftig', 'geloven', 'gebruiken', 'gebeuren', 'genieten', 'genezen', 'genoeg',
  'gezond', 'gewoon', 'beneden', 'het geslacht', 'de genoot', 'de beek', 'het beest', 'de gemeente', 'nauwelijks',
  // Made from a word the deck lacks or holds in another sense: slaan, not slagen; rechten (prepare); old voor + raad
  'de bijslag', 'de toeslag', 'de uitslag', 'de slager', 'het aanrecht', 'de voorraad',
  // A frozen form, named as related instead: rechter (right-hand) beside recht, eerste beside eerst
  'rechter', 'eerste',
];
// Affixes that mark a word even when the rest has no card (geloven, de schoonheid): the word names its root anyway.
const MARKED = /^(ge|be|ver|ont|her)|(ing|heid|lijks?|ig|baar|loos|schap|nis|ling|achtig)$/;
const candidates = deck.filter(c => !/[ -]/.test(word(c.b)) && (MARKED.test(word(c.b)) || looksAffixed(word(c.b))));

const HEAD = /^(pl\. )?(?:[mfn]|pl)\.(?:\/?(?:[mfn]|pl)\.)* /;
/** An item naming what the word is made of: `от: …`, `мн. ч. от: …`, or a bare `a + b` other than a usage rule (`2) een/geen + het-слово`). */
const ORIGIN: Record<string, RegExp> = {
  ru: /^([^:]{0,40} )?от: /,
  en: /^(from|[^:]{0,40} of): /,
  es: /^[^:]{0,40} de: /,
  pt: /^[^:]{0,40} de: /,
  tr: /^([^:]{0,40} )?(kökü|çoğulu|biçimi|küçültme|derecesi|sayısı): /,
  ro: /^[^:]{0,40}(de la|lui): /,
};
const noteIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.n ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[3] ?? '';
};
const names = (note: string, origin: RegExp) =>
  note.split('\n').flatMap(line => line.replace(/^!/, '').split('; ')).some(item => origin.test(item.replace(HEAD, '')) || (item.includes(' + ') && !/^\d\) |een\/geen \+/.test(item)));

describe('an affixed word', () => {
  it.each(Object.keys(ORIGIN))('names its parts in %s', (lang) => {
    const note = noteIn(lang);
    const unsplit = candidates.filter(c => !NOT_SPLIT.includes(c.b) && !names(note(c), ORIGIN[lang]!)).map(c => c.b);
    expect(unsplit).toEqual([]);
  });

  it('is reviewed as not split only while it looks affixed and names no parts', () => {
    const stale = NOT_SPLIT.filter(b => !candidates.some(c => c.b === b && !names(c.n ?? '', ORIGIN.ru!)));
    expect(stale).toEqual([]);
  });
});
