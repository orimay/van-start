const ARTICLE = /^(de|het|een)\s+/i;
const TALL = new Set('bdfhklt');
const LOW = new Set('gjpqy');
const CLUSTERS = ['sch', 'cht', 'ij', 'ei', 'oe', 'ui', 'eu', 'ou', 'au', 'ie', 'aa', 'ee', 'oo', 'uu', 'ch', 'ng'];
/** Being known weighs about as much as one shared letter at the edge. */
const KNOWN_BONUS = 0.08;

const bodyOf = (text: string) => text.trim().replace(ARTICLE, '').toLowerCase();
const articleOf = (text: string) => ARTICLE.exec(text.trim())?.[1]?.toLowerCase() ?? '';
const shape = (word: string) => [...word].map(c => (TALL.has(c) ? 'T' : LOW.has(c) ? 'L' : /\p{L}/u.test(c) ? 'x' : ' ')).join('');

function sharedPrefix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && a[n] === b[n]) n++;
  return n;
}

const reversed = (s: string) => [...s].reverse().join('');

function levenshteinSimilarity(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!;
      row[j] = Math.min(above + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - row[b.length]! / Math.max(a.length, b.length, 1);
}

interface Features {
  body: string;
  reversed: string;
  shape: string;
  clusters: number[];
  clusterTotal: number;
  article: string;
  words: string[];
}

const featureCache = new Map<string, Features>();

/** Everything `looks` needs about one text, computed once per text. */
function featuresOf(text: string): Features {
  let f = featureCache.get(text);
  if (!f) {
    const body = bodyOf(text);
    const clusters = CLUSTERS.map(c => body.split(c).length - 1);
    f = { body, reversed: reversed(body), shape: shape(body), clusters, clusterTotal: clusters.reduce((s, n) => s + n, 0), article: articleOf(text), words: body.split(/[\s,.!?]+/) };
    featureCache.set(text, f);
  }
  return f;
}

function clusterOverlap(a: Features, b: Features): number {
  const total = a.clusterTotal + b.clusterTotal;
  return total ? (2 * a.clusters.reduce((s, n, i) => s + Math.min(n, b.clusters[i]!), 0)) / total : 0;
}

const SHAPE_WEIGHT = 0.15;

/** How alike two Dutch words look to a beginner, without the costly shape term: edges, length, letter clusters, article. */
function looksRoughly(a: Features, b: Features): number {
  const longest = Math.max(a.body.length, b.body.length);
  return (
    0.3 * (Math.min(sharedPrefix(a.body, b.body), 4) / 4) +
    0.3 * (Math.min(sharedPrefix(a.reversed, b.reversed), 4) / 4) +
    0.15 * (1 - Math.abs(a.body.length - b.body.length) / longest) +
    0.1 * clusterOverlap(a, b) +
    0.05 * Number(a.article === b.article)
  );
}

/** A phrase or form built on the word itself is told apart by meaning, not by look. */
function isBuiltOn(a: Features, b: Features): boolean {
  return a.body.startsWith(b.body) || b.body.startsWith(a.body) || b.words.includes(a.body) || a.words.includes(b.body);
}

/** The `count` candidates that look most like `answer`, known ones preferred; ties broken by `random`. */
export function lookalikes<T extends { id: string; answer: string }>(answer: string, candidates: readonly T[], options: { count: number; isKnown: (id: string) => boolean; random: () => number }): T[] {
  const target = featuresOf(answer);
  // Rough score plus the most the shape could add: an upper bound, so the shape is measured only while it can still matter.
  const ranked = candidates
    .map(c => ({ c, f: featuresOf(c.answer) }))
    .filter(({ f }) => f.body !== target.body)
    // Letters and forms of the word itself go last: only to fill up a small pool.
    .map(({ c, f }) => {
      const rough = f.body.length < 3 || isBuiltOn(target, f) ? -1 : looksRoughly(target, f);
      return { c, f, rough, bound: rough + SHAPE_WEIGHT + (options.isKnown(c.id) ? KNOWN_BONUS : 0) };
    })
    .sort((x, y) => y.bound - x.bound);
  const best: { c: T; score: number }[] = [];
  const seen = new Set<string>();
  for (const { c, f, rough, bound } of ranked) {
    if (best.length === options.count && bound + 1e-3 < best.at(-1)!.score) break;
    if (seen.has(c.answer)) continue;
    seen.add(c.answer);
    const shapeScore = rough < 0 ? 0 : SHAPE_WEIGHT * levenshteinSimilarity(target.shape, f.shape);
    best.push({ c, score: bound - SHAPE_WEIGHT + shapeScore + options.random() * 1e-3 });
    best.sort((x, y) => y.score - x.score);
    if (best.length > options.count) best.pop();
  }
  return best.map(({ c }) => c);
}
