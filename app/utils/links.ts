import type { DeckCard } from './deck';

/** Note labels whose words a card derives from: `от: ver- (…) + kopen (…)`, `уменьш. от: het boek (…)`. */
const ORIGIN = ['от', 'from', 'deriva de', 'kökü', 'de la', 'уменьш. от', 'diminutive of', 'diminutivo de', 'küçültme', 'diminutiv de la'];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const labelsOf = (labels: string[]) => labels.map(escape).join('|');
/**
 * Any label names a card, `женский род от: de genoot`: a label list would miss every new one.
 * It may hold a gloss, `прошедшее (делал) от: …`, but never end on one: `invullen (заполнять): в, внутрь` is an example and its meaning.
 * A gender mark may stand before it: `pl. m. plural de: …`.
 */
const LABEL = /^((?:pl\. )?(?:[mfn]\.(?:\/[mfn]\.)? )?)((?:[^:()]|\([^()]*\)){0,59}?[^:()\s]): /;
const ORIGIN_LABEL = new RegExp(`^(${labelsOf(ORIGIN)})$`);
/** Labels calling a card a form of another: `форма от:`, `прошедшее (сделал) от:`, `просьба/приказ, от:`, `мн. ч. от:`. */
const FORM_LABEL = /^(форма(?: «[^»]*»)?|прошедшее \([^()]*\)|просьба\/приказ,|мн\. ч\.) от$/;

export interface Segment {
  text: string;
  /** Id of the card the text names. */
  link?: string;
  /** The meaning the note gives the named word. */
  gloss?: string;
}

export interface CardIndex {
  byId: Map<string, DeckCard>;
  bySide: Map<string, DeckCard[]>;
  /** Cards whose origin note names the card, with the meaning it gives. */
  derived: Map<string, Array<{ id: string; gloss?: string }>>;
  /** Cards whose other note labels name the card (a plural, a feminine, a word not to confuse it with), less those its own note links. */
  related: Map<string, Array<{ id: string }>>;
}

const key = (dutch: string) => dutch.trim().toLowerCase();
const ARTICLE = /^(de|het) /;

/** Parts of a reference list, split at ` + `, ` = `, `, ` and ` / ` outside the glosses. */
function partsOf(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++;
    else if (list[i] === ')') depth--;
    else if (depth === 0) {
      const separator = [' + ', ' = ', ', ', ' / '].find(s => list.startsWith(s, i));
      if (separator) {
        parts.push(list.slice(from, i), separator);
        i += separator.length - 1;
        from = i + 1;
      }
    }
  }
  return [...parts, list.slice(from)];
}

function resolve(index: CardIndex, dutch: string, gloss: string | undefined, self: string | undefined) {
  const bare = dutch.replace(ARTICLE, '');
  // The spelling as written wins; another article only when no card has it, and none only for an articleless word.
  const candidates = [dutch, ...(bare === dutch ? [bare] : []), `de ${bare}`, `het ${bare}`].map(k => index.bySide.get(key(k))).find(Boolean)?.filter(c => c.id !== self);
  if (!candidates?.length) return undefined;
  const g = gloss?.toLowerCase();
  return (g && candidates.find(c => c.f.toLowerCase().includes(g) || g.includes(c.f.toLowerCase())) || candidates[0]!).id;
}

