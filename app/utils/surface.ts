import type { StudyCard } from '@/utils/deck';

const PLAIN = 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900';
const TINT: Record<NonNullable<StudyCard['part']>, string> = {
  affix: 'border-violet-300 bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50',
  noun: 'border-sky-300 bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50',
  verb: 'border-amber-300 bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50',
};

/** A card's border and background: one spelling as an affix, a noun or a verb looks apart (op-, de boeken, boeken). */
export const surfaceOf = (card: StudyCard) => (card.part ? TINT[card.part] : PLAIN);
