export type Answer = 'plus' | 'minus' | 'guessed' | 'postpone';
export type Source = 'ladder' | 'new';

const FIRST_STEP = 4;
const STEP_FACTOR = 4;
const MIN_RUNGS = 4;

/** Gaps of the ladder: from four up to the session size, at least four rungs where the size allows. */
export function ladder(n: number): number[] {
  if (n <= FIRST_STEP) return [FIRST_STEP];
  if (n < FIRST_STEP * MIN_RUNGS) {
    const steps: number[] = [];
    for (let s = FIRST_STEP; s < n; s += FIRST_STEP) steps.push(s);
    return [...steps, n];
  }
  const rungs = Math.max(MIN_RUNGS, Math.round(Math.log(n / FIRST_STEP) / Math.log(STEP_FACTOR)) + 1);
  const factor = (n / FIRST_STEP) ** (1 / (rungs - 1));
  return Array.from({ length: rungs }, (_, i) => Math.round(FIRST_STEP * factor ** i));
}
