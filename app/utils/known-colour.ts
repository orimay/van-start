const RED_HUE = 25;
const GREEN_HUE = 145;

/** Right answers it takes to make up for one miss. */
const FIXES_PER_MISS = 4;

/** A colour from red for a card missed and not made up for to green for one never missed; only the hue moves, so lightness stays even. */
export function knownColour(right: number, wrong: number): string {
  const share = wrong ? right / (right + wrong * FIXES_PER_MISS) : 1;
  return `oklch(0.65 0.17 ${(RED_HUE + (GREEN_HUE - RED_HUE) * share).toFixed(1)})`;
}
