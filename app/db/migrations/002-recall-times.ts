import type { Surreal } from 'surrealdb';

/** Recall times for the answers logged before the `recall` table kept them. */
export async function run(db: Surreal) {
  await db.query(`
    FOR $pair IN (SELECT word, game FROM show WHERE answer = "plus" AND ms != NONE GROUP BY word, game) {
      LET $recent = (SELECT VALUE ms FROM show WHERE word = $pair.word AND game = $pair.game AND answer = "plus" AND ms != NONE ORDER BY at DESC LIMIT 5);
      UPSERT type::record('recall', [$pair.word, $pair.game]) SET ms = math::median($recent);
    };
  `).collect();
}
