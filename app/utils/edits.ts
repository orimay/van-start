import type { CardInput } from './custom';
import type { DeckCard, DeckNode } from './deck';

/** The learner's changes to the course, laid over it on every load. */
export interface Edits {
  names: Record<string, string>;
  cards: Record<string, CardInput>;
  added: Record<string, DeckCard[]>;
  /** Cards and sections taken out of the course. */
  removed: string[];
}

export function noEdits(): Edits {
  return { names: {}, cards: {}, added: {}, removed: [] };
}

function clean(input: CardInput): CardInput {
  return Object.fromEntries(
    Object.entries(input)
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      .filter(([, v]) => v !== '' && v !== undefined),
  ) as CardInput;
}

/** Clips were once named in hex; they now carry the same digits as the letters a-p. */
function renamed(card: CardInput): CardInput {
  const letters = (clip: string) => (/^[0-9a-f]{16}$/.test(clip) && /\d/.test(clip) ? clip.replace(/./g, d => 'abcdefghijklmnop'[parseInt(d, 16)]!) : clip);
  return { ...card, ...(card.au ? { au: letters(card.au) } : {}), ...(card.axb ? { axb: letters(card.axb) } : {}) };
}

export function applyEdits(node: DeckNode, edits: Edits): DeckNode {
  const cards = [...(node.cards ?? []), ...(edits.added[node.id] ?? [])]
    .filter(c => !edits.removed.includes(c.id))
    .map(c => {
      const edited = edits.cards[c.id];
      return edited ? { id: c.id, ...renamed(edited) } : c;
    });
  return {
    ...node,
    name: edits.names[node.id] ?? node.name,
    ...(node.cards || edits.added[node.id] ? { cards } : {}),
    ...(node.children ? { children: node.children.filter(c => !edits.removed.includes(c.id)).map(c => applyEdits(c, edits)) } : {}),
  };
}

export function renameCourse(edits: Edits, id: string, name: string): Edits {
  return { ...edits, names: { ...edits.names, [id]: name.trim() } };
}

export function addCourseCard(edits: Edits, sectionId: string, input: CardInput): Edits {
  const card = { id: crypto.randomUUID(), ...clean(input) };
  return { ...edits, added: { ...edits.added, [sectionId]: [...(edits.added[sectionId] ?? []), card] } };
}

/** A changed Dutch side or example drops the voice clip recorded for the old one. */
export function editCourseCard(edits: Edits, original: DeckCard, input: CardInput): Edits {
  const { id, ...was } = original;
  const next = clean({ ...was, ...input });
  if (next.b !== was.b) delete next.au;
  if (next.xb !== was.xb) delete next.axb;
  return { ...edits, cards: { ...edits.cards, [id]: next } };
}

/** Takes a card or a whole section out of the course. */
export function removeFromCourse(edits: Edits, id: string): Edits {
  return { ...edits, removed: [...edits.removed, id] };
}
