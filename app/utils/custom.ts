import type { DeckCard, DeckNode } from './deck';
import { cardsOf } from './deck';

// A uuid: Lexilize keys decks by uuid.
export const CUSTOM_ID = '6d1f3c2e-8a4b-4f7e-9c5d-0b2a7e1f4c93';

export type CardInput = Omit<DeckCard, 'id'>;

export function emptyCustom(name = 'My cards'): DeckNode {
  return { id: CUSTOM_ID, name, children: [] };
}

export function findSection(root: DeckNode, id: string): DeckNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findSection(child, id);
    if (found) return found;
  }
  return undefined;
}

export function cardIdsOf(node: DeckNode): string[] {
  return cardsOf(node).map(c => c.id);
}

function mapNodes(node: DeckNode, fn: (n: DeckNode) => DeckNode): DeckNode {
  const mapped = fn(node);
  return mapped.children ? { ...mapped, children: mapped.children.map(c => mapNodes(c, fn)) } : mapped;
}

function clean(input: CardInput): CardInput {
  return Object.fromEntries(
    Object.entries(input)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v !== '' && v !== undefined),
  ) as CardInput;
}

export function addSection(root: DeckNode, parentId: string | undefined, name: string): [DeckNode, string] {
  const id = crypto.randomUUID();
  const target = parentId ?? root.id;
  const next = mapNodes(root, n => (n.id === target ? { ...n, children: [...(n.children ?? []), { id, name: name.trim(), children: [] }] } : n));
  return [next, id];
}

export function renameSection(root: DeckNode, id: string, name: string): DeckNode {
  return mapNodes(root, n => (n.id === id ? { ...n, name: name.trim() } : n));
}

export function removeSection(root: DeckNode, id: string): [DeckNode, string[]] {
  const section = findSection(root, id);
  if (!section || id === root.id) return [root, []];
  const next = mapNodes(root, n => (n.children ? { ...n, children: n.children.filter(c => c.id !== id) } : n));
  return [next, cardIdsOf(section)];
}

export function addCard(root: DeckNode, sectionId: string, input: CardInput): [DeckNode, string] {
  const id = crypto.randomUUID();
  const next = mapNodes(root, n => (n.id === sectionId ? { ...n, cards: [...(n.cards ?? []), { id, ...clean(input) }] } : n));
  return [next, id];
}

export function updateCard(root: DeckNode, id: string, input: CardInput): DeckNode {
  return mapNodes(root, n =>
    n.cards?.some(c => c.id === id) ? { ...n, cards: n.cards.map(c => (c.id === id ? { id, ...clean(input) } : c)) } : n,
  );
}

export function removeCard(root: DeckNode, id: string): DeckNode {
  return mapNodes(root, n => (n.cards?.some(c => c.id === id) ? { ...n, cards: n.cards.filter(c => c.id !== id) } : n));
}