/** The words of a reference list linked to their cards, glosses and separators as text. */
function linkList(list: string, index: CardIndex, self: string | undefined): Segment[] {
  return partsOf(list).flatMap((part, i) => {
    if (i % 2) return [{ text: part }];
    const [, dutch = part, rest = ''] = part.match(/^([^(]*?)(\s*\(.*)?$/) ?? [];
    const gloss = rest.match(/^\s*\((.*)\)$/)?.[1];
    const link = dutch && resolve(index, dutch, gloss, self);
    return [link ? { text: dutch, link, ...(gloss && { gloss }) } : { text: dutch }, { text: rest }];
  });
}

// Neighbouring text runs merge, so a line reads as plain text between its links.
const merged = (segments: Segment[]) =>
  segments.filter(s => s.text).reduce<Segment[]>((out, s) => {
    const last = out.at(-1);
    if (last && !last.link && !s.link) last.text += s.text;
    else out.push({ ...s });
    return out;
  }, []);

/** A note item, its referenced words linked to their cards. */
export function linkSegments(item: string, index: CardIndex, self?: string): Segment[] {
  const label = item.match(LABEL);
  if (!label) return [{ text: item }];
  return merged([{ text: label[0] }, ...linkList(item.slice(label[0].length), index, self)]);
}

/** A word's breakdown, `ver- (…) + kopen (…): букв. «…»`, its parts linked to their cards. */
export function linkBreakdown(text: string, index: CardIndex, self?: string): Segment[] {
  let depth = 0;
  const end = [...text].findIndex((c, i) => (depth += c === '(' ? 1 : c === ')' ? -1 : 0) === 0 && text.startsWith(': ', i));
  const list = end < 0 ? text : text.slice(0, end);
  return merged([...linkList(list, index, self), { text: text.slice(list.length) }]);
}

/** Note items: a line per `; ` item, as `noteLines` splits them. */
const itemsOf = (note: string) => note.split('\n').flatMap(line => line.replace(/^!/, '').split('; '));

export function buildIndex(cards: DeckCard[]): CardIndex {
  const index: CardIndex = { byId: new Map(), bySide: new Map(), derived: new Map(), related: new Map() };
  for (const card of cards) {
    index.byId.set(card.id, card);
    const k = key(card.b);
    index.bySide.set(k, [...(index.bySide.get(k) ?? []), card]);
  }
  const named = new Map<string, Set<string>>();
  for (const card of cards) {
    for (const item of itemsOf(card.n ?? '')) {
      const label = item.match(LABEL)?.[2];
      if (!label) continue;
      for (const { link, gloss } of linkSegments(item, index, card.id)) {
        if (!link) continue;
        named.set(card.id, (named.get(card.id) ?? new Set()).add(link));
        if (ORIGIN_LABEL.test(label)) index.derived.set(link, [...(index.derived.get(link) ?? []), { id: card.id, ...(gloss && { gloss }) }]);
        else index.related.set(link, [...(index.related.get(link) ?? []), { id: card.id }]);
      }
    }
  }
  for (const [id, words] of index.related) {
    const unseen = words.filter(w => !named.get(id)?.has(w.id));
    if (unseen.length) index.related.set(id, unseen);
    else index.related.delete(id);
  }
  return index;
}

/** The card each form card is a form of, from its note: hij pakt → pakken. */
export function basesOf(index: CardIndex): Map<string, string> {
  const bases = new Map<string, string>();
  for (const card of index.byId.values()) {
    const item = itemsOf(card.n ?? '').find(i => FORM_LABEL.test(i.match(LABEL)?.[2] ?? ''));
    const base = item && linkSegments(item, index, card.id).find(s => s.link)?.link;
    if (base) bases.set(card.id, base);
  }
  return bases;
}

/** Every word built on the card or formed from it, at any depth, without the card itself. */
export function familyOfWord(index: CardIndex, bases: Map<string, string>, id: string): string[] {
  const formsOf = new Map<string, string[]>();
  for (const [form, base] of bases) formsOf.set(base, [...(formsOf.get(base) ?? []), form]);
  const seen = new Set([id]);
  const queue = [id];
  for (let next = queue.shift(); next; next = queue.shift()) {
    for (const child of [...(index.derived.get(next) ?? []).map(d => d.id), ...(formsOf.get(next) ?? [])]) {
      if (!seen.has(child)) { seen.add(child); queue.push(child); }
    }
  }
  seen.delete(id);
  return [...seen];
}
