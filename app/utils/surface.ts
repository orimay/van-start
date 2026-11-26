import type { StudyCard } from '@/utils/deck';

type Kind = NonNullable<StudyCard['part']>;

const PLAIN = 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900';
// One lightness and chroma for every kind, only the hue tells them apart, ~21° apart across 70-320 (red reads as a mistake); a dark card shows its hue mostly in the border.
// Adverb and adjective, the commonest pair on one word (vroeg: рано; ранний), sit at the two ends.
const TINT: Record<Kind, string> = {
  interjection: 'border-[oklch(0.78_0.1_70)] bg-[oklch(0.982_0.024_70)] dark:border-[oklch(0.6_0.1_70)] dark:bg-[oklch(0.25_0.035_70)]',
  verb: 'border-[oklch(0.78_0.1_91)] bg-[oklch(0.982_0.024_91)] dark:border-[oklch(0.6_0.1_91)] dark:bg-[oklch(0.25_0.035_91)]',
  numeral: 'border-[oklch(0.78_0.1_112)] bg-[oklch(0.982_0.024_112)] dark:border-[oklch(0.6_0.1_112)] dark:bg-[oklch(0.25_0.035_112)]',
  adjective: 'border-[oklch(0.78_0.1_132)] bg-[oklch(0.982_0.024_132)] dark:border-[oklch(0.6_0.1_132)] dark:bg-[oklch(0.25_0.035_132)]',
  letter: 'border-[oklch(0.78_0.1_153)] bg-[oklch(0.982_0.024_153)] dark:border-[oklch(0.6_0.1_153)] dark:bg-[oklch(0.25_0.035_153)]',
  conjunction: 'border-[oklch(0.78_0.1_174)] bg-[oklch(0.982_0.024_174)] dark:border-[oklch(0.6_0.1_174)] dark:bg-[oklch(0.25_0.035_174)]',
  sentence: 'border-[oklch(0.78_0.1_195)] bg-[oklch(0.982_0.024_195)] dark:border-[oklch(0.6_0.1_195)] dark:bg-[oklch(0.25_0.035_195)]',
  preposition: 'border-[oklch(0.78_0.1_216)] bg-[oklch(0.982_0.024_216)] dark:border-[oklch(0.6_0.1_216)] dark:bg-[oklch(0.25_0.035_216)]',
  noun: 'border-[oklch(0.78_0.1_237)] bg-[oklch(0.982_0.024_237)] dark:border-[oklch(0.6_0.1_237)] dark:bg-[oklch(0.25_0.035_237)]',
  phrase: 'border-[oklch(0.78_0.1_258)] bg-[oklch(0.982_0.024_258)] dark:border-[oklch(0.6_0.1_258)] dark:bg-[oklch(0.25_0.035_258)]',
  pronoun: 'border-[oklch(0.78_0.1_278)] bg-[oklch(0.982_0.024_278)] dark:border-[oklch(0.6_0.1_278)] dark:bg-[oklch(0.25_0.035_278)]',
  affix: 'border-[oklch(0.78_0.1_299)] bg-[oklch(0.982_0.024_299)] dark:border-[oklch(0.6_0.1_299)] dark:bg-[oklch(0.25_0.035_299)]',
  adverb: 'border-[oklch(0.78_0.1_320)] bg-[oklch(0.982_0.024_320)] dark:border-[oklch(0.6_0.1_320)] dark:bg-[oklch(0.25_0.035_320)]',
};
/** Text in a kind's hue, at AA on any kind's tint in either theme. */
const SENSE: Record<Kind, string> = {
  interjection: 'text-[oklch(0.5_0.14_70)] dark:text-[oklch(0.78_0.12_70)]',
  verb: 'text-[oklch(0.5_0.14_91)] dark:text-[oklch(0.78_0.12_91)]',
  numeral: 'text-[oklch(0.5_0.14_112)] dark:text-[oklch(0.78_0.12_112)]',
  adjective: 'text-[oklch(0.5_0.14_132)] dark:text-[oklch(0.78_0.12_132)]',
  letter: 'text-[oklch(0.5_0.14_153)] dark:text-[oklch(0.78_0.12_153)]',
  conjunction: 'text-[oklch(0.5_0.14_174)] dark:text-[oklch(0.78_0.12_174)]',
  sentence: 'text-[oklch(0.5_0.14_195)] dark:text-[oklch(0.78_0.12_195)]',
  preposition: 'text-[oklch(0.5_0.14_216)] dark:text-[oklch(0.78_0.12_216)]',
  noun: 'text-[oklch(0.5_0.14_237)] dark:text-[oklch(0.78_0.12_237)]',
  phrase: 'text-[oklch(0.5_0.14_258)] dark:text-[oklch(0.78_0.12_258)]',
  pronoun: 'text-[oklch(0.5_0.14_278)] dark:text-[oklch(0.78_0.12_278)]',
  affix: 'text-[oklch(0.5_0.14_299)] dark:text-[oklch(0.78_0.12_299)]',
  adverb: 'text-[oklch(0.5_0.14_320)] dark:text-[oklch(0.78_0.12_320)]',
};

/** A card's border and background: each kind looks apart, so one spelling as an affix, a noun or a verb does too (op-, de boeken, boeken). */
export const surfaceOf = (card: StudyCard) => (card.part ? TINT[card.part] : PLAIN);

/** The text colour of a sense of this part. */
export const senseColourOf = (part: Kind) => SENSE[part];
