<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { Position, Stage } from '@/components/Session.vue';
import { withConfusions } from '@/utils/confusions';
import { following, nextGroup as groupOf } from '@/utils/group';
import { sessionScore } from '@/utils/score';
import { cardsOf, nodeAt, toStudyCard } from '@/utils/deck';
import { takeUpdateReload } from '@/utils/update-reload';
import { saveBeforeUpdate } from '@/utils/update-hold';
import { GAME_TITLES, hasPassed, learnStages } from '@/utils/games';
import { passRuns } from '@/utils/pass-runs';
import { sessions } from '@/db/sessions';
import { isSlow, sessionLog } from '@/db/shows';

/** Every answer of this visit goes to the show log. */
const log = sessionLog(crypto.randomUUID());
/** Each section keeps its own spot to continue from. */
const resumeKey = (path: string) => `learn-resume:${path}`;
/** Section whose done screen showed when an update reloaded the page. */
const DONE_KEY = 'learn-done';

interface Resume {
  path: string;
  ids: string[];
  stage: number;
  typeMistakes: string[];
  at?: Position;
}

const route = useRoute();
const store = useStore();
await store.ready;
/** Fixed for the visit, so a resumed stage index keeps pointing at the same game. */
const stages = learnStages(store.settings.value.games, store.settings.value.pronounceFirst);
const { settings } = store;

const pathKey = String(route.query.path ?? '');
const path = pathKey === 'all' ? [] : pathKey.split('-').filter(Boolean).map(Number);
const root = store.deck.value!;
const node = nodeAt(root, path) ?? root;
const sectionCards = cardsOf(node);
const pool = cardsOf(root).map(c => toStudyCard(c));
const known = [...pool.filter(c => store.isLearned(c.id)), ...sectionCards].map(c => c.id);

/** Games passed when the group began, so cards passing games during it keep their group. */
let passedAtStart = { ...store.passed.value };
/** Through every game on; a card learned before games were tracked counts as through. */
const isDone = (id: string) => {
  const games = passedAtStart[id];
  return games ? stages.every(s => hasPassed(games, s, store.scores.value[id]) || !store.playedIn(id, s)) : store.isLearned(id);
};
/** Started under the games on now, but not through them. */
const isStarted = (id: string) => !isDone(id) && stages.some(s => hasPassed(passedAtStart[id], s, store.scores.value[id]));
const NO_RECORD = { lapses: 0, difficulty: 0 };
/** Cards with nothing left to learn: the rest join groups. */
const done = () => Object.fromEntries(pool.filter(c => isDone(c.id)).map(c => [c.id, store.progress.value[c.id] ?? NO_RECORD]));
const followingCards = following(cardsOf(root), sectionCards);
/** Cards a group of this section can hold: its own, the following ones it is topped up with, and any a mix-up brings along. */
const reachable = new Map(cardsOf(root).map(c => [c.id, c]));
/** Cards linked to a mix-up: a group may hold them on top of its top-up. */
const mixedUp = new Set(Object.keys(store.confusions.value));

let saved = readResume();
/** Words of the section started anywhere when the visit began; ones started during it must not bring the offer up. */
const startedBefore = sectionCards.filter(c => isStarted(c.id));
/** Continue or start over was chosen for this group. */
const decided = shallowRef(false);
const resumeIds = shallowRef<string[]>();
const startAt = shallowRef(0);
const resumeAt = shallowRef<Position>();
let position: Position | undefined;

const round = shallowRef(0);
const finished = shallowRef(false);
/** Misses the game ran out of cards to space: left unpassed, they open the next group. */
const carried = shallowRef(new Set<string>());
/** Words not learned yet, in deck order, up to a group; a short group is topped up as set. */
const group = computed(() => {
  void round.value;
  const ids = resumeIds.value;
  const size = settings.value.groupSize;
  const through = done();
  const cards = ids
    ? ids.map(id => reachable.get(id)!)
    : withConfusions(groupOf(sectionCards, through, size, settings.value.topUp === 'next' ? followingCards : undefined), [...reachable.values()].filter(c => !through[c.id]), store.confusions.value, size);
  return cards.map(c => toStudyCard(c));
});
/** The section holds words started anywhere: a saved spot here, or games on passed in any section. */
const offerResume = computed(() => !decided.value && (saved !== undefined || startedBefore.length > 0));
let typeMistakes = new Set<string>();
let stage = 0;
/** Nothing to come back to until a card is answered. */
let answered = false;

