import type { StudyCard } from '@/utils/deck';

const PLAIN = 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900';
const TINT: Record<NonNullable<StudyCard['part']>, string> = {
  affix: 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950',
  noun: 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950',
  verb: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
};

/** A card's border and background: one spelling as an affix, a noun or a verb looks apart (op-, de boeken, boeken). */
export const surfaceOf = (card: StudyCard) => (card.part ? TINT[card.part] : PLAIN);
