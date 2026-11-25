import { isCorrect, normalize, stripMarks, type Leniency } from '@/utils/answer';
import { lookalikes } from '@/utils/similar';

const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const ARTICLE = /^(de|het|een)\s+/;
const wordOf = (card: { b: string }) => plain(card.b).replace(ARTICLE, '');

/** Where the query starts in a word of the meaning, or -1. */
function wordStartIn(meaning: string, query: string) {
  for (let at = meaning.indexOf(query); at >= 0; at = meaning.indexOf(query, at + 1)) if (at === 0 || !/\p{L}/u.test(meaning[at - 1]!)) return at;
  return -1;
}

/** How far a card is from the query: where it starts in the Dutch (compounds) or at a word of a meaning, then how much more the text holds; Dutch first among equals. */
function distanceOf(card: { b: string; f: string }, query: string): Distance | undefined {
  const dutch = wordOf(card);
  const hits: Distance[] = [[dutch.indexOf(query), dutch.length - query.length, 0], ...plain(card.f).split(/[;,] /).map((m): Distance => [wordStartIn(m, query), m.length - query.length, 1])];
  return hits.filter(([at]) => at >= 0).sort(byDistance)[0];
}

type Distance = [at: number, extra: number, side: number];
const byDistance = ([a1, a2, a3]: Distance, [b1, b2, b3]: Distance) => a1 - b1 || a2 - b2 || a3 - b3;

/** Cards whose Dutch word or native meaning holds the query, closest first, deck order among equals. */
export function matching<T extends { b: string; f: string }>(cards: readonly T[], query: string, limit = 30): T[] {
  const q = plain(query);
  if (!q) return [];
  return cards
    .flatMap(card => {
      const distance = distanceOf(card, q);
      return distance ? [{ card, distance }] : [];
    })
    .sort((a, b) => byDistance(a.distance, b.distance))
    .slice(0, limit)
    .map(({ card }) => card);
}

/** Cards `card` may have been taken for: single words built on its word or it on theirs, then the ones looking most like it. */
export function suspects<T extends { id: string; b: string }>(card: { b: string }, cards: readonly T[], isKnown: (id: string) => boolean, limit = 8): T[] {
  const word = wordOf(card);
  const MIN_PART = 3;
  const sharing = (other: T) => {
    const its = wordOf(other);
    return !/\s/.test(word + its) && Math.min(word.length, its.length) >= MIN_PART && (its.includes(word) || word.includes(its));
  };
  const alike = lookalikes(card.b, cards.map(c => ({ ...c, answer: c.b })), { count: limit, isKnown, random: () => 0 });
  const byId = new Map(cards.map(c => [c.id, c]));
  return [...new Set([...cards.filter(sharing).map(c => c.id), ...alike.map(c => c.id)])].slice(0, limit).map(id => byId.get(id)!);
}

/** Text as written, hints and case included: only spacing and trailing punctuation are let go. */
const written = (text: string) => text.replace(/[‘’´`]/g, "'").replace(/\s+/g, ' ').replace(/[\s.!?;:]+$/, '').trim();
const isWritten = (input: string, answer: string) => written(input) !== '' && [answer, ...answer.split(',')].some(variant => written(variant) === written(input));

/** Text without marks or the hyphen of a prefix or suffix (`terug-`, `-heid`); `e-mail` keeps its own. */
const bare = (text: string) => stripMarks(text).replace(/(?<=\p{L})-(?=\s|,|$)|(?<=^|\s)-(?=\p{L})/gu, '');

/**
 * The cards a wrong typed answer is the answer of. A form written exactly so is chosen on purpose (`terug-`, `één`),
 * but a plain one may also mean the marked forms it lacks when marks are ignored. Nothing written so: every card the leniency accepts.
 */
export function typedAs<T>(input: string, cards: readonly T[], answerOf: (card: T) => string, leniency: Leniency): T[] {
  const cased = { ignoreCase: leniency.ignoreCase, ignoreMarks: false };
  const variants = (answer: string) => [answer, ...answer.split(',')];
  const lacksOnlyMarks = (answer: string, typed: string) => leniency.ignoreMarks && variants(answer).some(v => normalize(bare(v), cased) === typed);
  const typedAsIs = leniency.ignoreCase ? written(input).toLowerCase() : written(input);
  const exact = cards.filter(card => isWritten(input, answerOf(card)));
  if (exact.length) return cards.filter(card => exact.includes(card) || lacksOnlyMarks(answerOf(card), typedAsIs));
  const typedBare = normalize(bare(input), cased);
  return cards.filter(card => isCorrect(input, answerOf(card), leniency) || lacksOnlyMarks(answerOf(card), typedBare));
}
