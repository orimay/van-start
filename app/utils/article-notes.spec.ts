import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { articlesOf, explainsArticle as explains, noteLines } from './deck';

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

const VERB = /^een (\S+ )+(maken|nemen|bezoeken|boeken|plannen|kopen|verkopen|huren|verhuren|geven|stellen|voeren|schrijven|leggen|doen|vinden|leren|bestellen|opladen)$/;
/** Russian has no article: "совершить велопрогулку" reads as one particular ride unless the prompt says otherwise. */
const SAYS_ANY: Record<string, RegExp> = {
  ru: /нибудь|одн(им|у|о)\b|глазком/,
  tr: /\bbir\b/,
};

describe('a phrase doing something with een', () => {
  const phrases = cardsOf(deck).filter(c => VERB.test(c.b)) as (Card & { f: string })[];

  it('exists in the deck', () => {
    expect(phrases.length).toBeGreaterThan(30);
  });

  it('says in Russian that any one will do', () => {
    expect(phrases.filter(c => !SAYS_ANY.ru!.test(c.f)).map(c => `${c.b}: ${c.f}`)).toEqual([]);
  });

  it('puts bir in Turkish', () => {
    const rows: Record<string, Row> = JSON.parse(readFileSync('public/lang/tr.json', 'utf8')).cards;
    expect(phrases.filter(c => !SAYS_ANY.tr!.test(rows[c.id]![0])).map(c => `${c.b}: ${rows[c.id]![0]}`)).toEqual([]);
  });
});

const noteItems = (note?: string) => (note ? noteLines(note).map(l => l.text) : []);

/** Russian and Turkish have no definite article: a phrase says why it takes een (any one, first mention) or de/het (the known one, a set phrase). English, Spanish, Portuguese and Romanian show it with their own. */
describe('a phrase with an article', () => {
  const phrases = cardsOf(deck).filter(c => articlesOf(c.b).length);

  it('exists in the deck', () => {
    expect(phrases.length).toBeGreaterThan(400);
  });

  it('explains each article in its Russian note', () => {
    const missing = phrases.flatMap(c => articlesOf(c.b).filter(a => !noteItems(c.n).some(i => explains(i, a))).map(a => `${c.b}: ${a}`));
    expect(missing).toEqual([]);
  });

  it('explains each article in Turkish at its Russian twin', () => {
    const rows: Record<string, Row> = JSON.parse(readFileSync('public/lang/tr.json', 'utf8')).cards;
    const missing = phrases.flatMap(c => {
      const own = noteItems(rows[c.id]?.[3]);
      return articlesOf(c.b).filter(a => {
        const at = noteItems(c.n).findIndex(i => explains(i, a));
        return at < 0 || !explains(own[at] ?? '', a);
      }).map(a => `${c.b}: ${a}`);
    });
    expect(missing).toEqual([]);
  });
});
