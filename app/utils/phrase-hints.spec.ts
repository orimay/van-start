import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { id: string; b: string; f: string };
type Node = { cards?: Card[]; children?: Node[] };
const cards = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cards)];
const deck = cards(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const frontIn = (lang: string): ((card: Card) => string) => {
  if (lang === 'ru') return card => card.f;
  const rows: Record<string, string[]> = JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')).cards;
  return card => rows[card.id]?.[0] ?? '';
};
const ORDINARY: Record<string, RegExp> = {
  ru: /обычн/, en: /usual|ordinary|regular/, es: /habitual|normal/, pt: /habitual|normal/, ro: /obișnuit/, tr: /her zamanki|sıradan/,
};

// de/het makes the noun a particular one (one's own table); «обычный» in the hint reads as any table at all.
describe('a de/het verb phrase', () => {
  it.each(Object.keys(ORDINARY))('never calls its noun ordinary in the %s hint', (lang) => {
    const front = frontIn(lang);
    const vague = deck.filter(c => /^(de|het) \S+ .*\S+en$/.test(c.b) && new RegExp(`\\([^)]*(${ORDINARY[lang]!.source})`).test(front(c))).map(c => c.b);
    expect(vague).toEqual([]);
  });
});

type NotedCard = Card & { n?: string; k?: string; p?: string };
/** het is the article only before a het noun, bare or after an adjective; elsewhere it is "it": `het is koud`, `het klinkt`, `het gaat goed` (goed is also an adjective). */
const WORDS_OF_OTHER_KINDS = new Set((deck as NotedCard[]).filter(c => c.p !== 'noun').map(c => c.b.toLowerCase()));
const HET_NOUNS = new Set((deck as NotedCard[]).flatMap(c => (c.p === 'noun' && /^het \S+$/.test(c.b) ? [c.b.slice(4).toLowerCase()] : [])).filter(noun => !WORDS_OF_OTHER_KINDS.has(noun)));
/** A note item giving the article as a rule the learner can apply: set phrase, measure, season, ordinal, one of a kind. */
const RULE = /устойчив|мера или количество|время года|определённый артикль|такое одно|что это такое/;
const noteHeads = (card: NotedCard, only = /./) => (card.n ?? '').split('; ').filter(item => item.includes(': ') && only.test(item)).map(item => ` ${item.split(': ')[0]!.toLowerCase()} `);
/** de/het/een in a phrase or sentence whose sense a translation must carry: not a noun's own article, not «wat een», not one a rule note explains. */
const articlesToShow = (card: NotedCard): string[] => {
  const words = (card.b.match(/[\p{L}'’-]+/gu) ?? []).map(w => w.toLowerCase());
  const rules = noteHeads(card, RULE);
  return words.slice(0, -1).flatMap((article, i) => {
    const next = words[i + 1]!;
    const own = i === 0 && (card.p === 'noun' || card.k === 'combination');
    const pronoun = article === 'het' && !HET_NOUNS.has(next) && !(/e$/.test(next) && HET_NOUNS.has(words[i + 2] ?? '')) && !noteHeads(card).some(head => head.includes(` het ${next} `));
    const shown = (article === 'de' || article === 'het' || article === 'een') && next !== 'meeste' && !own && !pronoun && words[i - 1] !== 'wat';
    return shown && !rules.some(head => head.includes(` ${article} ${next} `)) ? [`${article} ${next}`] : [];
  });
};
const DEFINITENESS: Record<string, RegExp> = {
  ru: /\([^)]*(сам|сво|конкрет|нибудь|-то(?![а-яё])|од(?:ин|н)|любо|нужн|наш|ваш|эт[оаиу]|выбранн|определ|известн|в комнате|рейсов|здешн|местн)/,
  tr: /\([^)]*(belirli|kendi|belli|herhangi|bir)|\bbir\b/,
  en: /\b(the|a|an|my|your|his|her|its|our|their|one's|this|that|these|those|another)\b/i,
  es: /\b(el|la|los|las|lo|un|una|unos|unas|al|del|su|sus|mi|mis|tu|tus|nuestr\p{L}*|este|esta|estos|estas|ese|esa|esos|esas|otr[oa]s?)\b/iu,
  pt: /(^|[^\p{L}])(o|a|os|as|um|uma|uns|umas|do|da|dos|das|no|na|nos|nas|ao|à|aos|às|pelo|pela|pelos|pelas|seu|sua|seus|suas|meu|minha|num|numa|este|esta|estes|estas|esse|essa|esses|essas|outr[oa]s?)(?![\p{L}])/iu,
  // A Romanian noun right after a preposition drops its article: «pe masă» is «on the table».
  ro: /\b(un|o|niște|cel|cea|cei|cele)\b|\p{L}-?(ul|ului|lui|a|le|lor|ii|ua)(?![\p{L}])|(^|[^\p{L}])(în|pe|din|sub|lângă|după|peste|prin|spre|de|la|cu|fără|între) \p{L}/iu,
};

// «в классе» could be de klas or een klas: a phrase's article is its meaning, so the front names it.
describe('a phrase with an article', () => {
  it.each(Object.keys(DEFINITENESS))('says in its %s front which one is meant', (lang) => {
    const front = frontIn(lang);
    const vague = (deck as NotedCard[]).filter(c => articlesToShow(c).length && !DEFINITENESS[lang]!.test(front(c))).map(c => `${c.b}: ${front(c)}`);
    expect(vague).toEqual([]);
  });
});
