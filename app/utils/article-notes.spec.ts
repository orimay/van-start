import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { id: string; b: string; n?: string }
interface Node { cards?: Card[]; children?: Node[] }
type Row = [string, string?, string?, string?, string?];
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const withArticle = cardsOf(deck).filter(c => /^(de|het) /.test(c.b));

/** The deck writes the article on every noun; a hint about dropping it talks a learner out of typing it. */
const DROPS_ARTICLE: Record<string, RegExp> = {
  ru: /без (артикля|de|het)/,
  en: /without (an? )?(article|de|het)|takes no article/,
  es: /sin (artículo|de |het )/,
  pt: /sem (artigo|de |het )/,
  tr: /artikelsiz|de'siz|het'siz/,
  ro: /fără (articol|de |het )/,
};

describe('a card with an article', () => {
  it('never hints at dropping it in Russian', () => {
    expect(withArticle.filter(c => DROPS_ARTICLE.ru!.test(c.n ?? '')).map(c => `${c.b}: ${c.n}`)).toEqual([]);
  });

  for (const lang of ['en', 'es', 'pt', 'tr', 'ro']) {
    it(`never hints at dropping it in ${lang}`, () => {
      const rows: Record<string, Row> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
      expect(withArticle.filter(c => DROPS_ARTICLE[lang]!.test(rows[c.id]?.[3] ?? '')).map(c => `${c.b}: ${rows[c.id]![3]}`)).toEqual([]);
    });
  }
});
