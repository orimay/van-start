/** Cards the learner mixed up, each listing the others; a link goes both ways. */
export type Confusions = Record<string, string[]>;

const adding = (list: string[] | undefined, id: string) => (list?.includes(id) ? list : [...(list ?? []), id]);
function removing(all: Confusions, id: string, other: string): Confusions {
  const rest = all[id]?.filter(x => x !== other) ?? [];
  const { [id]: _, ...others } = all;
  return rest.length ? { ...others, [id]: rest } : others;
}

export const linked = (all: Confusions, a: string, b: string): Confusions =>
  a === b ? all : { ...all, [a]: adding(all[a], b), [b]: adding(all[b], a) };

export const unlinked = (all: Confusions, a: string, b: string): Confusions => removing(removing(all, a, b), b, a);

/** Cards linked directly or through others, each group once, in the order first met. */
export function groupsOf(all: Confusions): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const start of Object.keys(all)) {
    if (seen.has(start)) continue;
    const group = [start];
    seen.add(start);
    for (let i = 0; i < group.length; i++)
      for (const next of all[group[i]!] ?? []) if (!seen.has(next)) seen.add(next), group.push(next);
    groups.push(group.sort());
  }
  return groups;
}

/**
 * The deck with every group its cards belong to taken in whole, each right after its first card.
 * Past `size`, unlinked cards go first, from the end; then the smallest groups, later ones first;
 * a single group still too big keeps its first cards, the deck's own before the ones taken in.
 */
export function withConfusions<T extends { id: string }>(base: T[], candidates: T[], all: Confusions, size: number): T[] {
  const groupOf = new Map(groupsOf(all).flatMap(g => g.map(id => [id, g] as const)));
  const own = new Set(base.map(c => c.id));
  /** Each group of the deck, its own cards first, then the ones taken in, in candidate order. */
  const groups: T[][] = [];
  const taken = new Set<string>();
  /** The deck in order, each group as one block. */
  const blocks: Array<T | T[]> = [];
  for (const card of base) {
    if (taken.has(card.id)) continue;
    const ids = groupOf.get(card.id);
    if (!ids) {
      blocks.push(card);
      continue;
    }
    const members = [...base.filter(c => ids.includes(c.id)), ...candidates.filter(c => ids.includes(c.id) && !own.has(c.id))];
    for (const m of members) taken.add(m.id);
    groups.push(members);
    blocks.push(members);
  }
  const kept = new Set(groups);
  const total = () => [...kept].reduce((n, g) => n + g.length, 0);
  while (total() > size && kept.size > 1) {
    const smallest = [...kept].reduce((min, g) => (g.length <= min.length ? g : min));
    kept.delete(smallest);
  }
  let room = size - Math.min(size, total());
  return blocks.flatMap(block => {
    if (!Array.isArray(block)) return room-- > 0 ? [block] : [];
    return kept.has(block) ? block.slice(0, size) : [];
  });
}
