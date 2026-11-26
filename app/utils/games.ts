import type { GameScores } from './score';

/** Games in the order a new group plays them: recognition first, then reading, listening, speaking and writing. */
export const GAMES = ['match', 'choice', 'pronounce', 'recallNative', 'listen', 'recall', 'type', 'dictation'] as const;
export type Game = (typeof GAMES)[number];

/** Games review can ask in, as the learner is offered them. */
export const REVIEW_GAMES = ['type', 'dictation', 'recall', 'listen', 'recallNative', 'pronounce'] as const;
export type ReviewGame = (typeof REVIEW_GAMES)[number];

/** Games on until the learner changes them. */
export const DEFAULT_GAMES: Game[] = [...GAMES];

/** The default set before listening, dictation and pronouncing were on too. */
const OLD_DEFAULT_GAMES: readonly Game[] = ['match', 'choice', 'recallNative', 'recall', 'type'];

/** Saved games; nothing saved or the untouched old default set means every game. */
export const savedGames = (saved: readonly Game[] | undefined): Game[] =>
  !saved?.length || (saved.length === OLD_DEFAULT_GAMES.length && OLD_DEFAULT_GAMES.every(g => saved.includes(g))) ? [...DEFAULT_GAMES] : [...saved];

/** Every game by the skill it trains. */
export const GAME_TITLES: Record<Game | 'intro', string> = {
  intro: 'Intro',
  match: 'Associating',
  choice: 'Recognizing',
  pronounce: 'Pronouncing',
  recallNative: 'Reading',
  listen: 'Listening',
  recall: 'Speaking',
  type: 'Writing',
  dictation: 'Dictation',
};

/** Games played by ear: an affix or a sound has no clip of its own, so it sits them out. */
const EAR_GAMES: readonly string[] = ['listen', 'dictation'];
/** A prefix or a suffix, like `be-` or `-heid`. */
export const isAffix = (dutch: string) => dutch.startsWith('-') || dutch.endsWith('-');
export const playsIn = (earless: boolean | undefined, game: string) => !earless || !EAR_GAMES.includes(game);

/** The card passed the stage; answers on record mean its intro was passed too, the intro always going first. */
export const hasPassed = (games: readonly string[] | undefined, stage: string, scores?: GameScores) =>
  !!games?.includes(stage) || (stage === 'intro' && Object.values(scores ?? {}).some(s => s && s.right + s.wrong > 0));

export const isReviewGame = (g: string): g is ReviewGame => (REVIEW_GAMES as readonly string[]).includes(g);

/** Stages of learning a group: the intro, then each game turned on; `pronounceFirst` puts pronouncing, when on, in the intro's place. */
export const learnStages = (enabled: readonly Game[], pronounceFirst = false) => {
  const games = GAMES.filter(g => enabled.includes(g));
  return pronounceFirst && games.includes('pronounce') ? ['pronounce' as const, ...games.filter(g => g !== 'pronounce')] : ['intro' as const, ...games];
};

/** Review games to fall back on, most asked first. */
const FALLBACK: readonly Game[] = ['recall', 'recallNative', 'type', 'listen', 'dictation', 'pronounce'];

/** The game review asks in: the chosen review game, on or off, else the first fallback on, else recall. */
export const reviewGameOf = (chosen: string, enabled: readonly Game[]): ReviewGame =>
  isReviewGame(chosen) ? chosen : ((FALLBACK.find(g => enabled.includes(g) && isReviewGame(g)) as ReviewGame | undefined) ?? 'recall');

/** Turns a game on or off; the last game on stays on. */
export const toggled = (enabled: readonly Game[], game: Game): Game[] => (!enabled.includes(game) ? [...enabled, game] : enabled.length > 1 ? enabled.filter(g => g !== game) : [...enabled]);


export const GAME_HINTS: Record<'intro' | Game, string> = {
  intro: 'Meet the new cards.',
  match: 'Tap a card, then its translation.',
  choice: 'Pick the Dutch for the meaning.',
  pronounce: 'Say the Dutch aloud, record yourself if you like, then listen and compare.',
  recallNative: 'Read the Dutch and recall what it means.',
  listen: 'Listen to the Dutch, as often as you like, and recall what it means.',
  recall: 'Say it in Dutch aloud, then check yourself.',
  type: 'Write it in Dutch.',
  dictation: 'Listen to the Dutch and write it down.',
};
