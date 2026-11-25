<script setup lang="ts">
import type { CardInput } from 'ts-fsrs';
import type { Score } from '@/utils/score';
import { shallowRef } from 'vue';
import type { Position, Stage } from '@/components/Session.vue';
import { withConfusions } from '@/utils/confusions';
import { cardsOf, nodeAt, toStudyCard } from '@/utils/deck';
import { reviewGameOf, type ReviewGame } from '@/utils/games';
import { sessionScore } from '@/utils/score';
import { saveBeforeUpdate } from '@/utils/update-hold';
import { takeUpdateReload } from '@/utils/update-reload';
import { sessions } from '@/db/sessions';
import { isSlow, sessionLog } from '@/db/shows';

/** Every answer of this visit goes to the show log. */
const log = sessionLog(crypto.randomUUID());

/** A session an update reloaded the page in the middle of. */
interface Saved {
  key: string;
  ids: string[];
  scores: Record<string, Score>;
  seed: string;
  finished: boolean;
  /** Schedules from before each answer, `null` for a card that had none. */
  before: Array<[string, CardInput | null]>;
  at?: Position;
}
const SAVED_KEY = 'review-update';
/** A session left unfinished, picked up on the next visit. */
const LEFT_KEY = 'review-left';

const store = useStore();
await store.ready;
const { settings } = store;
const all = cardsOf(store.deck.value!);
// With a section path: every learned card of that section, due or not. Without: whatever is due.
const path = String(useRoute().query.path ?? '').split('-').filter(Boolean).map(Number);
const section = useRoute().query.path === 'all' ? store.deck.value! : path.length ? nodeAt(store.deck.value!, path) : undefined;
const candidates = section ? cardsOf(section) : all;
const pool = all.map(c => toStudyCard(c));
const learned = all.filter(c => store.isLearned(c.id)).map(c => c.id);

/** The game the link names, else the first review game on; each keeps its own schedule. */
const reviewGame: ReviewGame = reviewGameOf(String(useRoute().query.game ?? ''), settings.value.games);

const key = `${String(useRoute().query.path ?? '')}:${reviewGame}`;
const saved = takeUpdateReload(location.pathname + location.search) ? takeSaved() : takeLeft();

// One session over every card; a miss comes back soon and the session ends once each card is answered right.
const now = new Date();
const byId = new Map(all.map(c => [c.id, c]));
const learnedAt = new Map(Object.keys(store.progress.value).map((id, i) => [id, i]));
/** Misses over right answers in this game. */
const balanceOf = (id: string) => (store.scores.value[id]?.[reviewGame]?.wrong ?? 0) - (store.scores.value[id]?.[reviewGame]?.right ?? 0);
/** Learned cards anywhere a mixed-up card can bring along. */
const askable = all.filter(c => store.isLearned(c.id) && store.playedIn(c.id, reviewGame) && !store.isHidden(c.id));
const batch = saved
  ? saved.ids.map(id => toStudyCard(byId.get(id)!))
  : withConfusions(
      candidates
        .filter(c => (section ? store.isLearned(c.id) && store.playedIn(c.id, reviewGame) : store.isDue(c.id, now, reviewGame)))
        // Hardest first, so they get the most chances to come back.
        .sort((a, b) => balanceOf(b.id) - balanceOf(a.id) || learnedAt.get(a.id)! - learnedAt.get(b.id)!),
      askable,
      store.confusions.value,
      Infinity,
    ).map(c => toStudyCard(c));
const finished = shallowRef(saved?.finished ?? false);
/** Each card's score in this game as the session began: it orders the session and sets the card's odds. */
/** Each card's score in this game as the session began: its misses raise its odds of coming up early. */
const scores = saved?.scores ?? Object.fromEntries(batch.flatMap(c => [store.scores.value[c.id]?.[reviewGame]].filter(s => s !== undefined).map(s => [c.id, s])));
const seed = saved?.seed ?? `review:${now.toDateString()}:${batch.map(c => c.id).join()}`;
let position = saved?.at;

function snapshot(): Saved {
  return { key, ids: batch.map(c => c.id), scores, seed, finished: finished.value, before: [...before].map(([id, b]) => [id, b ?? null]), at: position };
}

saveBeforeUpdate(() => {
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify(snapshot()));
  } catch {}
});

function leave() {
  try {
    if (finished.value) sessions.remove(`${LEFT_KEY}:${key}`);
    else if (position) sessions.set(`${LEFT_KEY}:${key}`, JSON.stringify(snapshot()));
  } catch {}
}

function takeLeft(): Saved | undefined {
  try {
    const data = JSON.parse(sessions.get(`${LEFT_KEY}:${key}`) ?? 'null') as Saved | null;
    return data && !data.finished && data.ids.every(id => all.some(c => c.id === id)) ? data : undefined;
  } catch {
    return undefined;
  }
}

function takeSaved(): Saved | undefined {
  try {
    const data = JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? 'null') as Saved | null;
    sessionStorage.removeItem(SAVED_KEY);
    return data?.key === key && data.ids.every(id => all.some(c => c.id === id)) ? data : undefined;
  } catch {
    return undefined;
  }
}
const scoring = sessionScore((id, game) => store.scores.value[id]?.[game], store.saveScore);

/** Schedule of each answered card before its answer, restored when the learner steps back. */
const before = new Map<string, CardInput | undefined>(saved?.before.map(([id, b]) => [id, b ?? undefined]));

function onAnswer(id: string, stage: Stage, ok: boolean) {
  scoring.answer(id, stage, ok);
  // A card mixed up with this one may not be learned yet: it has nothing to reschedule.
  if (!store.isLearned(id)) return;
  before.set(id, store.scheduleOf(id, reviewGame));
  store.rate(id, ok ? store.Rating.Good : store.Rating.Again, reviewGame);
}

function onUndo(id: string, stage: Stage) {
  scoring.undo(id, stage);
  if (!before.has(id)) return;
  store.restore(id, reviewGame, before.get(id));
  before.delete(id);
}

</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <header class="flex items-center gap-3">
      <UpLink to="/" class="text-2xl text-stone-500" data-testid="back">‹</UpLink>
      <h1 class="flex-1 truncate font-semibold">{{ section ? `Review: ${section.name}` : 'Review' }}</h1>
    </header>
    <div v-if="finished || !batch.length" class="flex flex-1 flex-col gap-4">
      <p class="flex flex-1 items-center justify-center text-xl font-semibold" data-testid="done">{{ batch.length ? 'Done' : 'Nothing due yet' }}</p>
      <div class="flex flex-col gap-2">
        <UpLink to="/" class="btn-ghost text-center">To sections</UpLink>
      </div>
    </div>
    <Session
      v-else
      :cards="batch"
      :stages="[reviewGame]"
      :scores="scores"
      :pool="pool"
      :known="learned"
      :seed="seed"
      :resume-at="saved?.at"
      ordered
      lang="nl"
      @position="at => ((position = at), leave())"
      @answer="onAnswer"
      @undo="onUndo"
      :is-slow="isSlow"
      @show="log.show"
      @unshow="log.unshow"
      @finished="(finished = true), leave()"
    />
  </div>
</template>
