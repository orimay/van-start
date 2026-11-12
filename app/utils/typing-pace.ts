/**
 * How fast this user types, learned from the gaps between keys and kept across sessions.
 * A gap up to a few typical ones is typing (an accent, a long-press, a fix); a longer one is thinking,
 * of which one typical gap still went to the key itself.
 */
const KEY = 'typing-gaps';
const KEPT = 200;
const MIN_PAUSE_MS = 600;
const MAX_PAUSE_MS = 2500;
const DEFAULT_GAP_MS = 300;
/** Shorter gaps are a paste or an autocomplete, not a key. */
const MIN_KEY_GAP_MS = 40;
const isKeyGap = (g: number) => g >= MIN_KEY_GAP_MS && g <= MAX_PAUSE_MS;

let gaps: number[] | undefined;
function load(): number[] {
  if (gaps) return gaps;
  try {
    gaps = JSON.parse(localStorage.getItem(KEY) ?? '[]') as number[];
  } catch {
    gaps = [];
  }
  return gaps;
}

/** `fresh`: gaps of the answer being typed, so a new typist is read from the first word. */
export function typicalGap(fresh: number[] = []): number {
  const sorted = [...load(), ...fresh.filter(isKeyGap)].sort((a, b) => a - b);
  return sorted.length < 3 ? DEFAULT_GAP_MS : sorted[Math.floor(sorted.length / 2)]!;
}

/** The share of a gap between keys that went to typing. */
export function typingPart(gap: number, fresh: number[] = []): number {
  const typical = typicalGap(fresh);
  const pause = Math.min(Math.max(typical * 4, MIN_PAUSE_MS), MAX_PAUSE_MS);
  return gap <= pause ? gap : typical;
}

/** Learns from the gaps of one answer; pauses beyond typing are left out. */
export function learnGaps(answerGaps: number[]) {
  const kept = [...load(), ...answerGaps.filter(isKeyGap)].slice(-KEPT);
  gaps = kept;
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {}
}
