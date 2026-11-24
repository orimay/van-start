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
  /** Affix cards: the example word's transcription. */
  xt?: string;
  /** A card the learner can switch off: an example sentence or one of a rule-built series. */
  k?: Kind;
}

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
  answerNote?: string;
  promptExample?: string;
  answerExample?: string;
  img?: string;
  /** A prefix or a suffix: its voice is its example word's. */
  affix?: boolean;
  /** An affix's example word transcription: its voice. */
  exampleTr?: string;
  /** An affix's example word broken into its parts. */
  breakdown?: string;
  /** Said by its example word: the affix it stands for, marked in the word. */
  affixShown?: { affix: string; meaning: string };
}

/** A prefix or a suffix with an example word to voice it. */
export const isAffixCard = (card: DeckCard) => isAffix(card.b) && !!card.xb;

export function cardsOf(node: DeckNode): DeckCard[] {
  return [...(node.cards ?? []), ...(node.children ?? []).flatMap(cardsOf)];
}

export function toStudyCard(card: DeckCard): StudyCard {
  const promptNote = [card.n, card.nx].filter(Boolean).join('\n') || undefined;
  const voice = isAffixCard(card) && card.xb ? { affix: true, nl: card.xb, audio: card.axb, exampleTr: card.xt } : { nl: card.b, audio: card.au, nlExample: card.xb, exampleAudio: card.axb };
  return { promptSecret: promptNote ? secretLines(card, promptNote) : undefined, id: card.id, ...voice, prompt: card.f, answer: card.b, tr: card.tr, promptNote, answerNote: card.nb, promptExample: card.xf, answerExample: card.xb, breakdown: card.xl, img: card.img };
}

/** The same card asked the other way round: Dutch shown, native side recalled. */
export function flip(card: StudyCard): StudyCard {
  return { ...card, prompt: card.answer, answer: card.prompt, promptNote: card.answerNote, promptSecret: undefined, answerNote: card.promptNote, promptExample: card.answerExample, answerExample: card.promptExample };
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

/** A translated note item is judged by its Russian twin too, when the items line up. */
function secretLines(card: DeckCard, promptNote: string): boolean[] {
  const own = noteLines(card.n ?? '').length;
  const twin = card.nr ?? card.n ?? '';
  const russian = /[а-яё]/i.test(twin) ? noteLines(twin) : [];
  return noteLines(promptNote).map(({ text }, i) => givesAway(text, card.b) || (i < own && russian.length === own && (namesDutch(russian[i]!.text) || givesAway(russian[i]!.text, card.b))));
}
