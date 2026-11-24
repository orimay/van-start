import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckCard, type DeckNode } from './deck';
import { buildIndex, linkBreakdown, linkSegments } from './links';

const ORIGIN = /^(?:(?:pl\. )?(?:[mfn]\.(?:\/[mfn]\.)? )?)(?:от|from|deriva de|kökü|de la|уменьш\. от|diminutive of|diminutivo de|küçültme|diminutiv de la): /;
const deck = (): DeckCard[] => cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')) as DeckNode);
/** The deck as a learner of `lang` reads it. */
function deckIn(lang: string): DeckCard[] {
  const cards = deck();
  if (lang === 'ru') return cards;
  const rows = (JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { cards: Record<string, string[]> }).cards;
  return cards.map(c => {
    const row = rows[c.id];
    return row ? { ...c, n: row[3] || undefined, ...(row[5] && { xl: row[5] }) } : c;
  });
}
const withoutGlosses = (text: string): string => (/\([^()]*\)/.test(text) ? withoutGlosses(text.replace(/\([^()]*\)/g, '')) : text);
/** Words of a part list left as plain text: what a learner cannot open. */
const unlinked = (segments: Array<{ text: string; link?: string }>) =>
  segments.filter(s => !s.link).flatMap(s => [...withoutGlosses(s.text).split(': ')[0]!.matchAll(/[\p{L}-][\p{L}' -]*[\p{L}-]|\p{L}/gu)].map(m => m[0].trim()));

describe.each(['ru', 'en', 'es', 'pt', 'tr', 'ro'])('in %s, every part a card is made of', lang => {
  const cards = deckIn(lang);
  const index = buildIndex(cards);

  it('links to its card from the note', () => {
    const missing = cards.flatMap(c =>
      (c.n ?? '').split('\n').flatMap(l => l.replace(/^!/, '').split('; ')).filter(item => ORIGIN.test(item)).flatMap(item => unlinked(linkSegments(item, index, c.id).slice(1)).map(w => `${c.b}: ${w}`)),
    );
    expect(missing).toEqual([]);
  });

  it('links to its card from an affix breakdown', () => {
    const missing = cards.filter(c => /^-|-$/.test(c.b) && c.xl).flatMap(c => unlinked(linkBreakdown(c.xl!, index, c.id)).filter(w => w !== c.b).map(w => `${c.b}: ${w}`));
    expect(missing).toEqual([]);
  });
});
