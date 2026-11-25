import type { Surreal } from 'surrealdb';
import { useDb } from './connect';
import { holdUntilDone } from '@/utils/update-hold';

/** Keys the store keeps; maps of words become one row per word. */
const ROWS = { progress: 'word', gameScores: 'score', passed: 'passed' } as const;
const DOCS = ['settings', 'custom', 'edits', 'reviewed', 'confusions'] as const;
export type StoreKey = keyof typeof ROWS | (typeof DOCS)[number] | 'reviews';

type Row = { id: unknown[] | string; pos: number; v: unknown };
/** What each table last held, by record id, to write only the rows that changed. */
const written = new Map<string, Map<string, string>>();
let queue: Promise<unknown> = Promise.resolve();

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const keyOf = (id: unknown) => JSON.stringify(id);

/** Reads a stored value; `undefined` when it was never saved. */
export async function load<T>(key: StoreKey): Promise<T | undefined> {
  await queue;
  const db = await useDb();
  if (key === 'reviews') {
    if (!(await readDoc(db, 'reviews'))) return undefined;
    const rows = await readRows(db, 'review');
    const out: Record<string, Record<string, unknown>> = {};
    for (const { id, v } of rows) {
      const [game, word] = id as [string, string];
      (out[game] ??= {})[word] = v;
    }
    return out as T;
  }
  if (key in ROWS) {
    const table = ROWS[key as keyof typeof ROWS];
    if (!(await readDoc(db, key))) return undefined;
    return Object.fromEntries((await readRows(db, table)).map(({ id, v }) => [id, v])) as T;
  }
  return (await readDoc(db, key)) as T | undefined;
}

/** Writes a value; writes run one after another, each in a transaction. */
export function save(key: StoreKey, value: unknown): Promise<void> {
  const data = plain(value);
  const run = queue.then(async () => {
    const db = await useDb();
    if (key === 'reviews') {
      const rows = Object.entries(data as Record<string, Record<string, unknown>>).flatMap(([game, cards]) => Object.entries(cards ?? {}).map(([word, v]) => ({ id: [game, word], v })));
      return writeRows(db, 'review', key, rows);
    }
    if (key in ROWS) return writeRows(db, ROWS[key as keyof typeof ROWS], key, Object.entries(data as Record<string, unknown>).map(([id, v]) => ({ id, v })));
    await db.query('UPSERT type::record("doc", $key) SET v = $v', { key, v: data }).collect();
  });
  queue = holdUntilDone(run.catch(() => undefined));
  return run;
}

/** Resolves once every write so far has landed. */
export const flush = () => queue;

/** Forgets what was written: a fresh database starts with nothing. */
export function forgetWritten() {
  written.clear();
  queue = Promise.resolve();
}

async function readDoc(db: Surreal, key: string): Promise<unknown> {
  const [rows] = await db.query('SELECT VALUE v FROM type::record("doc", $key)', { key }).collect<[unknown[]]>();
  return rows[0];
}

async function readRows(db: Surreal, table: string): Promise<Row[]> {
  const [rows] = await db.query(`SELECT record::id(id) AS id, pos, v FROM type::table($table) ORDER BY pos`, { table }).collect<[Row[]]>();
  written.set(table, new Map(rows.map(r => [keyOf(r.id), JSON.stringify([r.pos, r.v])])));
  return rows;
}

async function writeRows(db: Surreal, table: string, key: string, rows: Array<{ id: unknown; v: unknown }>) {
  const before = written.get(table) ?? new Map<string, string>();
  const after = new Map(rows.map(({ id, v }, pos) => [keyOf(id), JSON.stringify([pos, v])]));
  const statements: string[] = ['BEGIN', 'UPSERT type::record("doc", $key) SET v = true'];
  const bindings: Record<string, unknown> = { key, table };
  rows.forEach(({ id, v }, pos) => {
    if (before.get(keyOf(id)) === after.get(keyOf(id))) return;
    statements.push(`UPSERT type::record($table, $i${pos}) SET pos = ${pos}, v = $v${pos}`);
    bindings[`i${pos}`] = id;
    bindings[`v${pos}`] = v;
  });
  [...before.keys()].filter(k => !after.has(k)).forEach((k, n) => {
    statements.push(`DELETE type::record($table, $d${n})`);
    bindings[`d${n}`] = JSON.parse(k);
  });
  statements.push('COMMIT');
  await db.query(statements.join(';\n'), bindings).collect();
  written.set(table, after);
}
