import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Answer from './Answer.vue';
import Prompt from './Prompt.vue';
import { flip, toStudyCard, type DeckCard } from '@/utils/deck';
import { lowContrastIn } from '../../tests/contrast';

const palette = readFileSync('node_modules/tailwindcss/theme.css', 'utf8');

const CARDS: Record<string, DeckCard> = {
  'a plain': { id: 'hallo', f: 'привет', b: 'hallo', tr: 'хАло', xf: 'Привет, Анна!', xb: 'Hallo, Anna!' },
  'a noun': { id: 'kennis', f: 'знакомый', b: 'de kennis', p: 'noun', tr: 'дэ кЕнис', n: 'тот, кого знаешь', xf: 'Он знакомый.', xb: 'Hij is een kennis.' },
  'a verb': { id: 'kennen', f: 'знать', b: 'kennen', p: 'verb', tr: 'кЕнэ(н)', n: 'быть знакомым', xf: 'Я знаю его.', xb: 'Ik ken hem.' },
  'a letter': { id: 'n', f: 'эн (буква)', b: 'n', n: 'буква', tr: 'эн' },
  'a sentence': { id: 'zin', f: 'Как дела?', b: 'Hoe gaat het?', k: 'sentence', tr: 'ху хаат эт' },
  'a two-part': { id: 'vroeg', f: 'рано; ранний', b: 'vroeg', p: 'adverb', ps: ['adverb', 'adjective'], tr: 'врух', xf: 'Я встаю рано.', xb: 'Ik sta vroeg op.' },
  'an adjective': { id: 'mooi', f: 'красивый', b: 'mooi', p: 'adjective', tr: 'мой', n: 'о виде' },
  'a phrase': { id: 'kwart', f: 'четверть десятого', b: 'kwart over negen', p: 'phrase', tr: 'кварт овэр нЕхэ' },
  'an affix': { id: 'nis', f: 'результат, состояние', b: '-nis', tr: 'нис', xb: 'de kennis', xt: 'дэ кЕнис', xf: 'знакомый' },
} as Record<string, DeckCard>;

const PAGE = { light: '#fafaf9', dark: '#1c1917' };

// Every text on a card, in every kind and on either side, right or wrong, reads at WCAG AA.
describe.each(Object.keys(CARDS))('%s card', (kind) => {
  const sides = { native: toStudyCard(CARDS[kind]!), Dutch: flip(toStudyCard(CARDS[kind]!)) };

  describe.each(['light', 'dark'] as const)('in the %s theme', (theme) => {
    it.each(Object.keys(sides) as Array<keyof typeof sides>)('reads at AA on the %s prompt', async (side) => {
      const w = await mountSuspended(Prompt, { props: { card: sides[side] } });
      expect(lowContrastIn(w.element, theme === 'dark', palette, PAGE[theme])).toEqual([]);
    });

    it.each([...(Object.keys(sides) as Array<keyof typeof sides>).flatMap(side => [[side, true], [side, false]] as const)])('reads at AA on the %s answer, right %s', async (side, right) => {
      const w = await mountSuspended(Answer, { props: { card: sides[side], silent: true, right } });
      expect(lowContrastIn(w.element, theme === 'dark', palette, PAGE[theme])).toEqual([]);
    });
  });
});