/** The interrupted group of this section, if every card of it is still there and the group is not done. */
function readResume(): Resume | undefined {
  try {
    // One spot was shared by every section before; it moves to its own section's key.
    const old = JSON.parse(sessions.get('learn-resume') ?? 'null') as Resume | null;
    sessions.remove('learn-resume');
    if (old && !sessions.get(resumeKey(old.path))) sessions.set(resumeKey(old.path), JSON.stringify(old));
    const data = JSON.parse(sessions.get(resumeKey(pathKey)) ?? 'null') as Resume | null;
    // A top-up adds at most four words; more is a spot saved when top-ups filled a whole group.
    const sectionIds = new Set(sectionCards.map(c => c.id));
    const valid = data?.path === pathKey && data.ids.every(id => reachable.has(id)) && data.ids.filter(id => !sectionIds.has(id) && !mixedUp.has(id)).length < 5 && data.ids.some(id => !isDone(id));
    return valid ? data : undefined;
  } catch {
    return undefined;
  }
}

function writeResume() {
  if (!answered) return;
  try {
    const data: Resume = { path: pathKey, ids: group.value.map(c => c.id), stage, typeMistakes: [...typeMistakes], at: position };
    sessions.set(resumeKey(pathKey), JSON.stringify(data));
  } catch {}
}

function clearResume() {
  try {
    sessions.remove(resumeKey(pathKey));
  } catch {}
}

/** The learner chose to continue, so the session opens on its game's page. */
const continued = shallowRef(false);

/** Continuing picks up the saved spot, misses and all, when it holds the very group built now; else builds it afresh from what each word passed. */
function resume() {
  const fresh = group.value.map(c => c.id);
  if (saved?.at && saved.ids.length === fresh.length && saved.ids.every((id, i) => id === fresh[i])) return restore();
  decided.value = true;
}

/** An update's reload picks up at the very card it left. */
function restore() {
  decided.value = true;
  if (!saved) return;
  resumeIds.value = saved!.ids;
  startAt.value = saved!.stage;
  resumeAt.value = saved!.at;
  typeMistakes = new Set(saved!.typeMistakes);
  answered = true;
}

/** Started words of the section and the saved group, by the game on they passed. */
const startedWords = computed(() => [...new Set([...startedBefore.map(c => c.id), ...(saved?.ids ?? [])])].filter(id => !isDone(id)));
/** Words per game they passed, in game order, shown before they are dropped. */
const passedGames = computed(() =>
  stages.map(s => ({ title: GAME_TITLES[s], count: startedWords.value.filter(id => hasPassed(store.passed.value[id], s, store.scores.value[id])).length })).filter(g => g.count),
);
/** Every game on, with how many words of the group to continue passed it. */
/** Each game's passed words, lined up the same way in every game, drawn as a few runs however large the group. */
const groupProgress = computed(() => {
  const passes = group.value.map(c => stages.map(s => hasPassed(store.passed.value[c.id], s, store.scores.value[c.id]) || !store.playedIn(c.id, s)));
  const runs = passRuns(passes, stages.length);
  return stages.map((s, g) => ({ title: GAME_TITLES[s], passed: passes.filter(p => p[g]).length, of: group.value.length, runs: runs[g]! }));
});
const confirmingStartOver = shallowRef(false);

function askStartOver() {
  if (passedGames.value.length) confirmingStartOver.value = true;
  else startOver();
}

function startOver() {
  confirmingStartOver.value = false;
  store.forgetPassed(startedWords.value);
  passedAtStart = { ...store.passed.value };
  clearResume();
  decided.value = true;
}

/** Recall and typing answers of this group feed each card's score. */
let scoring = sessionScore((id, game) => store.scores.value[id]?.[game], store.saveScore);

function onStage(index: number) {
  stage = index;
  writeResume();
}

function onPosition(at: Position) {
  position = at;
  stage = at.stage;
  writeResume();
}

function onAnswer(id: string, s: Stage, ok: boolean) {
  answered = true;
  scoring.answer(id, s, ok);
  if (s === 'type' && !ok) typeMistakes.add(id);
  writeResume();
}

function onUndo(id: string, s: Stage) {
  scoring.undo(id, s);
  if (s === 'type') typeMistakes.delete(id);
  writeResume();
}

function onFinished() {
  store.learn(Object.fromEntries(group.value.filter(c => !store.isLearned(c.id)).map(c => [c.id, typeMistakes.has(c.id) || carried.value.has(c.id) ? store.Rating.Hard : store.Rating.Good])));
  clearResume();
  finished.value = true;
}

function nextGroup() {
  typeMistakes = new Set();
  carried.value = new Set();
  scoring = sessionScore((id, game) => store.scores.value[id]?.[game], store.saveScore);
  resumeIds.value = undefined;
  startAt.value = 0;
  resumeAt.value = undefined;
  position = undefined;
  answered = false;
  finished.value = false;
  saved = undefined;
  passedAtStart = { ...store.passed.value };
  round.value++;
}

