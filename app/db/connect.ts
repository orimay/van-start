import { createWasmEngines, createWasmWorkerEngines } from '@surrealdb/wasm';
import { Surreal } from 'surrealdb';
import { SCHEMA } from './schema';

const NAME = 'van_start';
let opened: Promise<Surreal> | undefined;

/** The app's database: SurrealKV on OPFS in a worker in the browser, in memory under test. */
export function useDb(): Promise<Surreal> {
  return (opened ??= open(import.meta.env.MODE === 'test' ? 'mem' : 'surrealkv'));
}

/** A fresh in-memory database; tests swap it in to start clean. */
export async function resetDb(): Promise<Surreal> {
  const old = opened;
  opened = open('mem');
  await old?.then(db => db.close()).catch(() => undefined);
  return opened;
}

async function open(store: 'mem' | 'surrealkv'): Promise<Surreal> {
  const engines = store === 'mem'
    ? createWasmEngines()
    : createWasmWorkerEngines({ createWorker: () => new Worker(new URL('./surreal.worker.ts', import.meta.url), { type: 'module' }) });
  // `@surrealdb/wasm` registers `indxdb`; engine 4 opens OPFS SurrealKV through the same factory.
  const db = new Surreal({ engines: { ...engines, surrealkv: engines.indxdb! } });
  // Engine 4 names an OPFS store by a single path component.
  await db.connect(store === 'mem' ? 'mem://' : `surrealkv://${NAME}--${NAME}`);
  await db.use({ namespace: NAME, database: NAME });
  await db.query(SCHEMA).collect();
  return db;
}
