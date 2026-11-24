import { describe, expect, it, vi } from 'vitest';
import { toStudyCard } from './deck';
import { play } from './play';
import { speak } from './speak';

vi.mock('./play', async importOriginal => ({ ...(await importOriginal<typeof import('./play')>()), play: vi.fn() }));

describe('an affix card', () => {
  const affix = toStudyCard({ id: 'be', f: 'acting on someone', b: 'be-', tr: 'bu', au: 'be-clip', xb: 'bewonen', xt: 'buvónun', xf: 'to inhabit', axb: 'bewonen-clip' });

  it('carries its example word transcription', () => {
    expect(affix.exampleTr).toBe('buvónun');
  });

  it('shows the affix with its example word', () => {
    expect([affix.answer, affix.answerExample]).toEqual(['be-', 'bewonen']);
  });

  it('voices its example word, never the affix', () => {
    speak(affix);
    expect(vi.mocked(play).mock.calls.map(([url]) => url.split('/').at(-1))).toEqual(['bewonen-clip.mp3']);
  });
});
