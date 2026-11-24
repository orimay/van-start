<script setup lang="ts">
import { useMenu } from '@/composables/useMenu';
import { shallowRef } from 'vue';
import { cardsOf, type DeckNode, isAffixCard } from '@/utils/deck';
import { reviewedOn } from '@/utils/today';
import { GAME_TITLES, playsIn, type ReviewGame, REVIEW_GAMES } from '@/utils/games';
import { longPress } from '@/composables/useLongPress';
import type { ResetRequest } from '@/components/ResetSheet.vue';
import { findSection } from '@/utils/custom';
import { kindsIn } from '@/utils/kinds';

/** `whole`: the nodes are the deck root itself, reached by the path `all`. */
const props = defineProps<{ nodes: DeckNode[]; path: number[]; whole?: boolean }>();
const { isLearned, isThrough, settings, library, reviewLog, forgetLearning, forgetReviews } = useStore();
const open = shallowRef<number | undefined>(props.whole ? 0 : undefined);
/** Row asking whether to learn new cards or review learned ones. */
const menu = useMenu('start-menu');
/** Unique across nested trees; the whole-deck row passes its children an empty path. */
const keyOf = (i: number) => (props.whole ? 'all' : [...props.path, i].join('.'));

/** What the section can start: learning while cards are new, and a review per review game once any is learned. */
function optionsOf(node: DeckNode, i: number) {
  const { learned, total } = countsOf(node);
  const all = cardsOf(node).map(c => c.id);
  const learn = learned < total ? [{ id: 'learn', label: 'Learn', to: linkTo('learn', i), done: learned, total, reset: { what: 'learning', count: all.length, reset: () => forgetLearning(all) } }] : [];
  const reviewed = reviewedOn(reviewLog.value, new Date());
  const known = cardsOf(node).filter(c => isLearned(c.id));
  const review = REVIEW_GAMES.map(game => ({ game, ids: known.filter(c => playsIn(isAffixCard(c), game)).map(c => c.id) }))
    .filter(({ ids }) => ids.length)
    .map(({ game, ids }) => ({ id: `review-${game}`, label: `Review: ${GAME_TITLES[game]}`, to: linkTo('review', i, game), done: ids.filter(id => reviewed.includes(`${game}:${id}`)).length, total: ids.length, reset: { what: `${GAME_TITLES[game]} reviews`, count: ids.length, reset: () => forgetReviews(ids, [game]) } }));
  return [...review, ...learn];
}

/** A long press on an option offers to reset what it starts. */
const resetting = shallowRef<ResetRequest>();
const askReset = (node: DeckNode, o: { label: string; reset: Omit<ResetRequest, 'title'> }) => (resetting.value = { title: `${node.name}: ${o.label}`, ...o.reset });

/** The section as in the library, its switched-off cards included. */
const fullOf = (node: DeckNode) => (library.value && findSection(library.value, node.id)) || node;
/** Sentences or combinations it holds, to switch from its menu. */
const switchable = (node: DeckNode) => kindsIn(fullOf(node)).length > 0;
const ownKinds = (node: DeckNode) => Object.keys(settings.value.groupKinds?.[node.id] ?? {}).length > 0;
const switching = shallowRef<DeckNode>();
function openKinds(node: DeckNode) {
  menu.hide();
  switching.value = fullOf(node);
}

/** Goes straight in when only one thing is possible, else asks. */
async function start(node: DeckNode, i: number) {
  const options = optionsOf(node, i);
  if (options.length > 1 || switchable(node)) return void menu.show(keyOf(i));
  if (options[0]) await navigateTo(options[0].to);
}

function countsOf(node: DeckNode) {
  const cards = cardsOf(node);
  return { learned: cards.filter(c => isThrough(c.id)).length, total: cards.length };
}

/** Learned share, 0 for a section with every card switched off. */
function shareOf(node: DeckNode) {
  const { learned, total } = countsOf(node);
  return total ? learned / total : 0;
}

