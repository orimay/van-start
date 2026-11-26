import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const overlays = Object.fromEntries(['en', 'es', 'pt', 'ro', 'tr'].map(lang => [lang,
  (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards]));

/** How each language says a sense belongs to the base word alone. */
const ONLY: Record<string, string> = { ru: 'только', en: 'only', es: 'solo', pt: 'só', ro: 'doar', tr: 'sadece' };

const sensesOf = (front: string) => front.split(/; |, (?![^(]*\))/).map(s => s.trim());
const frontIn = (lang: string, card: Card) => lang === 'ru' ? card.f : overlays[lang]![card.id]![0]!;
const noteIn = (lang: string, card: Card) => (lang === 'ru' ? card.n : overlays[lang]![card.id]![3]) ?? '';

/** The senses the note gives to the base alone: `только vast: наверняка`. */
function baseOnly(lang: string, note: string, base: string) {
  const label = `${ONLY[lang]} ${base}: `;
  return note.split(/; |\n/).filter(item => item.startsWith(label)).flatMap(item => sensesOf(item.slice(label.length)));
}

const byWord = Map.groupBy(deck, card => card.b);
/** Each inflected adjective (vaste) with its base (vast). */
const pairs = deck.flatMap((form) => {
  const base = /форма от: ([^;(\n]+?) \(/.exec(form.n ?? '')?.[1];
  if (!base || !form.b.endsWith('e') || form.b.includes(' ')) return [];
  return (byWord.get(base) ?? []).map(card => ({ base: card, form }));
});

describe('an inflected adjective', () => {
  it('is found for the known pairs', () => {
    expect(pairs.map(({ form }) => form.b)).toEqual(expect.arrayContaining(['vaste', 'goede', 'snelle']));
  });

  it.each(Object.keys(ONLY))('has every sense of its base or names the base-only ones, in %s', (lang) => {
    const unexplained = pairs.flatMap(({ base, form }) => {
      const formSenses = new Set([...sensesOf(frontIn(lang, form)), ...baseOnly(lang, noteIn(lang, form), base.b)]);
      const missing = sensesOf(frontIn(lang, base)).filter(sense => !formSenses.has(sense));
      return missing.length ? [`${base.b} | ${form.b}: ${missing.join(', ')}`] : [];
    });
    expect(unexplained).toEqual([]);
  });
});
