import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from './useStore';

const overlay = (lang: string) => JSON.parse(readFileSync(`public/lang/${lang}.json`, 'utf8')) as { names: Record<string, string>; cards: Record<string, string[]> };
const english = overlay('en');

describe('the native languages', () => {
  it('offer Romanian', () => {
    expect(LANGUAGES).toHaveProperty('ro', 'Română');
  });

  it.each(Object.keys(LANGUAGES).filter(l => l !== 'ru'))('%s names every section and card', lang => {
    const { names, cards } = overlay(lang);
    expect(Object.keys(names).sort()).toEqual(Object.keys(english.names).sort());
    expect(Object.keys(cards).sort()).toEqual(Object.keys(english.cards).sort());
  });
});
