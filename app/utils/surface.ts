import type { StudyCard } from '@/utils/deck';

const PLAIN = 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900';
// One lightness and chroma for every kind, only the hue tells them apart.
const TINT: Record<NonNullable<StudyCard['part']>, string> = {
  affix: 'border-[oklch(0.87_0.06_300)] bg-[oklch(0.96_0.03_300)] dark:border-[oklch(0.42_0.06_300)] dark:bg-[oklch(0.27_0.04_300)]',
  noun: 'border-[oklch(0.87_0.06_240)] bg-[oklch(0.96_0.03_240)] dark:border-[oklch(0.42_0.06_240)] dark:bg-[oklch(0.27_0.04_240)]',
  verb: 'border-[oklch(0.87_0.06_95)] bg-[oklch(0.96_0.03_95)] dark:border-[oklch(0.42_0.06_95)] dark:bg-[oklch(0.27_0.04_95)]',
  letter: 'border-[oklch(0.87_0.06_150)] bg-[oklch(0.96_0.03_150)] dark:border-[oklch(0.42_0.06_150)] dark:bg-[oklch(0.27_0.04_150)]',
  sentence: 'border-[oklch(0.87_0.06_195)] bg-[oklch(0.96_0.03_195)] dark:border-[oklch(0.42_0.06_195)] dark:bg-[oklch(0.27_0.04_195)]',
};

/** A card's border and background: one spelling as an affix, a noun or a verb looks apart (op-, de boeken, boeken), and so do a letter and a sentence. */
export const surfaceOf = (card: StudyCard) => (card.part ? TINT[card.part] : PLAIN);
