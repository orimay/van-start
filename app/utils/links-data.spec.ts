import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linkable, type DeckNode } from './deck';
import { buildIndex, linkSegments } from './links';

const LANGS = ['en', 'es', 'pt', 'tr', 'ro'];
const russian = linkable(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const overlays = Object.fromEntries(
  LANGS.map(lang => [lang, JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards as Record<string, string[]>]),
);
const inLanguage = (lang: string) =>
  lang === 'ru' ? russian : russian.map(card => ({ ...card, f: overlays[lang]![card.id]?.[0] ?? card.f, n: overlays[lang]![card.id]?.[3] }));

/** Words each card's note links to, as `word -> linked word`. */
function linksIn(lang: string) {
  const cards = inLanguage(lang);
  const index = buildIndex(cards);
  return new Map(
    cards.map(card => [
      card.b,
      [...new Set((card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '))
        .flatMap(item => linkSegments(item, index, card.id))
        .flatMap(s => (s.link ? [index.byId.get(s.link)!.b] : [])))].sort(),
    ]),
  );
}
const russianLinks = linksIn('ru');

describe('a note', () => {
  it.each(LANGS)('links in %s the cards its Russian note links', lang => {
    const links = linksIn(lang);
    const differing = [...russianLinks].filter(([word, words]) => `${links.get(word)}` !== `${words}`)
      .map(([word, words]) => `${word}: ru ${words.join(', ')} / ${lang} ${links.get(word)!.join(', ')}`);
    expect(differing).toEqual([]);
  });

  it.each([
    ['de genote', 'de genoot'],
    ['de echtgenote', 'de echtgenoot'],
    ['de kapper', 'de kapster'],
    ['het voorwerp', 'werpen'],
    ['hij vond', 'vinden'],
    ['de echtgenoot', 'de genoot'],
    ['kletsnat', 'nat'],
    ['zelfstandige', 'zelfstandig'],
    ['zelfstandig', 'zelf'],
    ['zelfstandig', 'staan'],
    ['zelfstandig', '-ig'],
    ['tegenwoordig', 'tegen'],
    ['tegenwoordig', '-ig'],
    ['tegenwoordig', 'het woord'],
    ['opbellen', 'bellen'],
    ['bellen', 'opbellen'],
    ['leuker', 'leuk'],
    ['de slaapkamer', 'de kamer'],
    ['de boodschap', 'de bode'],
    ['de boodschap', '-schap'],
    ['de paddenstoel', 'de pad'],
    ['de paddenstoel', 'de stoel'],
    ['de pad', 'het pad'],
    ['het pad', 'de pad'],
    ['de aardappel', 'de aarde'],
    ['de aardappel', 'de appel'],
    ['de sinaasappel', 'de appel'],
  ])('of %s links %s', (word, other) => {
    expect(russianLinks.get(word)).toContain(other);
  });
});
