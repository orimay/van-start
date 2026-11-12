/** Warms the service worker's audio cache for a lesson: every word first, then the examples, one at a time. */
export async function preloadClips(cards: { audio?: string; exampleAudio?: string }[], base: string, fetcher: (url: string) => Promise<unknown> = fetch) {
  const clips = new Set([...cards.map(c => c.audio), ...cards.map(c => c.exampleAudio)].filter(Boolean));
  for (const clip of clips) await fetcher(`${base}${clip}.mp3`).catch(() => undefined);
}