/** Learning groups the section's new cards still make, out of all it makes. */
function groupsOf(node: DeckNode) {
  const { learned, total } = countsOf(node);
  const size = settings.value.groupSize;
  return { left: Math.ceil((total - learned) / size), total: Math.ceil(total / size) };
}

function linkTo(page: 'learn' | 'review', i: number, game?: ReviewGame) {
  return { path: `/${page}`, query: { path: props.whole ? 'all' : [...props.path, i].join('-'), ...(game && { game }) } };
}
</script>

<template>
  <div>
  <ul class="flex flex-col gap-1">
    <li v-for="(node, i) in nodes" :key="i">
      <div class="flex items-center gap-2 rounded-lg py-1.5" :data-testid="`section-${[...path, i].join('-')}`">
        <button class="flex flex-1 items-center gap-2 text-left" @click="open = open === i ? undefined : i">
          <span class="w-4 text-stone-400">{{ node.children ? (open === i ? '▾' : '▸') : '' }}</span>
          <span class="flex flex-1 flex-col gap-1">
            <span>{{ node.name }}<span v-if="ownKinds(node)" class="ml-2 rounded bg-orange-100 px-1.5 text-xs text-orange-800 dark:bg-orange-950 dark:text-orange-300" title="Keeps its own choice of cards" data-testid="kinds-own">own cards</span></span>
            <span class="flex items-center gap-2">
              <ProgressBar :value="shareOf(node)" class="max-w-40 flex-1" />
              <span class="w-9 text-right text-xs font-semibold tabular-nums text-stone-700 dark:text-stone-300" data-testid="learned-share">{{ Math.round(100 * shareOf(node)) }}%</span>
              <span class="rounded bg-stone-100 px-1.5 text-xs tabular-nums text-stone-500 dark:bg-stone-800" data-testid="learned-count">{{ countsOf(node).learned }}/{{ countsOf(node).total }}</span>
            </span>
            <span v-if="groupsOf(node).left" class="text-xs text-stone-500" data-testid="groups-left">{{ groupsOf(node).left }}/{{ groupsOf(node).total }} groups left</span>
          </span>
        </button>
        <span class="menu-anchor">
  <button class="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-white" aria-label="Start" data-testid="start" @click="start(node, i)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path transform="translate(1.25 0)" d="M5 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 5 4.5Z" /></svg>
          </button>
          <Transition name="sheet" :duration="200">
          <div v-if="menu.openKey.value === keyOf(i)" class="contents">
            <div class="fixed inset-0 z-20" @click="menu.hide()" />
            <div class="menu z-30 flex w-44 flex-col gap-1 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700" data-testid="start-menu">
              <p class="mb-1 hidden border-b border-stone-200 px-2 py-3 text-center font-semibold max-sm:block dark:border-stone-700" data-testid="sheet-title">{{ node.name }}</p>
              <NuxtLink v-for="o in optionsOf(node, i)" :key="o.id" :to="o.to" replace class="flex flex-col gap-1 rounded-lg px-3 py-2" :class="o.id === 'learn' ? 'bg-orange-600 text-white' : 'hover:bg-stone-100 dark:hover:bg-stone-800'" :data-testid="o.id" :data-primary="o.id === 'learn' || undefined" v-on="longPress(() => askReset(node, o))">
                <span class="flex justify-between gap-2"><span>{{ o.label }}</span><span v-if="o.total" class="text-xs tabular-nums" :class="o.id === 'learn' ? 'text-orange-100' : 'text-stone-500'">{{ o.done }}/{{ o.total }}</span></span>
                <ProgressBar v-if="o.total" :value="o.done / o.total" :inverted="o.id === 'learn'" />
              </NuxtLink>
              <button v-if="switchable(node)" class="rounded-lg px-3 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800" data-testid="kinds" @click="openKinds(node)">Cards</button>
            </div>
          </div>
          </Transition>
        </span>
      </div>
      <SectionTree v-if="open === i && node.children" :nodes="node.children" :path="whole ? [] : [...path, i]" class="ml-4" />
    </li>
  </ul>
  <ResetSheet :request="resetting" @close="resetting = undefined" />
  <KindSheet :node="switching" @close="switching = undefined" />
  </div>
</template>
