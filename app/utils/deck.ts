import { isAffix } from '@/utils/games';
import type { Kind } from '@/utils/kinds';

export interface DeckCard {
  id: string;
  f: string;
  b: string;
  tr?: string;
  /** Native note on meaning or usage, apart from the example. */
  n?: string;
  /** The Russian note, kept under a translated one: it tells which items give the word away. */
  nr?: string;
  xf?: string;
  /** Native example lines, matching `nb` line by line. */
  nx?: string;
  /** Dutch note: usage examples, a line each. */
  nb?: string;
  xb?: string;
  img?: string;
  /** Key of the Dutch voice clip in public/audio. */
  au?: string;
  /** Key of the Dutch example's voice clip. */
  axb?: string;
  /** Affix cards: the example word broken into its parts. */
  xl?: string;
  /** Affix cards: the example word's transcription; sound cards: the example words', the sound in brackets. */
  xt?: string;
  /** Sound and letter cards: the example words, the sound or letter in brackets, `de b[u]s`. */
  xm?: string;
  /** A card the learner can switch off (an example sentence or one of a rule-built series), or a sound. */
  k?: Kind | 'sound';
  /** Part of speech; set by scripts/flag-kinds.py. */
  p?: Part;
  /** A word of several parts: the part of each `; ` group of its front, vroeg (рано; ранний). */
  ps?: Part[];
}

export type Part = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'numeral' | 'preposition' | 'conjunction' | 'interjection' | 'phrase' | 'letter';

export interface DeckNode {
  id: string;
  name: string;
  cards?: DeckCard[];
  children?: DeckNode[];
}

/** A card as the learner sees it: `prompt` is the side shown, `answer` the side recalled. */
export interface StudyCard {
  /** Key of the Dutch voice clip. */
  audio?: string;
  /** Key of the Dutch example's voice clip. */
  exampleAudio?: string;
  /** Dutch side and Dutch example, for the device's own voice. */
  nl: string;
  nlExample?: string;
  id: string;
  prompt: string;
  answer: string;
  tr?: string;
  promptNote?: string;
  /** Per prompt note line: it gives the answer away, so it stays hidden until the answer is out. */
  promptSecret?: boolean[];
  /** Per note line, what it is, so each kind looks its own. */
  promptKinds?: NoteKind[];
  answerKinds?: NoteKind[];
  answerNote?: string;
  promptExample?: string;
  answerExample?: string;
  img?: string;
  /** A sound like `ui`, voiced and transcribed by its example words: heard alone it would be the letter's name. */
  sound?: boolean;
  /** Sound and letter cards: the Dutch example and its transcription with the sound or letter in brackets, `de b[u]s`. */
  marks?: { nl: string; tr?: string };
  /** A prefix or a suffix, voiced and transcribed by its example word; its own spelling and transcription mark it there. */
  affix?: { dutch: string; tr?: string };
  /** An affix's example word broken into its parts. */
  breakdown?: string;
  /** What kind of word it is, so its card is tinted apart from the same spelling of another kind. */
  part?: Part | 'affix' | 'sentence';
  /** The part of each `; ` group of the prompt, and of the answer, on a word of several parts. */
  promptSenses?: Part[];
  answerSenses?: Part[];
}

/** The letters in a word, stress marks and brackets aside. */
export const letterCount = (word: string) => word.match(/\p{L}/gu)?.length ?? 0;

/** The word split around an affix's part, `[before, part, after]`, the part `size` letters long (stress marks and brackets aside); a noun's article stays before a prefix. */
export function splitAffix(word: string, size: number, prefix: boolean): [string, string, string] {
  const letter = (i: number) => /\p{L}/u.test(word[i] ?? '');
  if (!prefix) {
    let i = word.length;
    for (let n = 0; i > 0 && n < size; ) if (letter(--i)) n++;
    if (word[i - 1] === '(') i--;
    return [word.slice(0, i), word.slice(i), ''];
  }
  const start = /^\S+ /.exec(word)?.[0].length ?? 0;
  let i = start;
  for (let n = 0; i < word.length && (n < size || /[\u0301)]/.test(word[i]!)); i++) if (letter(i)) n++;
  return [word.slice(0, start), word.slice(start, i), word.slice(i)];
}

/** The text without the brackets that mark a sound or a letter in it. */
export const unmark = (text: string) => text.replace(/[[\]]/g, '');

/** A prefix or a suffix with an example word to voice it. */
export const isAffixCard = (card: DeckCard) => isAffix(card.b) && !!card.xb;
/** An affix or a sound: no clip of its own, so it sits out the games played by ear. */
export const isEarless = (card: DeckCard) => isAffixCard(card) || card.k === 'sound';
const partOf = (card: DeckCard): StudyCard['part'] =>
  isAffixCard(card) ? 'affix' : /^\p{L}$/u.test(card.b) ? 'letter' : card.k === 'sentence' ? 'sentence' : card.p;

