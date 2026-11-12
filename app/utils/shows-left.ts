export interface Pending {
  /** Cards it shows: 1, or a match's cards. */
  size: number;
  rung?: number;
  missedAt?: number;
  spacing?: number;
}

/** Shows until the game ends if every answer from now on is right, fillers included; the first item is the one on screen. `fillers`: shown cards outside the queue; each card done for good joins them. */
export function showsLeft(items: Pending[], { step, ladder, fillers: available, gapAt }: { step: number; ladder: number[]; fillers: number; gapAt: (step: number, rung: number) => number }): number {
  const queue = items.map(i => ({ ...i }));
  let fillers = available;
  const gap = (i: Pending) => i.spacing ?? ladder[0]!;
  let total = 0;
  for (let at = step, first = true; queue.length; at++, first = false) {
    const misses = queue.filter(i => i.missedAt !== undefined).sort((a, b) => a.missedAt! - b.missedAt!);
    const next = first ? queue[0]! : (misses.find(i => at - i.missedAt! >= gap(i)) ?? queue.find(i => i.missedAt === undefined) ?? misses.find(i => at - i.missedAt! >= Math.min(gap(i), fillers)));
    if (!next) {
      total++;
      continue;
    }
    queue.splice(queue.indexOf(next), 1);
    total += next.size;
    const climbed = next.rung === undefined ? undefined : next.rung + 1;
    if (climbed !== undefined && climbed < ladder.length && (queue.length || fillers)) queue.push({ size: 1, rung: climbed, missedAt: at + 1, spacing: gapAt(at + 1, climbed) });
    else fillers += next.size;
  }
  return total;
}
