<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import type { StudyCard } from '@/utils/deck';
import { play } from '@/utils/play';
import { speak } from '@/utils/speak';

/**
 * `dutchShown`: the prompt is the Dutch side, voiced and playable from the start; `quiet`: only once revealed.
 * `listening`: it is only heard, untimed, until revealed; `pronouncing`: said aloud, untimed, optionally recorded.
 */
const props = defineProps<{ card: StudyCard; dutchShown?: boolean; quiet?: boolean; listening?: boolean; pronouncing?: boolean; state?: { revealed?: 'self' | 'timeout'; mixed?: string[]; linked?: string[] } }>();
/** `mixed`: the card was answered as taken for these others, linked on this step. */
const emit = defineEmits<{ result: [ok: boolean, guessed?: boolean]; progress: [state: { revealed?: 'self' | 'timeout'; mixed?: string[]; linked?: string[] }]; mixed: [others: string[]] }>();

if (props.dutchShown && !props.quiet && !props.state?.revealed) speak(props.card);

const store = useStore();
const SECONDS = store.settings.value.recallSeconds;
const left = shallowRef(SECONDS * 10);
/** `self`: the learner opened it and judges themselves; `timeout`: time ran out. */
const revealed = shallowRef(props.state?.revealed);
/** The learner's own try, played before the right one on reveal. */
const mine = shallowRef<string>();
onBeforeUnmount(() => mine.value && URL.revokeObjectURL(mine.value));
/** The picker for the card this one was taken for is open. */
const mixing = shallowRef(false);
/** Cards taken for this one on this step, linked now or picked again: while any stands, the card cannot pass as remembered. */
const mixedHere = shallowRef(props.state?.mixed ?? []);
/** Of `mixedHere`, the links this step made, so taking one back undoes only those. */
const linkedHere = shallowRef(props.state?.linked ?? []);
const { index } = useCardSheet();
const mixedWords = computed(() => mixedHere.value.map(id => index.value.byId.get(id)?.b ?? id).join(', '));

function pickMixUp(other: string, linked: boolean) {
  if (linked) linkedHere.value = [...linkedHere.value, other];
  setMixed([...mixedHere.value, other]);
}

function dropMixUp(other: string) {
  linkedHere.value = linkedHere.value.filter(id => id !== other);
  setMixed(mixedHere.value.filter(id => id !== other));
}

/** Linked or unlinked from the card sheet while revealed: taken for that word on this step, or no longer. */
watch(() => store.confusions.value[props.card.id] ?? [], (now, was) => {
  if (!revealed.value || mixing.value) return;
  const added = now.filter(id => !was.includes(id) && !mixedHere.value.includes(id));
  const removed = was.filter(id => !now.includes(id) && linkedHere.value.includes(id));
  if (!added.length && !removed.length) return;
  linkedHere.value = [...linkedHere.value.filter(id => !removed.includes(id)), ...added];
  setMixed([...mixedHere.value.filter(id => !removed.includes(id)), ...added]);
}, { flush: 'sync' });

function setMixed(ids: string[]) {
  mixedHere.value = ids;
  emit('progress', { mixed: ids, linked: linkedHere.value });
}

/** A miss; with a mix-up standing, the cards it was taken for are missed too. */
function miss() {
  if (mixedHere.value.length) emit('mixed', mixedHere.value);
  else emit('result', false);
}

const timer = useIntervalFn(() => {
  left.value -= 1;
  if (left.value <= 0) reveal('timeout');
}, 100, { immediate: !revealed.value && !props.listening && !props.pronouncing });
if (revealed.value) left.value = 0;

/** The learner's try, if recorded, then the right one. */
function compare() {
  if (mine.value) play(mine.value, 'mine', () => speak(props.card), () => speak(props.card));
  else speak(props.card);
}

function reveal(how: 'self' | 'timeout') {
  timer.pause();
  revealed.value = how;
  if (props.pronouncing) compare();
  else if (props.quiet) speak(props.card);
  emit('progress', { revealed: how });
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-between gap-2">
    <div class="relative flex flex-1 flex-col gap-2">
      <Prompt v-if="!listening || revealed" :card="card" :secret="!revealed && !pronouncing" />
      <ListenButton v-else :card="card" />
      <Answer :card="card" :hidden="!revealed && !pronouncing" :no-transcription="pronouncing && !revealed" :no-details="!revealed" :silent="dutchShown">
        <template v-if="revealed" #corner>
          <button
            type="button"
            class="flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border text-lg"
            :class="mixedHere.length ? 'border-orange-700 bg-orange-700 px-2 text-white' : 'border-stone-300 text-stone-500 dark:border-stone-600 dark:text-stone-400'"
            aria-label="Mixed up"
            data-testid="mixed-up"
            @click="mixing = true"
          >
            ≈<span v-if="mixedHere.length" class="max-w-32 truncate text-sm font-semibold">{{ mixedWords }}</span>
          </button>
          <MixedBefore class="mt-1 items-start pl-2" :id="card.id" :except="mixedHere" />
        </template>
      </Answer>
    </div>
    <div class="flex flex-col gap-2">
      <div class="h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" :class="{ invisible: revealed || listening || pronouncing }" data-testid="timer">
        <div class="h-full bg-stone-500 transition-[width] duration-100 ease-linear" :style="{ width: `${left / (SECONDS * 10) * 100}%` }" />
      </div>
      <div v-if="pronouncing" class="flex flex-col gap-2">
        <RecordButton v-model="mine" />
        <ExampleButton :card="card" :disabled="!revealed" :comparing="!!mine" @compare="compare" />
      </div>
      <div v-else class="flex gap-2">
        <ExampleButton class="flex-1" :card="card" :disabled="!revealed && (!dutchShown || quiet)" />
        <button v-if="revealed === 'self'" class="btn-ghost" :disabled="!!mixedHere.length" data-testid="guessed" @click="emit('result', false, true)">Guessed</button>
      </div>
      <p v-if="mixedHere.length" class="text-center text-sm text-orange-700 dark:text-orange-400" data-testid="mixed-hint">Taken for {{ mixedWords }}: {{ mixedHere.length > 1 ? 'all' : 'both' }} come back as missed</p>
      <div class="actions flex gap-2"><BackButton /><LaterButton /><div class="grid min-w-0 flex-1">
      <button v-if="!revealed" class="btn-primary" data-testid="reveal" @click="reveal('self')">Reveal</button>
      <div v-else-if="revealed === 'self'" class="flex min-w-0 gap-2 *:min-w-0 *:flex-auto *:px-2 max-[359px]:text-sm">
        <button :class="mixedHere.length ? 'btn-primary' : 'btn-ghost'" data-testid="forgot" @click="miss">{{ pronouncing ? 'Said wrong' : 'Forgot' }}</button>
        <button class="btn-primary" :disabled="!!mixedHere.length" data-testid="remembered" @click="emit('result', true)">{{ pronouncing ? 'Said right' : 'Remembered' }}</button>
      </div>
      <button v-else class="btn-primary" data-testid="next" @click="miss">Next</button>
      </div></div>
    </div>
    <MixUpSheet :id="card.id" :open="mixing" :mixed="mixedHere" :fresh="linkedHere" @pick="pickMixUp" @drop="dropMixUp" @close="mixing = false" />
  </div>
</template>
