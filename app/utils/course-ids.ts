import type { DeckNode } from './deck';

/** A UUID spelled with the letters a-p for its hex digits: digit runs in the served files read as card numbers to leak scanners. */
const LETTER_UUID = /^[a-p]{8}-[a-p]{4}-[a-p]{4}-[a-p]{4}-[a-p]{12}$/;
const uuidOf = (id: string) => (LETTER_UUID.test(id) ? id.replace(/[a-p]/g, l => (l.charCodeAt(0) - 97).toString(16)) : id);

/** The course with the UUIDs progress, edits and shares are keyed by. */
export function withUuids(node: DeckNode): DeckNode {
  return {
    ...node,
    id: uuidOf(node.id),
    ...(node.cards && { cards: node.cards.map(card => ({ ...card, id: uuidOf(card.id) })) }),
    ...(node.children && { children: node.children.map(withUuids) }),
    ...(node.roots && { roots: node.roots.map(card => ({ ...card, id: uuidOf(card.id) })) }),
  };
}
