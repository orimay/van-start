import type { StudyCard } from '@/utils/deck';

const PLAIN = 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900';
// One lightness and chroma for every kind, only the hue tells them apart; a dark card shows its hue mostly in the border.
const TINT: Record<NonNullable<StudyCard['part']>, string> = {
  affix: 'border-[oklch(0.78_0.1_300)] bg-[oklch(0.982_0.024_300)] dark:border-[oklch(0.6_0.1_300)] dark:bg-[oklch(0.25_0.035_300)]',
  noun: 'border-[oklch(0.78_0.1_250)] bg-[oklch(0.982_0.024_250)] dark:border-[oklch(0.6_0.1_250)] dark:bg-[oklch(0.25_0.035_250)]',
  verb: 'border-[oklch(0.78_0.1_85)] bg-[oklch(0.982_0.024_85)] dark:border-[oklch(0.6_0.1_85)] dark:bg-[oklch(0.25_0.035_85)]',
  letter: 'border-[oklch(0.78_0.1_150)] bg-[oklch(0.982_0.024_150)] dark:border-[oklch(0.6_0.1_150)] dark:bg-[oklch(0.25_0.035_150)]',
  sentence: 'border-[oklch(0.78_0.1_200)] bg-[oklch(0.982_0.024_200)] dark:border-[oklch(0.6_0.1_200)] dark:bg-[oklch(0.25_0.035_200)]',
};

/** A card's border and background: one spelling as an affix, a noun or a verb looks apart (op-, de boeken, boeken), and so do a letter and a sentence. */
export const surfaceOf = (card: StudyCard) => (card.part ? TINT[card.part] : PLAIN);