export function cardsOf(node: DeckNode): DeckCard[] {
  return [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
}

export function toStudyCard(card: DeckCard): StudyCard {
  const promptNote = [card.n, card.nx].filter(Boolean).join('\n') || undefined;
  const voice = isAffixCard(card)
    ? { affix: { dutch: card.b, tr: card.tr }, nl: card.xb!, audio: card.axb, tr: card.xt }
    : card.k === 'sound' && card.xb
      ? { nl: card.xb, audio: card.axb, tr: card.xt && unmark(card.xt) }
      : { nl: card.b, audio: card.au, nlExample: card.xb, exampleAudio: card.axb, tr: card.tr };
  return { promptSecret: promptNote ? secretLines(card, promptNote) : undefined, promptKinds: promptNote ? kindsOf(card, promptNote) : undefined, answerKinds: card.nb ? noteLines(card.nb).map((): NoteKind => 'example') : undefined, id: card.id, ...voice, prompt: card.f, answer: card.b, promptNote, answerNote: card.nb, promptExample: card.xf, answerExample: card.xb, breakdown: card.xl, img: card.img, part: partOf(card), promptSenses: card.ps, ...(card.k === 'sound' && { sound: true }), ...(card.xm && { marks: { nl: card.xm, ...(card.k === 'sound' && card.xt && { tr: card.xt }) } }) };
}

/** The same card asked the other way round: Dutch shown, native side recalled. */
export function flip(card: StudyCard): StudyCard {
  return { ...card, prompt: card.answer, answer: card.prompt, promptNote: card.answerNote, promptSecret: undefined, promptKinds: card.answerKinds, answerKinds: card.promptKinds, answerNote: card.promptNote, promptExample: card.answerExample, answerExample: card.promptExample, promptSenses: card.answerSenses, answerSenses: card.promptSenses };
}

/** Node at a path of child indexes, e.g. [0, 1, 4]. */
export function nodeAt(root: DeckNode, path: number[]): DeckNode | undefined {
  return path.reduce<DeckNode | undefined>((node, i) => node?.children?.[i], root);
}

/** A note split into lines, one per "; " item; a line starting with "!" is an exception to the rule. */
export function noteLines(note: string): Array<{ text: string; exception: boolean }> {
  return note.split('\n').flatMap(line => line.replace(/^!/, '').split('; ').map(text => ({ text, exception: line.startsWith('!') })));
}

const FUNCTION_WORDS = new Set(['de', 'het', 'een', 'ik', 'jij', 'je', 'u', 'hij', 'zij', 'ze', 'wij', 'we', 'jullie', 'zich']);
const dutchWords = (text: string) => (text.toLowerCase().match(/[a-zà-ÿ]{3,}/g) ?? []).filter(w => !FUNCTION_WORDS.has(w));

/** A variant, synonym, related word or one not to confuse it with points at the answer, whatever its stem. */
const VARIANT = /^(вариант|also|también|também|ayrıca|синоним|synonym|sinónimo|sinônimo|eş anlamlı|родственное|related|relacionado|akraba kelime|не путать с|don't confuse with|no confundir con|não confundir com|karıştırma):/;
/** A Dutch usage example, "… bij de gemeente", with the answer as the gap. */
const DUTCH_USAGE = /^(zich )?…/;
/** Dutch a Russian note may show before the answer: articles and the -e ending. */
const ALLOWED_DUTCH = new Set(['de', 'het', 'een', 'geen', 'e']);

const PROCESS = /^(процесс|process|proceso|processo|süreç):/;
/** A verbal noun mark's label, shown beside the prompt; the rest of the item names the verb, so it hides like any giveaway. */
export function processLabel(item: string) {
  return item.match(PROCESS)?.[1];
}

/** A note item naming the answer word or a form of it would tell it before it is given. */
export function givesAway(item: string, answer: string) {
  if (VARIANT.test(item) || DUTCH_USAGE.test(item)) return true;
  if (/[а-яё]/i.test(item) && (item.toLowerCase().match(/[a-zà-ÿ]+/g) ?? []).some(w => !ALLOWED_DUTCH.has(w))) return true;
  const answerWords = dutchWords(answer);
  return dutchWords(item).some(w => answerWords.some(a => w.startsWith(a) || a.startsWith(w)));
}

/** In a Russian note item (a note with no Cyrillic is someone's own, in another script), any Latin word beyond the article and the -e ending is Dutch. */
const namesDutch = (russian: string) => (russian.toLowerCase().match(/[a-zà-ÿ]+/g) ?? []).some(w => !ALLOWED_DUTCH.has(w));

/** Words after het that make it the pronoun "it", not an article: `is het zo goed?`, `hoe gaat het met je?`. */
const IT = new Set('is was zijn ben bent heb hebt heeft niet ook wel nog al leuk goed in uit op aan af mee na weg terug klaar fijn mooi jammer klopt regent sneeuwt gaat duurt kost lukt geeft zit staat ligt zo maar met gepast gesmaakt een even koud altijd nu over begonnen'.split(' '));

/** Each article in a phrase, as the article and the word after it; a noun card's own leading article is not one. */
export function articlesOf(phrase: string): string[] {
  const words = phrase.match(/[\p{L}'-]+/gu) ?? [];
  const from = /^(de|het)$/i.test(words[0] ?? '') ? 1 : 0;
  return words.slice(0, -1).flatMap((word, i) => {
    const article = word.toLowerCase();
    const next = words[i + 1]!.toLowerCase();
    if (i < from || next === 'meeste' || !(article === 'de' || article === 'een' || (article === 'het' && !IT.has(next)))) return [];
    return [`${article} ${next}`];
  });
}

/** A note item saying why a phrase takes an article: Dutch first, naming the article and the word after it, so it hides until the answer. */
export function explainsArticle(item: string, article: string) {
  const head = item.split(': ')[0]!;
  return item.includes(': ') && ` ${head.toLowerCase()} `.includes(` ${article} `);
}

/** Every article a translation shows: a phrase's own leading one too, unlike a noun's. */
export function shownArticlesOf(phrase: string): string[] {
  const words = phrase.match(/[\p{L}'-]+/gu) ?? [];
  const leading = words.length > 2 && /^(de|het)$/i.test(words[0]!) ? [`${words[0]!.toLowerCase()} ${words[1]!.toLowerCase()}`] : [];
  return [...leading, ...articlesOf(phrase)];
}

/** Russian items a translation leaves out: the trailing ones explaining the articles, which en, es, pt and ro show in the translation. */
function articleTail(russian: Array<{ text: string }>, answer: string) {
  const articles = shownArticlesOf(answer);
  let tail = 0;
  while (tail < russian.length && articles.some(a => explainsArticle(russian[russian.length - 1 - tail]!.text, a))) tail++;
  return tail;
}

/** The Russian items lined up with a translated note's, or none when they do not line up. */
function twinItems(card: DeckCard, own: number) {
  const twin = card.nr ?? card.n ?? '';
  const russian = /[а-яё]/i.test(twin) ? noteLines(twin) : [];
  return russian.length === own || russian.length - articleTail(russian, card.b) === own ? russian.slice(0, own) : [];
}

/** A translated note item is judged by its Russian twin too, when the items line up. */
function secretLines(card: DeckCard, promptNote: string): boolean[] {
  const own = noteLines(card.n ?? '').length;
  const russian = twinItems(card, own);
  return noteLines(promptNote).map(({ text }, i) => givesAway(text, card.b) || (i < russian.length && (namesDutch(russian[i]!.text) || givesAway(russian[i]!.text, card.b))));
}

/** A rule in plain words, a Dutch example, a labelled item (`не путать с: …`) or the word's origin (`от: …`). */
export type NoteKind = 'rule' | 'example' | 'label' | 'origin';

/** Kind of a Russian note item: the Russian says it plainly, while a translation's Dutch and labels read alike. */
export function noteKind(russian: string): NoteKind {
  const label = /^([а-яё][^:«(]{0,30}):\s/i.exec(russian)?.[1];
  if (label) return /(^|[\s,])от$/.test(label) ? 'origin' : 'label';
  return /^(zich )?[a-zà-ÿ'…]/i.test(russian) ? 'example' : 'rule';
}

/** A translated item takes the kind of its Russian twin when the items line up; one with no twin is labelled or a rule. */
function kindsOf(card: DeckCard, note: string): NoteKind[] {
  const own = noteLines(card.n ?? '').length;
  const russian = twinItems(card, own);
  return noteLines(note).map(({ text }, i) => {
    if (i >= own) return 'example';
    if (russian.length) return noteKind(russian[i]!.text);
    return /[а-яё]/i.test(text) ? noteKind(text) : /^[^:()]{1,30}:\s/.test(text) ? 'label' : 'rule';
  });
}

/** A note item's opening words, set apart in show: a label before its colon, an example's Dutch before its gloss. */
export function noteHead(text: string, kind: NoteKind): string | undefined {
  if (kind === 'rule') return undefined;
  const end = kind === 'example' ? text.search(/ \(|: | [—-] /) : text.indexOf(': ');
  return end < 0 ? kind === 'example' ? text : undefined : text.slice(0, end);
}
