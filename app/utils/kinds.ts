import { cardsOf, type DeckNode } from './deck';

export const KINDS = ['sentence', 'combination'] as const;
/** Cards that can be switched off: example sentences, and rule-built series. */
export type Kind = (typeof KINDS)[number];
/** On or off per kind; a kind left out is on, or for a group, as its parents say. */
export type KindSwitches = Partial<Record<Kind, boolean>>;
/** How a group stands on a kind: as its parents, its own switch, or its subgroups disagreeing. */
export type KindState = 'global' | 'on' | 'off' | 'mixed';

/** The deck without the cards whose kind is off where they sit; the nearest group switch beats the global one. */
export function shownCards(node: DeckNode, global: KindSwitches, groups: Record<string, KindSwitches>, inherited: KindSwitches = global): DeckNode {
  const on = { ...inherited, ...groups[node.id] };
  const cards = node.cards?.filter(c => !c.k || c.k === 'sound' || on[c.k] !== false);
  const children = node.children?.map(child => shownCards(child, global, groups, on));
  return { ...node, ...(cards && { cards }), ...(children && { children }) };
}

function pathTo(node: DeckNode, id: string): DeckNode[] | undefined {
  if (node.id === id) return [node];
  for (const child of node.children ?? []) {
    const path = pathTo(child, id);
    if (path) return [node, ...path];
  }
  return undefined;
}

const ownSwitches = (node: DeckNode, kind: Kind, groups: Record<string, KindSwitches>): boolean[] =>
  (node.children ?? []).flatMap(child => [groups[child.id]?.[kind], ...ownSwitches(child, kind, groups)].filter(v => v !== undefined));

export function kindState(root: DeckNode, id: string, kind: Kind, global: KindSwitches, groups: Record<string, KindSwitches>): KindState {
  const path = pathTo(root, id) ?? [];
  const group = path.at(-1);
  const own = group && groups[group.id]?.[kind];
  const on = path.reduce((value, n) => groups[n.id]?.[kind] ?? value, global[kind] ?? true);
  if (group && ownSwitches(group, kind, groups).some(v => v !== on)) return 'mixed';
  return own === undefined ? 'global' : own ? 'on' : 'off';
}

/** What the group gets from its parents and the global switch, its own left aside. */
export function inheritedKind(root: DeckNode, id: string, kind: Kind, global: KindSwitches, groups: Record<string, KindSwitches>): boolean {
  return (pathTo(root, id) ?? []).slice(0, -1).reduce((value, n) => groups[n.id]?.[kind] ?? value, global[kind] ?? true);
}

/** The kinds the group's cards, its subgroups' too, come in. */
export const kindsIn = (node: DeckNode) => KINDS.filter(kind => cardsOf(node).some(c => c.k === kind));

const descendants = (node: DeckNode): DeckNode[] => (node.children ?? []).flatMap(child => [child, ...descendants(child)]);

/** Drops the kind from a group's switches, and the group once it has none left. */
function without(groups: Record<string, KindSwitches>, id: string, kind: Kind) {
  const { [kind]: _, ...rest } = groups[id] ?? {};
  const { [id]: __, ...others } = groups;
  return Object.keys(rest).length ? { ...others, [id]: rest } : others;
}

/** The group's own switch set, `undefined` for as its parents say; its subgroups follow it from then on. */
export function withGroupKind(root: DeckNode, id: string, kind: Kind, value: boolean | undefined, groups: Record<string, KindSwitches>): Record<string, KindSwitches> {
  const group = pathTo(root, id)?.at(-1);
  const cleared = [group, ...(group ? descendants(group) : [])].reduce((all, n) => (n ? without(all, n.id, kind) : all), groups);
  return value === undefined ? cleared : { ...cleared, [id]: { ...cleared[id], [kind]: value } };
}

/** Subgroups whose own switch the group's new value `to` replaces. */
export function overridden(root: DeckNode, id: string, kind: Kind, to: boolean, groups: Record<string, KindSwitches>) {
  const group = pathTo(root, id)?.at(-1);
  return (group ? descendants(group) : []).flatMap(n => {
    const from = groups[n.id]?.[kind];
    return from === undefined || from === to ? [] : [{ name: n.name, from, to }];
  });
}
