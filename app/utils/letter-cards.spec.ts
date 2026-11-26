import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckCard, type DeckNode } from './deck';

type Row = [string, string?, string?, string?, string?, string?, string?];
const LANGUAGES = ['ru', 'en', 'es', 'pt', 'tr', 'ro'] as const;
type Language = (typeof LANGUAGES)[number];

const cards = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
const overlays = Object.fromEntries(LANGUAGES.filter(l => l !== 'ru').map(l => [l, JSON.parse(readFileSync(`public/lang/${l}.json`, 'utf8')).cards as Record<string, Row>]));

const sounds = cards.filter(card => card.k === 'sound');
const letters = cards.filter(card => card.p === 'letter' && card.k !== 'sound');

/** The card's front, transcription, examples and their marked transcription, as a learner of `language` sees them. */
function sideOf(card: DeckCard, language: Language) {
  if (language === 'ru') return { front: card.f, tr: card.tr, examples: card.xf, xt: card.xt };
  const row = overlays[language]![card.id]!;
  return { front: row[0], tr: row[2], examples: row[1], xt: row[6] };
}

const unmark = (text: string) => text.replace(/[[\]]/g, '');
const marksOf = (word: string) => [...word.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]!);
/** `Примеры: чай, я говорю, никакой` → its words. */
const examplesOf = (line = '') => line.replace(/^[^:]+:\s*/, '').replace(/\.$/, '').split(', ');

const LETTER: Record<Language, RegExp> = {
  ru: /^буква «([^»]+)»$/,
  en: /^letter “([^”]+)”$/,
  es: /^letra «([^»]+)»$/,
  pt: /^letra “([^”]+)”$/,
  tr: /^“([^”]+)” harfi$/,
  ro: /^litera „([^”]+)”$/,
};
const SOUND: Record<Language, RegExp> = {
  ru: /^звук (\S+), как в нидерландском слове «([^»]+)»$/,
  en: /^sound (\S+), as in the Dutch word for “([^”]+)”$/,
  es: /^sonido (\S+), como en la palabra neerlandesa para «([^»]+)»$/,
  pt: /^som (\S+), como na palavra holandesa para “([^”]+)”$/,
  tr: /^(\S+) sesi, “([^”]+)” anlamına gelen Hollandaca kelimedeki gibi$/,
  ro: /^sunetul (\S+), ca în cuvântul neerlandez pentru „([^”]+)”$/,
};

describe('a letter card', () => {
  it.each(LANGUAGES)('names the letter by its name in %s', language => {
    expect(letters).toHaveLength(26);
    expect(letters.filter(card => LETTER[language].exec(sideOf(card, language).front)?.[1] !== sideOf(card, language).tr).map(card => sideOf(card, language).front)).toEqual([]);
  });

  it('marks the letter in each example word', () => {
    expect(letters.filter(card => unmark(card.xm ?? '') !== card.xb || card.xm!.split(', ').some(word => !marksOf(word).length)).map(card => `${card.b}: ${card.xm}`)).toEqual([]);
    expect(letters.flatMap(card => marksOf(card.xm!).filter(mark => mark.toLowerCase() !== card.b))).toEqual([]);
  });
});

describe('a sound card', () => {
  it.each(LANGUAGES)('names the sound and a Dutch example word in %s', language => {
    expect(sounds).toHaveLength(28);
    const wrong = sounds.filter(card => {
      const side = sideOf(card, language);
      const [, sound, word] = SOUND[language].exec(side.front) ?? [];
      return sound !== side.tr || !examplesOf(side.examples).includes(word!);
    });
    expect(wrong.map(card => `${sideOf(card, language).front} [${sideOf(card, language).tr}]`)).toEqual([]);
  });

  it('marks the sound in each example word', () => {
    const wrong = sounds.filter(card => unmark(card.xm ?? '') !== card.xb || card.xm!.split(', ').some(word => marksOf(word).some(mark => mark.toLowerCase() !== card.b) || !marksOf(word).length));
    expect(wrong.map(card => `${card.b}: ${card.xm}`)).toEqual([]);
  });

  it.each(LANGUAGES)('marks the sound in the transcription of each example word in %s', language => {
    const wrong = sounds.filter(card => {
      const { xt = '', tr } = sideOf(card, language);
      const words = xt.split(', ');
      const dutch = card.xm!.split(', ');
      return words.length !== dutch.length || words.some((word, i) => marksOf(word).length !== marksOf(dutch[i]!).length || marksOf(word).some(mark => mark.normalize('NFD').replace(/́/g, '').normalize('NFC') !== tr));
    });
    expect(wrong.map(card => `${card.b} [${sideOf(card, language).tr}]: ${sideOf(card, language).xt}`)).toEqual([]);
  });
});
