import { get } from 'idb-keyval';
import type { Surreal } from 'surrealdb';
import { save, type StoreKey } from '../kv';

const KEYS: StoreKey[] = ['progress', 'settings', 'custom', 'gameScores', 'reviewed', 'reviews', 'edits', 'passed'];
const SESSION_KEYS = /^(learn-resume|review-left)(:|$)/;

/** Copies the old IndexedDB store and localStorage sessions in; the old copies stay. */
export async function run(db: Surreal) {
  for (const key of KEYS) {
    const value = await get(key);
    if (value !== undefined) await save(key, value);
  }
  const sessions = Object.keys(localStorage).filter(k => SESSION_KEYS.test(k));
  for (const key of sessions) await db.query('UPSERT type::record("session", $key) SET v = $v', { key, v: localStorage.getItem(key) }).collect();
}
