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

/** Each language's hinted senses of het pak, and its "don't confuse with" label. */
const SENSES: Record<Language, { pack: RegExp; suit: RegExp; stack: RegExp; apart: string }> = {
  ru: { pack: /пачка \(молока\)/, suit: /костюм \(деловой\)/, stack: /стопка \(бумаги\)/, apart: 'не путать с: ' },
  en: { pack: /carton \(of milk\)/, suit: /suit \(business\)/, stack: /stack \(of paper\)/, apart: "don't confuse with: " },
  es: { pack: /cartón \(de leche\)/, suit: /traje \(de vestir\)/, stack: /pila \(de papel\)/, apart: 'no confundir con: ' },
  pt: { pack: /caixa \(de leite\)/, suit: /terno \(social\)/, stack: /pilha \(de papel\)/, apart: 'não confundir com: ' },
  tr: { pack: /kutu \(süt\)/, suit: /takım elbise \(iş\)/, stack: /deste \(kâğıt\)/, apart: 'karıştırma: ' },
  ro: { pack: /cutie \(de lapte\)/, suit: /costum \(de birou\)/, stack: /teanc \(de hârtie\)/, apart: 'a nu se confunda cu: ' },
};

describe('het pak', () => {
  it.each(LANGUAGES)('gives the pack, the suit and the stack with hints in %s', language => {
    const { front } = sideOf(card('het pak'), language);
    for (const sense of [SENSES[language].pack, SENSES[language].suit, SENSES[language].stack]) expect(front).toMatch(sense);
  });

  it.each(LANGUAGES)('shows each sense, its plural and its idiom in %s', language => {
    const { note } = sideOf(card('het pak'), language);
    for (const phrase of ['een pak melk', 'een net pak', 'een regenpak', 'een pak papier', 'de pakken', 'een pak van mijn hart']) expect(note).toContain(phrase);
  });

  it.each(LANGUAGES)('is told apart from the imperative pak in %s', language => {
    expect(sideOf(card('het pak'), language).note).toContain(`${SENSES[language].apart}de verpakking (`);
    expect(sideOf(card('het pak'), language).note).toMatch(/, pak \(/);
    expect(sideOf(card('pak'), language).note).toContain(`${SENSES[language].apart}het pak (`);
  });
});

describe('pak', () => {
  it.each(LANGUAGES)('shows its everyday uses in %s', language => {
    for (const phrase of ['pak mijn hand', 'pak de bal']) expect(sideOf(card('pak'), language).note).toContain(phrase);
  });
});

describe('het pakje', () => {
  it.each(LANGUAGES)('gives the small pack and the parcel in %s', language => {
    const { note } = sideOf(card('het pakje'), language);
    for (const phrase of ['een pakje boter', 'ik verwacht een pakje', 'het pakketje (']) expect(note).toContain(phrase);
  });
});

describe('pakken', () => {
  it.each(LANGUAGES)('is the everyday nemen in %s', language => {
    const { note } = sideOf(card('pakken'), language);
    for (const phrase of ['nemen', 'ik pak even een kopje koffie', 'zij pakt altijd de fiets', 'op heterdaad gepakt', 'pakte, gepakt']) expect(note).toContain(phrase);
  });
});
