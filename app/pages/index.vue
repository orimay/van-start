<script setup lang="ts">
import { useMenu } from '@/composables/useMenu';
import { useNow } from '@vueuse/core';
import { computed, shallowRef } from 'vue';
import { GAME_TITLES, type ReviewGame, REVIEW_GAMES } from '@/utils/games';
import { dayProgress, reviewedOn } from '@/utils/today';
import { applyUpdates } from '@/utils/check-for-update';
import { longPress } from '@/composables/useLongPress';
import type { ResetRequest } from '@/components/ResetSheet.vue';

applyUpdates();
const store = useStore();
await store.ready;
const { deck, progress, settings } = store;
const now = useNow({ interval: 60_000 });

const learnedCount = computed(() => Object.keys(progress.value).filter(id => store.isThrough(id)).length);
/** Review games that have cards due, with how many. */
const dueGames = computed(() => {
  void store.reviews.value;
  return REVIEW_GAMES.map(game => ({ game, ids: store.dueIn(game, now.value) })).filter(g => g.ids.length);
});
/** One due review per card and game. */
const dueIds = computed(() => dueGames.value.flatMap(({ game, ids }) => ids.map(id => `${game}:${id}`)));
const menu = useMenu('review-menu');
const reviewLink = (game: string) => ({ path: '/review', query: { game } });
/** Today's reviews per review game, each against its own due cards. */
const today = computed(() => {
  const reviewed = reviewedOn(store.reviewLog.value, now.value);
  return REVIEW_GAMES
    .map(game => ({ game, ...dayProgress(reviewed.filter(key => key.startsWith(`${game}:`)), dueIds.value.filter(key => key.startsWith(`${game}:`))) }))
    .filter(g => g.total);
});

/** A long press on review, or on one of its games, offers to bring every learned word back to now. */
const resetting = shallowRef<ResetRequest>();
function askReset(games: readonly ReviewGame[], title: string) {
  const ids = Object.keys(progress.value).filter(id => store.isLearned(id));
  resetting.value = { title, what: games.length > 1 ? 'reviews in every game' : `${GAME_TITLES[games[0]!]} reviews`, count: ids.length, reset: () => store.forgetReviews(ids, games) };
}

const todayOf = (game: string) => today.value.find(t => t.game === game) ?? { done: 0, total: 0 };

if (!store.configured.value) await navigateTo('/settings');
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Van start</h1>
        <NuxtLink to="/settings" class="text-stone-500" aria-label="Settings" data-testid="settings">
          <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </NuxtLink>
      </div>
      <div class="flex items-center gap-3 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <div class="flex-1">
          <p v-if="dueGames.length" class="flex items-center gap-2 font-medium" data-testid="reminder"><span class="h-2 w-2 rounded-full bg-orange-600" aria-hidden="true" />Cards are waiting for review</p>
          <p class="text-sm text-stone-500">Learned {{ learnedCount }}</p>
        </div>
        <span v-if="dueGames.length" class="menu-anchor">
          <button class="btn-primary" data-testid="review" v-on="longPress(() => askReset(REVIEW_GAMES, 'Review: every game'))" @click="menu.show()">Review</button>
          <Transition name="sheet" :duration="200">
          <div v-if="menu.openKey.value !== undefined" class="contents">
            <div class="fixed inset-0 z-20" @click="menu.hide()" />
            <div class="menu z-30 flex w-44 flex-col gap-1 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700" data-testid="review-menu">
              <p class="hidden px-2 font-semibold max-sm:block" data-testid="sheet-title">Review</p>
              <NuxtLink v-for="{ game } in dueGames" :key="game" :to="reviewLink(game)" replace class="flex flex-col gap-1 rounded-lg px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800" :data-testid="`review-${game}`" v-on="longPress(() => askReset([game], `Review: ${GAME_TITLES[game]}`))">
                <span class="flex justify-between"><span>{{ GAME_TITLES[game] }}</span><span class="text-xs tabular-nums text-stone-500">{{ todayOf(game).done }}/{{ todayOf(game).total }}</span></span>
                <ProgressBar :value="todayOf(game).done / todayOf(game).total" />
              </NuxtLink>
            </div>
          </div>
          </Transition>
        </span>
      </div>
    </header>

    <section class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Sections</h2>
        <NuxtLink to="/edit" class="text-sm text-orange-600" data-testid="edit">Edit</NuxtLink>
      </div>
      <SectionTree v-if="deck" :nodes="[deck]" :path="[]" whole />
    </section>
    <ResetSheet :request="resetting" @close="resetting = undefined" />

  </div>
</template>
