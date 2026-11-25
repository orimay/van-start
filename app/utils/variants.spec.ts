import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; n?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const byWord = new Map(deck.map(c => [c.b, c]));
const named = (note: string, kind: string) =>
  [...note.matchAll(new RegExp(`${kind}: ([^;]+)`, 'g'))].flatMap(m => m[1]!.split(', ').map(word => word.replace(/ \(.*$/, '')));

describe('a variant or synonym', () => {
  it('names the card that names it', () => {
    const oneWay = deck.flatMap(card =>
      ['вариант', 'синоним'].flatMap(kind => named(card.n ?? '', kind)
        .filter(other => byWord.has(other) && !named(byWord.get(other)!.n ?? '', kind).includes(card.b))
        .map(other => `${card.b} -> ${other}`)),
    );
    expect(oneWay).toEqual([]);
  });
});

// One action said as one verb or as a noun with a light verb: each card says when it is the natural pick and names the other
const VERB_PHRASES: Array<[string, string]> = [
  ['douchen', 'een douche nemen'], ['antwoorden', 'antwoord geven'], ['wandelen', 'een wandeling maken'],
  ['rusten', 'rust nemen'], ['kijken', 'een kijkje nemen'], ['vragen', 'een vraag stellen'],
  ['kiezen', 'een keuze maken'], ['reizen', 'een reis maken'], ['fietsen', 'een fietstocht maken'],
  ['praten', 'een praatje maken'], ['praten', 'een gesprek voeren'], ['afspreken', 'een afspraak maken'],
  ['informeren', 'informatie geven'], ['adviseren', 'advies geven'], ['groeten', 'de groeten doen'],
  ['bezoeken', 'op bezoek gaan'], ['wassen', 'de was doen'],
];
const SYNONYM: Record<string, string> = { ru: 'синоним', en: 'synonym', es: 'sinónimo', pt: 'sinônimo', tr: 'eş anlamlı', ro: 'sinonim' };
const noteIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.n ?? '';
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[3] ?? '';
};

describe('a verb and its phrase', () => {
  it.each(Object.keys(SYNONYM))('name each other as synonyms in %s', (lang) => {
    const note = noteIn(lang);
    const unnamed = VERB_PHRASES.flatMap(([verb, phrase]) => [[verb, phrase], [phrase, verb]])
      .filter(([card, other]) => !named(note(byWord.get(card!)!), SYNONYM[lang]!).includes(other!))
      .map(([card, other]) => `${card} -> ${other}`);
    expect(unnamed).toEqual([]);
  });

  it.each(Object.keys(SYNONYM))('say apart when each is the natural pick in %s', (lang) => {
    const note = noteIn(lang);
    const plain = VERB_PHRASES.flatMap(pair => pair)
      .filter(word => !note(byWord.get(word)!).split('; ').some(item => !/^[^:]{1,40}: /.test(item) && !/ [—-] /.test(item)));
    expect([...new Set(plain)]).toEqual([]);
  });
});
