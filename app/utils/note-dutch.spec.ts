import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { noteLines, toStudyCard, type DeckCard } from './deck';

interface Card { id: string; b: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const items = (note?: string) => (note ? noteLines(note).map(l => l.text) : []);

/** Latin words a Russian note may show before the answer: articles and the -e ending. */
const ALLOWED = new Set(['de', 'het', 'een', 'geen', 'e']);
const firstDutch = (item: string) => [...item.matchAll(/[a-zà-ÿ]+/gi)].find(m => !ALLOWED.has(m[0].toLowerCase()))?.index;
/** Items that only name a related form; the whole item is the mention. */
const LABEL = /^(форма|мн\. ч\.|также|ед\. ч|прош\.|в речи|женский род|превосходная|мужчина|учительница|то же|от:|уменьш|причастие|прошедшее|просьба|процесс|синоним|вариант|родственное|не путать|слова на)/;

/** A Dutch word hides its whole item until the answer; a meaning before it would hide with it. */
function hidesMeaning(item: string) {
  const at = firstDutch(item);
  if (at === undefined || LABEL.test(item)) return false;
  const meaning = item.slice(0, at).match(/^(.*?)(: | \(| — |, )\S*$/)?.[1];
  return !!meaning && /[а-яё]{3,}/i.test(meaning) && firstDutch(meaning) === undefined;
}

describe('a Russian note item', () => {
  it('keeps its meaning apart from a Dutch example', () => {
    const offenders = cardsOf(deck).flatMap(c => items(c.n).filter(hidesMeaning).map(i => `${c.b}: ${i}`));
    expect(offenders).toEqual([]);
  });
});

describe('a Russian prompt', () => {
  it('shows no Dutch word before the answer is out', () => {
    const shown = cardsOf(deck).flatMap(c => {
      const card = toStudyCard(c as DeckCard);
      return noteLines(card.promptNote ?? '')
        .filter((_, i) => !card.promptSecret?.[i])
        .filter(l => firstDutch(l.text) !== undefined)
        .map(l => `${c.b}: ${l.text}`);
    });
    expect(shown).toEqual([]);
  });
});

describe('a translated note', () => {
  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`has as many items as the Russian one in ${lang}, so each hides by its twin`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      const misaligned = cardsOf(deck)
        .filter(c => c.n && rows[c.id]?.[3] && items(rows[c.id]![3]).length !== items(c.n).length)
        .map(c => `${c.b}: ${c.n} | ${rows[c.id]![3]}`);
      expect(misaligned).toEqual([]);
    });
  }
});

/** A Dutch word after an arrow, not followed by its meaning in brackets. */
const BARE_RESULT = /→ [a-zà-ÿ]{2,}(?! \()(?=[,;:]|$)/i;

describe('a word a note derives', () => {
  for (const lang of ['ru', 'en', 'es', 'pt', 'tr', 'ro']) {
    it(`carries its meaning, like the word it comes from, in ${lang}`, () => {
      const rows: Record<string, Row> = lang === 'ru' ? {} : JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      const bare = cardsOf(deck).flatMap(c => items(lang === 'ru' ? c.n : rows[c.id]?.[3]).filter(i => BARE_RESULT.test(i)).map(i => `${c.b}: ${i}`));
      expect(bare).toEqual([]);
    });
  }
});
