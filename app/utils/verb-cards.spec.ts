import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Card = { b: string; f: string; p?: string };
type Node = { cards?: Card[]; children?: Node[] };
const cardsOf = (node: Node): Card[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
const deck = cardsOf(JSON.parse(readFileSync('public/deck.json', 'utf8')));

const SUBJECT = new Set('ik jij je u hij zij ze wij we jullie het er daar men'.split(' '));
const AUXILIARY = new Set('heb hebt heeft hebben ben bent is zijn wordt worden'.split(' '));
/** What a verb carries along: its particle or the preposition it takes. */
const TRAILING = new Set('op aan af uit mee in weg terug toe om door over na bij voor samen thuis met naar van tegen'.split(' '));

/** The words left once the subject, zich, the auxiliary of a participle (ik heb gefietst, hij opgeruimd heeft), and trailing particles are dropped. */
function verbWords(b: string) {
  let words = b.toLowerCase().split(' ').filter(w => w !== 'zich');
  if (SUBJECT.has(words[0]!)) words = words.slice(1);
  if (words.length === 2) words = words.filter(w => !AUXILIARY.has(w));
  while (words.length > 1 && TRAILING.has(words.at(-1)!)) words = words.slice(0, -1);
  return words;
}

describe('a verb card', () => {
  // foto's maken, pijn doen and het licht uitdoen are phrases: a verb tint on them reads as one more verb.
  it('is one verb, with only its subject, zich, particle or preposition around it', () => {
    const phrases = deck.filter(c => c.p === 'verb' && !c.b.includes(',') && verbWords(c.b).length > 1);
    expect(phrases.map(c => c.b)).toEqual([]);
  });
});
