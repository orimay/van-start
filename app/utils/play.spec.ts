import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { play, playing } from './play';

let audios: FakeAudio[] = [];

class FakeAudio {
  src = '';
  paused = true;
  onended: (() => void) | null = null;
  constructor() {
    audios.push(this);
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

// The player is made once and reused, as on iOS, so the fake stays for the whole file.
beforeAll(() => vi.stubGlobal('Audio', FakeAudio));
afterAll(() => vi.unstubAllGlobals());

describe('a sound', () => {
  it('is known as playing until it ends', () => {
    play('a.mp3', 'card');
    expect(playing.value).toBe('card');
    audios.at(-1)!.onended!();
    expect(playing.value).toBeUndefined();
  });

  it('cuts off the one playing before it', () => {
    play('a.mp3', 'card');
    const first = vi.fn();
    play('b.mp3', 'example', first);
    play('c.mp3', 'mine');
    expect(audios.filter(a => !a.paused).map(a => a.src)).toEqual(['c.mp3']);
    expect(playing.value).toBe('mine');
    expect(first).not.toHaveBeenCalled();
  });

  it('runs what follows once it ends', () => {
    const then = vi.fn();
    play('a.mp3', 'mine', then);
    audios.at(-1)!.onended!();
    expect(then).toHaveBeenCalled();
  });
});
