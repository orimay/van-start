import { describe, expect, it, vi } from 'vitest';
import { splitAffix, toStudyCard } from './deck';
import { play } from './play';
import { speak } from './speak';

vi.mock('./play', async importOriginal => ({ ...(await importOriginal<typeof import('./play')>()), play: vi.fn() }));

describe('the affix part of a word', () => {
  it('counts letters only, past brackets and stress', () => {
    expect(splitAffix('sáamu(n)vurkuh(n)', 6, true)).toEqual(['', 'sáamu(n)', 'vurkuh(n)']);
  });

  it('counts a suffix by letters only', () => {
    expect(splitAffix('bewóne(n)', 2, false)).toEqual(['bewón', 'e(n)', '']);
  });
});

describe('an affix card', () => {
  const affix = toStudyCard({ id: 'be', f: 'acting on someone', b: 'be-', tr: 'bu', au: 'be-clip', xb: 'bewonen', xt: 'buvónun', xf: 'to inhabit', axb: 'bewonen-clip' });

  it('is transcribed by its example word, its own transcription kept to mark it', () => {
    expect([affix.tr, affix.affix]).toEqual(['buvónun', { dutch: 'be-', tr: 'bu' }]);
  });

  it('shows the affix with its example word', () => {
    expect([affix.answer, affix.answerExample]).toEqual(['be-', 'bewonen']);
  });

  it('voices its example word, never the affix', () => {
    speak(affix);
    expect(vi.mocked(play).mock.calls.map(([url]) => url.split('/').at(-1))).toEqual(['bewonen-clip.mp3']);
  });
});
