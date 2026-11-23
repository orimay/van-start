export interface Pending {
  /** Cards it shows: 1, or a match's cards. */
  size: number;
  rung?: number;
  missedAt?: number;
  spacing?: number;
}

/** Shows until the game ends if every answer from now on is right; the first item is the one on screen. Misses left only waiting are carried out, unshown; a card put off comes back. */
export function showsLeft(items: Pending[], { step, ladder, gapAt }: { step: number; ladder: number[]; gapAt: (step: number, rung: number) => number }): number {
  const queue = items.map(i => ({ ...i }));
  const gap = (i: Pending) => i.spacing ?? ladder[0]!;
  let total = 0;
  for (let at = step, first = true; queue.length; at++, first = false) {
    const misses = queue.filter(i => i.missedAt !== undefined).sort((a, b) => a.missedAt! - b.missedAt!);
    const next = first ? queue[0]! : (misses.find(i => at - i.missedAt! >= gap(i)) ?? queue.find(i => i.missedAt === undefined) ?? queue.find(i => i.rung === undefined));
    if (!next) break;
    queue.splice(queue.indexOf(next), 1);
    total += next.size;
    const climbed = next.rung === undefined ? undefined : next.rung + 1;
    if (climbed !== undefined && climbed < ladder.length && queue.length) queue.push({ size: 1, rung: climbed, missedAt: at + 1, spacing: gapAt(at + 1, climbed) });
  }
  return total;
}
