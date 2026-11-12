/** Answers a card has had in review. */
export interface Score {
  right: number;
  wrong: number;
}

/** Each miss over the right answers multiplies a card's odds of being drawn by this, each right answer over the misses divides them. */
const ODDS_PER_ANSWER = 1.5;

/** Score after a session's answers: each miss counts, and a session without one counts as a single right. */
export function scored(score: Score | undefined, answers: boolean[]): Score {
  const { right, wrong } = score ?? { right: 0, wrong: 0 };
  const misses = answers.filter(ok => !ok).length;
  return { right: right + (answers.length && !misses ? 1 : 0), wrong: wrong + misses };
}

/** Missed at least as often as answered right. */
export const isMissed = (score: Score | undefined) => score !== undefined && score.wrong > 0 && score.wrong >= score.right;

/** Odds of being drawn against a card never answered. */
export const oddsOf = (score: Score | undefined) => ODDS_PER_ANSWER ** ((score?.wrong ?? 0) - (score?.right ?? 0));

/** Recall and typing answers tell what the learner knows; a slip in matching or choosing does not. */
export const countsAnswer = (stage: string) => ['recall', 'recallNative', 'listen', 'type', 'dictation', 'pronounce'].includes(stage);

/** A card's scores, one per counted game. */
export type GameScores = Partial<Record<string, Score>>;

const balanceOf = (score: Score) => score.wrong - score.right;

/** The given game whose score has the most misses over right answers. */
function worstOf(scores: GameScores | undefined, games: readonly string[]): string | undefined {
  return games.filter(g => scores?.[g]).reduce<string | undefined>((worst, g) => (worst && balanceOf(scores![worst]!) >= balanceOf(scores![g]!) ? worst : g), undefined);
}

/** The missed game to ask a card in, if any. */
export function worstGame(scores: GameScores | undefined, games: readonly string[]): string | undefined {
  const game = worstOf(scores, games);
  return game && isMissed(scores?.[game]) ? game : undefined;
}

/** The score that sets a card's order and odds. */
export const worstScore = (scores: GameScores | undefined, games: readonly string[]) => {
  const game = worstOf(scores, games);
  return game ? scores?.[game] : undefined;
};

/** Keeps each card's score per game in step with its answers of one session, undo included. */
export function sessionScore(scoreOf: (id: string, game: string) => Score | undefined, save: (id: string, game: string, score: Score | undefined) => void) {
  const before = new Map<string, Score | undefined>();
  const answers = new Map<string, boolean[]>();
  const update = (id: string, game: string) => {
    const key = `${id}:${game}`;
    save(id, game, answers.get(key)!.length ? scored(before.get(key), answers.get(key)!) : before.get(key));
  };
  return {
    answer(id: string, stage: string, ok: boolean) {
      if (!countsAnswer(stage)) return;
      const key = `${id}:${stage}`;
      if (!before.has(key)) before.set(key, scoreOf(id, stage));
      answers.set(key, [...(answers.get(key) ?? []), ok]);
      update(id, stage);
    },
    undo(id: string, stage: string) {
      const key = `${id}:${stage}`;
      if (!countsAnswer(stage) || !answers.get(key)?.length) return;
      answers.set(key, answers.get(key)!.slice(0, -1));
      update(id, stage);
    },
  };
}
