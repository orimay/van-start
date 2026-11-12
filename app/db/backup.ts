import { useDb } from './connect';
import { versionOf } from './migrations';

export interface ShowRow {
  word: string;
  game: string;
  session: string;
  t: number;
  answer: string;
  ms?: number;
  rung: number;
  source: string;
  at: string;
}

/** The show log and schema version, for the backup. */
export async function exportLog(): Promise<{ schema_version: number; shows: ShowRow[] }> {
  const db = await useDb();
  const [shows] = await db.query('SELECT word, game, session, t, answer, ms, rung, source, <string>at AS at, at AS time FROM show ORDER BY time, session, t').collect<[Array<ShowRow & { time?: unknown }>]>();
  return { schema_version: await versionOf(db), shows: shows.map(({ time: _, ...show }) => show) };
}

/** Replaces the show log with a backup's, in one transaction; a backup without one keeps the log. */
export async function importLog({ shows }: { shows?: ShowRow[] }) {
  if (!shows) return;
  const db = await useDb();
  await db.query('BEGIN; DELETE show; DELETE stats; FOR $s IN $shows { CREATE show CONTENT { word: $s.word, game: $s.game, session: $s.session, t: $s.t, answer: $s.answer, ms: $s.ms, rung: $s.rung, source: $s.source, at: <datetime>$s.at }; }; COMMIT;', { shows }).collect();
}
