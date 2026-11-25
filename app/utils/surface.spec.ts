import { describe, expect, it } from 'vitest';
import { type StudyCard, toStudyCard } from '@/utils/deck';
import { surfaceOf } from '@/utils/surface';

const PARTS: Array<NonNullable<StudyCard['part']>> = ['affix', 'noun', 'verb', 'letter', 'sentence'];
const SLOTS = ['border', 'bg', 'dark:border', 'dark:bg'];
const colourOf = (part: StudyCard['part'], slot: string) => {
  const found = surfaceOf({ part } as StudyCard).split(' ').find(c => c.startsWith(`${slot}-[oklch(`));
  const [l, c, h] = found!.slice(`${slot}-[oklch(`.length, -2).split('_').map(Number);
  return { l, c, h: h! };
};

describe('a kind tint', () => {
  it.each(SLOTS)('differs from the other kinds only in hue for %s', (slot) => {
    const tints = PARTS.map(part => colourOf(part, slot));
    expect(new Set(tints.map(({ l, c }) => `${l} ${c}`)).size).toBe(1);
    expect(new Set(tints.map(t => t.h)).size).toBe(PARTS.length);
  });

  it.each(SLOTS)('keeps its hue well apart from every other kind for %s', (slot) => {
    const hues = PARTS.map(part => colourOf(part, slot).h).sort((a, b) => a - b);
    expect(Math.min(...hues.slice(1).map((h, i) => h - hues[i]!))).toBeGreaterThanOrEqual(40);
  });

  // Red reads as a mistake.
  it.each(PARTS)('is not red for %s', (part) => {
    expect(SLOTS.map(slot => colourOf(part, slot).h).filter(h => h < 70 || h > 330)).toEqual([]);
  });
});

describe('a card', () => {
  const plain = surfaceOf(toStudyCard({ id: 'hallo', f: 'привет', b: 'hallo' }));
  const surfaces = {
    letter: surfaceOf(toStudyCard({ id: 'n', f: 'эн (буква)', b: 'n', n: 'буква' })),
    sentence: surfaceOf(toStudyCard({ id: 'zin', f: 'Как дела?', b: 'Hoe gaat het?', k: 'sentence' })),
    noun: surfaceOf(toStudyCard({ id: 'huis', f: 'дом', b: 'het huis', p: 'noun' })),
    verb: surfaceOf(toStudyCard({ id: 'gaan', f: 'идти', b: 'gaan', p: 'verb' })),
    affix: surfaceOf(toStudyCard({ id: 'be', f: 'действие на', b: 'be-', xb: 'bewonen' })),
  };

  it.each(['letter', 'sentence'] as const)('is tinted apart from every other kind as a %s', (kind) => {
    expect(Object.entries(surfaces).filter(([other, s]) => other !== kind && s === surfaces[kind]).map(([other]) => other)).toEqual([]);
    expect(surfaces[kind]).not.toBe(plain);
  });
});
