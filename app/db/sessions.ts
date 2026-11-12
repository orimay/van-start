import { useDb } from './connect';
import { holdUntilDone } from '@/utils/update-hold';

/** Unfinished sessions by key, read once at start so pages can read them synchronously. */
const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

export async function loadSessions() {
  const db = await useDb();
  const [rows] = await db.query('SELECT record::id(id) AS id, v FROM session').collect<[Array<{ id: string; v: string }>]>();
  cache.clear();
  for (const { id, v } of rows) cache.set(id, v);
}

export const sessions = {
  get: (key: string): string | null => cache.get(key) ?? null,
  set(key: string, value: string) {
    cache.set(key, value);
    write('UPSERT type::record("session", $key) SET v = $value', { key, value });
  },
  remove(key: string) {
    if (!cache.delete(key)) return;
    write('DELETE type::record("session", $key)', { key });
  },
  keys: () => [...cache.keys()],
  /** Resolves once every write so far has landed. */
  flush: () => queue,
};

function write(sql: string, bindings: Record<string, unknown>) {
  queue = holdUntilDone(queue.then(async () => (await useDb()).query(sql, bindings).collect()).catch(() => undefined));
}
