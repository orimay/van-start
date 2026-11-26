/** A stretch of a group's words one game passed, as fractions of the group. */
export interface Run { from: number; to: number }

/**
 * Per game, the stretches of words it passed. Every game lines the words up the same way: by their passes,
 * game 1 first, a pass before a gap, so passes sit as far left as they go; words no game passed come last.
 * Words with the same passes share one span, so the runs stay few however large the group.
 */
export function passRuns(words: boolean[][], games = words[0]?.length ?? 0): Run[][] {
  const counts = new Map<string, number>();
  for (const passes of words) {
    const key = passes.map(p => (p ? '1' : '0')).join('');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const none = '0'.repeat(games);
  const keys = [...counts.keys()].sort((a, b) => Number(a === none) - Number(b === none) || b.localeCompare(a));
  const runs: Run[][] = Array.from({ length: games }, () => []);
  let at = 0;
  for (const key of keys) {
    const to = at + counts.get(key)! / words.length;
    runs.forEach((game, g) => {
      if (key[g] !== '1') return;
      const last = game.at(-1);
      if (last?.to === at) last.to = to;
      else game.push({ from: at, to });
    });
    at = to;
  }
  return runs;
}
