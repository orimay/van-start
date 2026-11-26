// Lists links a card's note is missing, less the reviewed hits; run from the repo root: `node --experimental-strip-types scripts/audit-links.ts [--json]`.
// unresolved: an origin part (`от: a + b`) that names a card yet does not link to it.
// unlinked: a word split into cards (`kletsnat` = `klets` + `nat`, `zelfstandig` = ... + `-ig`) whose note links none of them.
import { readFileSync } from 'node:fs';
import { buildIndex, linkSegments } from '../app/utils/links.ts';
import type { DeckCard, DeckNode } from '../app/utils/deck.ts';

const flat = (node: DeckNode): DeckCard[] => [...(node.cards ?? []), ...(node.children ?? []).flatMap(flat)];
export const cards = flat(JSON.parse(readFileSync('public/deck.json', 'utf8')));
const index = buildIndex(cards);

const bare = (b: string) => b.replace(/^(de|het) /, '').toLowerCase();
const bySide = new Map(cards.map(c => [bare(c.b), c]));
const nouns = new Set(cards.filter(c => /^(de|het) /.test(c.b)).map(c => bare(c.b)));
/** A part with an article names only a noun card, as the linker reads it. */
const namesCard = (part: string) => (/^(de|het) /.test(part) ? nouns : bySide).has(bare(part));
const items = (card: DeckCard) => (card.n ?? '').split('\n').flatMap(line => line.replace(/^!/, '').split('; '));
const linksOf = (card: DeckCard) => new Set(items(card).flatMap(item => linkSegments(item, index, card.id)).flatMap(s => (s.link ? [s.link] : [])));
/** Links both ways, so a plural reaches its singular's parts through it. */
const graph = new Map<string, Set<string>>();
for (const card of cards)
  for (const link of linksOf(card)) {
    graph.set(card.id, (graph.get(card.id) ?? new Set()).add(link));
    graph.set(link, (graph.get(link) ?? new Set()).add(card.id));
  }
/** Labels naming the word a card is a form of: a plural, a comparative, an imperative. */
const FORM = /^(мн\. ч\.|форма|форма «сделанный»|просьба\/приказ,|превосходная степень|сравнительная степень|прошедшее \([^()]*\)) от: /;
/** The word a form card is a form of. */
const headOf = new Map<string, string>();
for (const card of cards) {
  const item = items(card).find(i => FORM.test(i));
  const link = item && linkSegments(item, index, card.id).find(s => s.link)?.link;
  if (link) headOf.set(card.id, link);
}
/** A word and its affix, `in` and `in-`, `lijk` and `-lijk`, count as one. */
const affixOf = new Map<string, string>();
for (const card of cards) {
  const word = card.b.replace(/^-|-$/g, '');
  if (word !== card.b && bySide.has(word)) {
    affixOf.set(card.id, bySide.get(word)!.id);
    affixOf.set(bySide.get(word)!.id, card.id);
  }
}
const head = (id: string) => headOf.get(id) ?? id;
/** Cards spelled alike, `leven` and `het leven`: linking either links the word. */
const homographs = new Map<string, DeckCard[]>();
for (const card of cards) homographs.set(bare(card.b), [...(homographs.get(bare(card.b)) ?? []), card]);
/** Cards two links away at most. */
const near = (id: string) => new Set([...(graph.get(id) ?? [])].flatMap(n => [n, ...(graph.get(n) ?? [])]));

const words = new Map<string, DeckCard>();
for (const card of cards) {
  const w = bare(card.b);
  if (/^[a-z]{3,}$/.test(w) && !words.has(w)) words.set(w, card);
}
const prefixes = cards.filter(c => /^[a-z]+-$/.test(c.b)).map(c => ({ text: c.b.slice(0, -1), card: c }));
const suffixes = cards.filter(c => /^-[a-z]+$/.test(c.b)).map(c => ({ text: c.b.slice(1), card: c }));

/** Cards a single word is built from: two words (a linking s/e/en between them allowed), or a prefix or suffix and a word. */
function partsOf(word: string): DeckCard[] | undefined {
  for (let i = 3; i <= word.length - 3; i++) {
    const head = word.slice(0, i);
    for (const glue of ['', 's', 'e', 'en']) {
      const tail = word.slice(i + glue.length);
      if (tail.length >= 3 && words.has(head) && words.has(tail) && (glue === '' || !words.has(head + glue)))
        return [words.get(head)!, words.get(tail)!];
    }
  }
  for (const p of prefixes) if (word.startsWith(p.text) && words.has(word.slice(p.text.length))) return [p.card, words.get(word.slice(p.text.length))!];
  for (const s of suffixes) {
    const stem = word.slice(0, -s.text.length);
    if (word.endsWith(s.text) && stem.length >= 3 && words.has(stem)) return [words.get(stem)!, s.card];
  }
}

export function audit() {
  const unresolved: string[] = [];
  const unlinked: string[] = [];
  for (const card of cards) {
    for (const item of items(card)) {
      const origin = FORM.test(item) ? item.replace(FORM, '') : item.match(/^(?:уменьш\. )?от: (.*)$/)?.[1];
      if (!origin) continue;
      const linked = new Set(linkSegments(item, index, card.id).filter(s => s.link).map(s => s.text.trim()));
      for (const part of origin.replace(/\([^()]*(\([^()]*\)[^()]*)*\)/g, '').split(/ \+ | = |, | \/ /).map(p => p.trim()))
        if (namesCard(part) && !linked.has(part)) unresolved.push(`${card.b}: ${part}`);
    }
    const w = bare(card.b);
    if (!/^[a-z]+$/.test(w) || headOf.has(card.id)) continue;
    const parts = partsOf(w);
    const reach = new Set([...near(card.id)].map(head));
    const missing = parts?.filter(p => !(homographs.get(bare(p.b)) ?? [p]).some(h => head(h.id) === card.id || reach.has(head(h.id)) || reach.has(affixOf.get(h.id) ?? '')));
    if (missing?.length) unlinked.push(`${card.b}: ${missing.map(p => p.b).join(' + ')}`);
  }
  return { unresolved, unlinked };
}

/** Unlinked hits checked by hand: false splits (`kamer` is not `kam` + `-er`) and parts the word does not come from. */
export const reviewed: string[] = JSON.parse(readFileSync('scripts/audit-links-reviewed.json', 'utf8'));

if (import.meta.url === `file://${process.argv[1]}`) {
  const { unresolved, unlinked } = audit();
  const result = { unresolved, unlinked: unlinked.filter(hit => !reviewed.includes(hit)) };
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 1));
  else for (const [kind, hits] of Object.entries(result)) console.log(`${kind}: ${hits.length}\n${hits.map(h => `  ${h}`).join('\n')}`);
}
