<script setup lang="ts">
import { noteLines, toStudyCard } from '@/utils/deck';
import { cardKey, exampleKey } from '@/utils/play';
import { speak, speakExample } from '@/utils/speak';

const sheet = useCardSheet();
const { isLearned } = useStore();
const layer = computed(() => sheet.layers.value.at(-1));
const card = computed(() => layer.value && sheet.index.value.byId.get(layer.value.id));
const study = computed(() => card.value && toStudyCard(card.value));
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Cards built on this one, the secret one left out; under each meaning when the card has several. */
const derived = computed(() => {
  if (!card.value) return [];
  const words = (sheet.index.value.derived.get(card.value.id) ?? [])
    .filter(d => d.id !== sheet.secret.value)
    .map(d => ({ ...d, card: sheet.index.value.byId.get(d.id)! }));
  const senses = card.value.f.split('; ');
  if (senses.length < 2) return words.length ? [{ sense: undefined, words }] : [];
  const groups = senses.map(sense => ({ sense, words: words.filter(w => w.gloss && same(w.gloss, sense)) }));
  const rest = words.filter(w => !senses.some(s => w.gloss && same(w.gloss, s)));
  return [...groups, ...(rest.length ? [{ sense: undefined, words: rest }] : [])].filter(g => g.words.length);
});
</script>

<template>
  <Transition name="sheet" :duration="200">
    <div v-if="card && study" class="contents">
      <div class="fixed inset-0 z-40 bg-black/60" data-testid="card-sheet-backdrop" @click="sheet.close()" />
      <div class="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-md flex-col gap-2 overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] dark:bg-stone-900" role="dialog" data-testid="card-sheet">
        <div class="flex items-center gap-2">
          <button v-if="sheet.layers.value.length > 1" type="button" class="btn-ghost px-2" aria-label="Back" data-testid="card-sheet-back" @click="sheet.back()">‹</button>
          <p class="flex-1 text-xl font-semibold" data-testid="card-sheet-word">{{ card.b }}</p>
          <PlayButton class="btn-ghost px-2" aria-label="Play" data-testid="card-sheet-play" :sound="cardKey(study)" @play="speak(study)" />
          <button type="button" class="btn-ghost px-2" aria-label="Close" data-testid="card-sheet-close" @click="sheet.close()">✕</button>
        </div>
        <p v-if="card.tr" class="text-stone-500" data-testid="card-sheet-transcription">[{{ card.tr }}]</p>
        <p data-testid="card-sheet-meaning">
          <span v-for="sense in card.f.split('; ')" :key="sense" class="block" :class="{ 'font-semibold text-sky-700 dark:text-sky-400': layer?.gloss && same(layer.gloss, sense) && card.f.includes('; ') }" data-testid="card-sheet-sense">{{ sense }}</span>
        </p>
        <p v-if="card.n" class="text-sm italic text-stone-500" data-testid="card-sheet-note">
          <span v-for="(line, i) in noteLines(card.n)" :key="i" class="block" :class="{ 'text-[oklch(55.3%_0.2_25)]': line.exception }"><NoteText :text="line.text" :self="card.id" /></span>
        </p>
        <div v-if="card.xb" class="flex items-start gap-2" data-testid="card-sheet-example">
          <div class="flex-1 text-sm">
            <p>{{ card.xb }}</p>
            <p v-if="card.xf" class="text-stone-500">{{ card.xf }}</p>
          </div>
          <PlayButton class="btn-ghost px-2" aria-label="Play example" :sound="exampleKey(study)" @play="speakExample(study)" />
        </div>
        <p class="text-xs text-stone-500" data-testid="card-sheet-status">{{ isLearned(card.id) ? 'Learned' : 'Not learned yet' }}</p>
        <section v-if="derived.length" class="flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-700" data-testid="card-sheet-derived">
          <p class="text-xs font-semibold uppercase text-stone-500">Words built on it</p>
          <div v-for="group in derived" :key="group.sense ?? ''" class="flex flex-col">
            <p v-if="group.sense" class="text-sm font-semibold" :class="{ 'text-sky-700 dark:text-sky-400': layer?.gloss && same(layer.gloss, group.sense) }" data-testid="card-sheet-derived-sense">{{ group.sense }}</p>
            <button v-for="word in group.words" :key="word.id" type="button" class="flex gap-2 py-1 text-left" data-testid="card-sheet-derived-word" @click="sheet.open(word.id)">
              <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.card.b }}</span>
              <span class="flex-1 text-stone-500">{{ word.card.f }}</span>
              <span v-if="!isLearned(word.id)" class="text-xs text-stone-400">new</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </Transition>
</template>
