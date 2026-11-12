import { RecordId } from 'surrealdb';
import type { ShowRow } from './backup';
import { useDb } from './connect';
import { holdUntilDone } from '@/utils/update-hold';

/** Pluses a game needs before its typical time judges an answer slow. */
export const MIN_PLUSES_FOR_SLOW = 10;
/** Slower than this many typical times counts as slow. */
export const SLOW_FACTOR = 2;

let queue: Promise<unknown> = Promise.resolve();
const typical = new Map<string, { ms: number; n: number }>();
/** Recall time per `word:game`. */
const recall = new Map<string, number>();
/** When each `word:game` was last shown before this run, epoch ms. */
const seen = new Map<string, number>();

/** Logs one answer; resolves to the row id, for Back to take it away. */
export function logShow(row: Omit<ShowRow, 'at'>): Promise<string | undefined> {
  const run = queue.then(async () => {
    const db = await useDb();
    const [rows] = await db.query('CREATE show CONTENT $row RETURN record::id(id) AS id', { row: { ...row, ms: row.ms === undefined ? undefined : Math.round(row.ms) } }).collect<[Array<{ id: string }>]>();
    await refreshTypical(row.game);
    await refreshRecall(row.word, row.game);
    return rows[0]?.id;
  });
  queue = holdUntilDone(run.catch(() => undefined));
  return run.catch(() => undefined);
}

/** Takes a logged answer back. */
export function unlogShow(id: Promise<string | undefined> | string | undefined) {
  queue = holdUntilDone(queue.then(async () => {
    const key = await id;
    if (!key) return;
    const db = await useDb();
    const [rows] = await db.query('DELETE $id RETURN BEFORE', { id: new RecordId('show', key) }).collect<[Array<{ word: string; game: string }>]>();
    if (rows[0]) await refreshRecall(rows[0].word, rows[0].game);
  }).catch(() => undefined));
}

/** True when a right answer took over twice the game's typical time, once the game has enough pluses to tell. */
export function isSlow(game: string, ms: number): boolean {
  const t = typical.get(game);
  return !!t && t.n >= MIN_PLUSES_FOR_SLOW && ms > t.ms * SLOW_FACTOR;
}

/** Reads the typical times kept by the database. */
export async function loadTypical() {
  const db = await useDb();
  const [rows] = await db.query('SELECT record::id(id) AS game, ms, n FROM stats').collect<[Array<{ game: string; ms?: number; n: number }>]>();
  for (const { game, ms, n } of rows) if (ms !== undefined) typical.set(game, { ms, n });
  const [times] = await db.query('SELECT record::id(id) AS key, ms FROM recall').collect<[Array<{ key: [string, string]; ms?: number }>]>();
  for (const { key, ms } of times) if (ms !== undefined) recall.set(key.join(':'), ms);
  const [last] = await db.query('SELECT word, game, <string>time::max(at) AS at FROM show GROUP BY word, game').collect<[Array<{ word: string; game: string; at: string }>]>();
  for (const { word, game, at } of last) seen.set(`${word}:${game}`, new Date(at).getTime());
}

/** When a card was last shown in a game before this run; undefined if never. */
export const seenBefore = (word: string, game: string) => seen.get(`${word}:${game}`);

const HOUR_MS = 3_600_000;
/**
 * `seenBefore`, backfilled for cards answered before shows were kept (`answered`):
 * as if learned in deck order, an hour apart, ending before the earliest kept show.
 */
export function seenInDeckOrder(order: string[], answered: (word: string) => boolean) {
  const earliest = Math.min(Date.now(), ...seen.values());
  const index = new Map(order.map((id, i) => [id, i]));
  return (word: string, game: string) => {
    const kept = seenBefore(word, game);
    if (kept !== undefined || !answered(word) || !index.has(word)) return kept;
    return earliest - (order.length - index.get(word)!) * HOUR_MS;
  };
}

/** How long a card took to recall in a game lately; undefined until it is answered right there. */
export const recallMs = (word: string, game: string) => recall.get(`${word}:${game}`);

async function refreshRecall(word: string, game: string) {
  const [rows] = await (await useDb()).query('SELECT VALUE ms FROM type::record("recall", [$word, $game])', { word, game }).collect<[Array<number | undefined>]>();
  if (rows[0] === undefined) recall.delete(`${word}:${game}`);
  else recall.set(`${word}:${game}`, rows[0]);
}

async function refreshTypical(game: string) {
  const db = await useDb();
  const [rows] = await db.query('SELECT ms, n FROM type::record("stats", $game)', { game }).collect<[Array<{ ms?: number; n: number }>]>();
  const row = rows[0];
  if (row?.ms !== undefined) typical.set(game, { ms: row.ms, n: row.n });
}

/** Resolves once every write so far has landed. */
export const flushShows = () => queue;

export function forgetTypical() {
  typical.clear();
  recall.clear();
  seen.clear();
}

/** What a session reports about one show. */
export interface ShownCard {
  id: string;
  game: string;
  answer: string;
  ms: number;
  rung: number;
  source: string;
}

/** Logs a session's shows in order, and takes the last one of a card back on Back. */
export function sessionLog(session: string) {
  let t = 0;
  const logged = new Map<string, Array<Promise<string | undefined>>>();
  return {
    show({ id, ...rest }: ShownCard) {
      logged.set(id, [...(logged.get(id) ?? []), logShow({ word: id, session, t: t++, ...rest })]);
    },
    unshow(id: string) {
      unlogShow(logged.get(id)?.pop());
      t--;
    },
  };
}
