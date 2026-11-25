export interface Leniency {
  ignoreCase: boolean;
  /** é = e, ë = e, ё = е, ı = i and the like. */
  ignoreMarks: boolean;
}

const STRICT: Leniency = { ignoreCase: false, ignoreMarks: false };

export function stripMarks(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').replace(/ß/g, 'ss').normalize('NFC');
}

/** Drop hints in brackets, unify apostrophes and spacing, drop trailing punctuation; case and marks per leniency. */
export function normalize(text: string, leniency: Leniency = STRICT): string {
  const cased = leniency.ignoreCase ? text.toLowerCase() : text;
  const plain = leniency.ignoreMarks ? stripMarks(cased) : cased;
  return plain
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[\s.!?;:]+$/, '')
    .trim();
}

/** A back such as "de e-mail, de mail" accepts each variant on its own as well as the whole line. */
export function variantsOf(answer: string, leniency: Leniency = STRICT): string[] {
  const parts = answer.split(',').map(part => normalize(part, leniency)).filter(Boolean);
  return [normalize(answer, leniency), ...parts];
}

export function isCorrect(input: string, answer: string, leniency: Leniency = STRICT): boolean {
  const typed = normalize(input, leniency);
  return typed !== '' && variantsOf(answer, leniency).includes(typed);
}

export type LetterKind = 'ok' | 'extra' | 'missing' | 'wrong';

/** The input aligned to the closest variant on the most letters in common: right and extra typed letters, and gaps for missing ones. */
export function diffLetters(input: string, answer: string): Array<{ char: string; kind: LetterKind }> {
  const typed = [...input.trim()];
  const candidates = [answer.trim(), ...answer.split(',').map(s => s.trim())].map(c => [...c]);
  const [target, costs] = candidates.map(c => [c, distances(typed, c)] as const).reduce((best, c) => (c[1][0]![0]! < best[1][0]![0]! ? c : best));
  const same = (i: number, j: number) => typed[i]!.toLowerCase() === target[j]!.toLowerCase();
  const out: Array<{ char: string; kind: LetterKind }> = [];
  let i = 0;
  let j = 0;
  // Walk forward, taking a match first whenever it keeps the alignment optimal, then an extra letter, then a gap.
  while (i < typed.length || j < target.length) {
    const here = costs[i]![j]!;
    if (i < typed.length && j < target.length && same(i, j) && costs[i + 1]![j + 1] === here) out.push({ char: typed[i++]!, kind: 'ok' }), j++;
    else if (i < typed.length && costs[i + 1]![j]! + 1 === here) out.push({ char: typed[i++]!, kind: 'extra' });
    else out.push({ char: target[j++]!, kind: 'missing' });
  }
  return withWrongLetters(out);
}

/** Each run between matches pairs its extra letters with its gaps: a typed letter standing for a missing one is wrong, not extra. */
function withWrongLetters(letters: Array<{ char: string; kind: LetterKind }>): Array<{ char: string; kind: LetterKind }> {
  const out: Array<{ char: string; kind: LetterKind }> = [];
  for (let i = 0; i < letters.length; ) {
    if (letters[i]!.kind === 'ok') {
      out.push(letters[i++]!);
      continue;
    }
    const run: typeof letters = [];
    while (i < letters.length && letters[i]!.kind !== 'ok') run.push(letters[i++]!);
    const extra = run.filter(l => l.kind === 'extra');
    const missing = run.filter(l => l.kind === 'missing');
    const paired = Math.min(extra.length, missing.length);
    out.push(...extra.slice(0, paired).map(l => ({ char: l.char, kind: 'wrong' as const })), ...extra.slice(paired), ...missing.slice(paired));
  }
  return out;
}

/** Letters to add or drop to turn every suffix of `a` into every suffix of `b`, case-insensitive; no substitutions, so matches are maximal. */
function distances(a: string[], b: string[]): number[][] {
  const d = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length; i >= 0; i--) {
    for (let j = b.length; j >= 0; j--) {
      if (i === a.length) d[i]![j] = b.length - j;
      else if (j === b.length) d[i]![j] = a.length - i;
      else {
        const match = a[i]!.toLowerCase() === b[j]!.toLowerCase() ? d[i + 1]![j + 1]! : Infinity;
        d[i]![j] = Math.min(match, d[i + 1]![j]! + 1, d[i]![j + 1]! + 1);
      }
    }
  }
  return d;
}

/** Spelling folded to its sound: ij = ei, au = ou, and a word-final d or dt = t. */
function soundOf(text: string): string {
  return normalize(text, { ignoreCase: true, ignoreMarks: true })
    .replace(/ij/g, 'ei')
    .replace(/ou/g, 'au')
    .replace(/(?<=\p{L})(dt|d)\b/gu, 't');
}

/** Typed differently from the answer, but heard the same, as hart and hard. */
export function soundsLike(input: string, answer: string): boolean {
  const heard = soundOf(input);
  return heard !== '' && [answer, ...answer.split(',')].some(variant => soundOf(variant) === heard);
}
