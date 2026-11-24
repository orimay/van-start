import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Card { b: string; xb?: string; au?: string; axb?: string }
interface Node { cards?: Card[]; children?: Node[] }
const deck: Node = JSON.parse(readFileSync('public/deck.json', 'utf8'));
const cardsOf = (n: Node): Card[] => [...(n.cards ?? []), ...(n.children ?? []).flatMap(cardsOf)];

/** As scripts/build-audio.py names a clip: the voice and the spoken text, hashed. */
const RESPELLED: Record<string, string> = { garages: 'garaazjes', maandelijks: 'maandeluks' };
const spoken = (text: string) => text.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().replace(/\b(garages|maandelijks)\b/gi, w => RESPELLED[w.toLowerCase()]!);
const clipOf = (text: string) => createHash('sha1').update(`nl-NL-FennaNeural|${spoken(text)}`).digest('hex').slice(0, 16);

describe('every card', () => {
  it('plays the clip of its own word', () => {
    const wrong = cardsOf(deck).filter(c => c.au !== clipOf(c.b)).map(c => c.b);
    expect(wrong).toEqual([]);
  });

  it('plays the clip of its own example', () => {
    const wrong = cardsOf(deck).filter(c => c.xb && c.axb !== clipOf(c.xb)).map(c => `${c.b}: ${c.xb}`);
    expect(wrong).toEqual([]);
  });
});
