/** Idempotent: runs on every connect. Data changes between versions go through migrations. */
export const SCHEMA = /* surql */ `
DEFINE TABLE IF NOT EXISTS meta SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS version ON meta TYPE int;

-- Learning record, one per learned word, in the order learned.
DEFINE TABLE IF NOT EXISTS word SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS pos ON word TYPE int;
DEFINE FIELD IF NOT EXISTS v ON word TYPE object FLEXIBLE;
DEFINE INDEX IF NOT EXISTS word_pos ON word FIELDS pos;

-- Daily schedule of a word in one review game, id [game, word].
DEFINE TABLE IF NOT EXISTS review SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS pos ON review TYPE int;
DEFINE FIELD IF NOT EXISTS v ON review TYPE object FLEXIBLE;
DEFINE FIELD IF NOT EXISTS due ON review VALUE <datetime>v.due;
DEFINE INDEX IF NOT EXISTS review_due ON review FIELDS due;

DEFINE TABLE IF NOT EXISTS passed SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS pos ON passed TYPE int;
DEFINE FIELD IF NOT EXISTS v ON passed TYPE array<string>;

DEFINE TABLE IF NOT EXISTS score SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS pos ON score TYPE int;
DEFINE FIELD IF NOT EXISTS v ON score TYPE object FLEXIBLE;

-- Single documents: settings, custom, edits, reviewed, confusions.
DEFINE TABLE IF NOT EXISTS doc SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS v ON doc TYPE any;

-- Unfinished lesson and review sessions by key.
DEFINE TABLE IF NOT EXISTS session SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS v ON session TYPE any;

-- One row per answer.
DEFINE TABLE IF NOT EXISTS show SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS word ON show TYPE string;
DEFINE FIELD IF NOT EXISTS game ON show TYPE string;
DEFINE FIELD IF NOT EXISTS session ON show TYPE string;
DEFINE FIELD IF NOT EXISTS t ON show TYPE int;
DEFINE FIELD IF NOT EXISTS answer ON show TYPE string;
DEFINE FIELD IF NOT EXISTS ms ON show TYPE option<number>;
DEFINE FIELD IF NOT EXISTS rung ON show TYPE int;
DEFINE FIELD IF NOT EXISTS source ON show TYPE string;
DEFINE FIELD IF NOT EXISTS at ON show TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS show_game ON show FIELDS game, answer, at;

-- Typical answer time per game: median of the last 200 timed pluses.
DEFINE TABLE IF NOT EXISTS stats SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS ms ON stats TYPE option<number>;
DEFINE FIELD IF NOT EXISTS n ON stats TYPE int;
DEFINE EVENT IF NOT EXISTS typical_ms ON show WHEN $event = "CREATE" AND $after.answer = "plus" AND $after.ms != NONE THEN {
  LET $recent = (SELECT VALUE ms FROM show WHERE game = $after.game AND answer = "plus" AND ms != NONE ORDER BY at DESC LIMIT 200);
  UPSERT type::record('stats', $after.game) SET ms = math::median($recent), n = (SELECT count() FROM show WHERE game = $after.game AND answer = "plus" AND ms != NONE GROUP ALL)[0].count;
};

-- Recall time per card and game: median of its last five timed pluses, so old answers drop out.
DEFINE TABLE IF NOT EXISTS recall SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS ms ON recall TYPE option<number>;
DEFINE EVENT IF NOT EXISTS recall_ms ON show WHEN ($event = "CREATE" AND $after.answer = "plus" AND $after.ms != NONE) OR ($event = "DELETE" AND $before.answer = "plus") THEN {
  LET $row = $after ?? $before;
  LET $recent = (SELECT VALUE ms FROM show WHERE word = $row.word AND game = $row.game AND answer = "plus" AND ms != NONE ORDER BY at DESC LIMIT 5);
  IF array::len($recent) = 0 { DELETE type::record('recall', [$row.word, $row.game]) } ELSE { UPSERT type::record('recall', [$row.word, $row.game]) SET ms = math::median($recent) };
};
`;
