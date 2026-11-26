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

/** Each language's words for a trip and a journey, and its "don't confuse with" label. */
const SENSES: Record<Language, { trip: RegExp; journey: RegExp; apart: string }> = {
  ru: { trip: /поездка/, journey: /путешествие/, apart: 'не путать с: ' },
  en: { trip: /trip/, journey: /journey/, apart: "don't confuse with: " },
  es: { trip: /viaje/, journey: /viaje/, apart: 'no confundir con: ' },
  pt: { trip: /viagem/, journey: /viagem/, apart: 'não confundir com: ' },
  tr: { trip: /yolculuk/, journey: /seyahat/, apart: 'karıştırma: ' },
  ro: { trip: /călătorie/, journey: /călătorie/, apart: 'a nu se confunda cu: ' },
};

describe('de reis', () => {
  it.each(LANGUAGES)('means any trip and a journey in %s', language => {
    const { front } = sideOf(card('de reis'), language);
    expect(front).toMatch(SENSES[language].trip);
    expect(front).toMatch(SENSES[language].journey);
  });

  it.each(LANGUAGES)('names its plural, its phrases and its verb in %s', language => {
    const { note } = sideOf(card('de reis'), language);
    for (const word of ['de reizen', 'een reis maken', 'op reis gaan', 'zij zijn op reis', 'goede reis', 'reizen (']) expect(note).toContain(word);
  });

  it.each(LANGUAGES)('is told apart from the short trips in %s', language => {
    const { note } = sideOf(card('de reis'), language);
    expect(note).toContain(SENSES[language].apart);
    for (const word of ['het uitstapje', 'de rit', 'de tocht']) expect(note).toContain(word);
  });

  it.each(LANGUAGES)('is named by the short trips in %s', language => {
    for (const word of ['het uitstapje', 'de rit', 'de tocht']) expect(sideOf(card(word), language).note).toContain('de reis (');
  });
});
