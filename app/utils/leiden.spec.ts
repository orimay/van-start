import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckCard, type DeckNode } from './deck';

type Row = [string, string?, string?, string?, string?, string?, string?];
const LANGUAGES = ['ru', 'en', 'es', 'pt', 'tr', 'ro'] as const;
type Language = (typeof LANGUAGES)[number];

const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const overlays = Object.fromEntries(LANGUAGES.filter(l => l !== 'ru').map(l => [l, JSON.parse(readFileSync(`public/lang/${l}.json`, 'utf8')).cards as Record<string, Row>]));
const card = (word: string) => cards.find(c => c.b === word)!;

function sideOf(of: DeckCard, language: Language) {
  if (language === 'ru') return { front: of.f, note: of.n ?? '' };
  const row = overlays[language]![of.id]!;
  return { front: row[0], note: row[3] ?? '' };
}

/** Each language's three senses of leiden, every one with its bracketed hint, and its "don't confuse with" label. */
const SENSES: Record<Language, { senses: RegExp[]; apart: string }> = {
  ru: { senses: [/вести \(куда-то\)/, /руководить \(/, /приводить \(к/], apart: 'не путать с: ' },
  en: { senses: [/lead \(the way/, /run \(/, /lead to \(/], apart: "don't confuse with: " },
  es: { senses: [/guiar \(/, /dirigir \(/, /llevar a \(/], apart: 'no confundir con: ' },
  pt: { senses: [/guiar \(/, /dirigir \(/, /levar a \(/], apart: 'não confundir com: ' },
  tr: { senses: [/götürmek \(/, /yönetmek \(/, /yol açmak \(/], apart: 'karıştırma: ' },
  ro: { senses: [/a călăuzi \(/, /a conduce \(/, /a duce la \(/], apart: 'a nu se confunda cu: ' },
};

describe('leiden', () => {
  it.each(LANGUAGES)('gives each of its senses a hint in %s', language => {
    const { front } = sideOf(card('leiden'), language);
    for (const sense of SENSES[language].senses) expect(front).toMatch(sense);
  });

  it.each(LANGUAGES)('names its past forms, leiden tot and a way of life in %s', language => {
    const { note } = sideOf(card('leiden'), language);
    for (const word of ['leidde, geleid', 'leiden tot', 'een gezond leven leiden', 'alle wegen leiden naar Rome']) expect(note).toContain(word);
  });

  it.each(LANGUAGES)('is told apart from lijden, which sounds the same, in %s', language => {
    const { note } = sideOf(card('leiden'), language);
    expect(note).toContain(`${SENSES[language].apart}lijden (`);
  });
});

describe('lijden', () => {
  it.each(LANGUAGES)('names its past forms, lijden aan and leiden in %s', language => {
    const { note } = sideOf(card('lijden'), language);
    for (const word of ['leed, geleden', 'lijden aan', `${SENSES[language].apart}leiden (`, 'de pijn']) expect(note).toContain(word);
  });
});

describe('de waterleiding', () => {
  it.each(LANGUAGES)('comes from de leiding as a pipe in %s', language => {
    expect(sideOf(card('de waterleiding'), language).note).toMatch(/\+ de leiding \(/);
    expect(sideOf(card('de waterleiding'), language).note).not.toMatch(/руководство|management|mando|chefia|yönetim|conducere/);
  });
});
