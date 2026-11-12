import { describe, expect, it, vi } from 'vitest';
import { preloadClips } from './preload';

describe('preloading a lesson', () => {
  it('fetches every word clip before any example clip', async () => {
    const fetched: string[] = [];
    const fetcher = vi.fn(async (url: string) => void fetched.push(url));
    await preloadClips([{ audio: 'w1', exampleAudio: 'e1' }, { audio: 'w2', exampleAudio: 'e2' }, { audio: 'w1' }], 'base/', fetcher);
    expect(fetched).toEqual(['base/w1.mp3', 'base/w2.mp3', 'base/e1.mp3', 'base/e2.mp3']);
  });

  it('goes on past a clip that fails', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('w1')) throw new Error('offline');
    });
    await preloadClips([{ audio: 'w1' }, { audio: 'w2' }], '', fetcher);
    expect(fetcher).toHaveBeenLastCalledWith('w2.mp3');
  });
});
