import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Node { cards?: { b: string; xb?: string; au?: string; axb?: string }[]; children?: Node[] }
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): NonNullable<Node['cards']> => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];
const clipOf = (text: string) => createHash('sha1').update(`nl-NL-FennaNeural|${text}`).digest('hex').slice(0, 16).replace(/./g, d => 'abcdefghijklmnop'[parseInt(d, 16)]!);

/** Words the voice gets wrong, as scripts/build-audio.py respells them. */
const RESPELLED = { garages: 'garaazjes', maandelijks: 'maandeluks' };

describe('a respelled word', () => {
  for (const [word, said] of Object.entries(RESPELLED)) {
    it(`is voiced as ${said} wherever ${word} is`, () => {
      const voiced = cardsOf(deck).flatMap(c => [[c.b, c.au], [c.xb, c.axb]]).filter(([text]) => text && new RegExp(`\\b${word}\\b`, 'i').test(text));
      expect(voiced.length).toBeGreaterThan(0);
      for (const [text, clip] of voiced) expect(clip, text).toBe(clipOf(text!.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().replace(new RegExp(`\\b${word}\\b`, 'gi'), said)));
    });
  }
});