saveBeforeUpdate(() => {
  try {
    if (finished.value) return sessionStorage.setItem(DONE_KEY, pathKey);
  } catch {}
  if (offerResume.value) return;
  answered = true;
  writeResume();
});

// An update's reload must go unnoticed.
if (takeUpdateReload(location.pathname + location.search)) {
  if (takeDone()) finished.value = true;
  else if (saved) restore();
}

function takeDone() {
  try {
    const done = sessionStorage.getItem(DONE_KEY) === pathKey;
    sessionStorage.removeItem(DONE_KEY);
    return done;
  } catch {
    return false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-2">
    <header class="flex items-center gap-3 text-sm">
      <UpLink to="/" class="text-xl leading-none text-stone-500 dark:text-stone-400" data-testid="back">‹</UpLink>
      <h1 class="flex-1 truncate font-semibold">{{ node.name }}</h1>
    </header>
    <div v-if="confirmingStartOver" class="flex flex-1 flex-col gap-4">
      <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p class="text-xl font-semibold">Drop this progress?</p>
        <ul class="text-stone-500 dark:text-stone-400">
          <li v-for="g in passedGames" :key="g.title" data-testid="passed-games">{{ g.title }}: {{ g.count }} {{ g.count === 1 ? 'word' : 'words' }}</li>
        </ul>
        <p>These games will start over for these words.</p>
      </div>
      <div class="flex flex-col gap-3">
        <button class="btn-ghost" data-testid="confirm-start-over" @click="startOver">Drop and start over</button>
        <button class="btn-primary" data-testid="keep-progress" @click="confirmingStartOver = false">Keep progress</button>
      </div>
    </div>
    <div v-else-if="offerResume" class="flex flex-1 flex-col gap-4">
      <div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p class="text-xl font-semibold">Continue where you left off?</p>
        <ul class="flex w-full max-w-xs flex-col gap-2 text-sm text-stone-500 dark:text-stone-400">
          <li v-for="g in groupProgress" :key="g.title" class="flex flex-col gap-1" data-testid="resume-progress">
            <span class="flex justify-between"><span data-testid="resume-game">{{ g.title }}</span><span class="tabular-nums">{{ g.passed }}/{{ g.of }}</span></span>
            <div class="relative h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" role="progressbar" :aria-label="g.title" :aria-valuenow="g.passed" aria-valuemin="0" :aria-valuemax="g.of">
              <div v-for="r in g.runs" :key="r.from" class="absolute inset-y-0 bg-orange-600" data-testid="resume-run" :style="{ left: `${r.from * 100}%`, width: `${(r.to - r.from) * 100}%` }" />
            </div>
          </li>
        </ul>
      </div>
      <div class="flex flex-col gap-3">
        <button class="btn-ghost" data-testid="start-over" @click="askStartOver">Start over</button>
        <button class="btn-primary" data-testid="resume" @click="continued = true; resume()">Continue</button>
      </div>
    </div>
    <div v-else-if="finished || !group.length" class="flex flex-1 flex-col gap-4">
      <p class="flex flex-1 items-center justify-center text-xl font-semibold" data-testid="done">{{ group.length ? 'Group learned' : 'Section learned' }}</p>
      <p v-if="finished && carried.size" class="text-center text-sm opacity-70" data-testid="carried">{{ carried.size }} hard {{ carried.size === 1 ? 'word moves' : 'words move' }} to the next group</p>
      <div class="flex flex-col gap-2">
        <UpLink to="/" class="btn-ghost text-center">To sections</UpLink>
        <button v-if="group.length && finished" class="btn-primary" data-testid="next-group" @click="nextGroup">Next group</button>
      </div>
    </div>
    <Session
      v-else
      :key="round"
      :cards="group"
      :stages="stages"
      :retry-gap="settings.groupSize"
      :start-at="startAt"
      :resume-at="resumeAt"
      :pool="pool"
      :passed="store.passed.value"
      :introducing="stages[0] !== 'intro'"
      :announce="continued || (!resumeAt && stages[0] !== 'intro' && startAt === 0)"
      :known="known"
      :seed="`learn:${pathKey}:${group.map(c => c.id).join()}`"
      lang="nl"
      @stage="onStage"
      @position="onPosition"
      @answer="onAnswer"
      @undo="onUndo"
      :is-slow="isSlow"
      :game-scores="store.scores.value"
      @show="log.show"
      @unshow="log.unshow"
      @passed="store.pass"
      @carried="id => (carried = new Set(carried).add(id))"
      @finished="onFinished"
    />
  </div>
</template>
