import type { Surreal } from 'surrealdb';

export interface Migration {
  /** Brings the data from version - 1 to this version. Safe to run again after a failure. */
  run(db: Surreal): Promise<void>;
}

/** Ordered by version; each step loads only when a database below it needs it. */
export const MIGRATIONS: Array<{ version: number; load: () => Promise<Migration> }> = [
  { version: 1, load: () => import('./001-idb-to-surreal') },
  { version: 2, load: () => import('./002-recall-times') },
];

export async function versionOf(db: Surreal): Promise<number> {
  const [rows] = await db.query('SELECT VALUE version FROM meta:schema').collect<[number[]]>();
  return Number(rows[0] ?? 0);
}

/** Runs every step above the database's version, in order, each after the one before it lands. */
export async function migrate(db: Surreal, onStep: (done: number, total: number) => void = () => undefined, steps = MIGRATIONS) {
  const from = await versionOf(db);
  const pending = steps.filter(s => s.version > from).sort((a, b) => a.version - b.version);
  onStep(0, pending.length);
  for (const [i, step] of pending.entries()) {
    const migration = await step.load();
    await migration.run(db);
    await db.query('UPSERT meta:schema SET version = $version', { version: step.version }).collect();
    onStep(i + 1, pending.length);
  }
}
