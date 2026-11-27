<script setup lang="ts">
import { letterCount, toStudyCard } from '@/utils/deck';
import { cardKey, exampleKey } from '@/utils/play';
import { speak, speakExample } from '@/utils/speak';

const sheet = useCardSheet();
const { isLearned, confusions, unconfuse, familyOf, relearn, settings } = useStore();
const layer = computed(() => sheet.layers.value.at(-1));
const card = computed(() => layer.value && sheet.index.value.byId.get(layer.value.id));
const study = computed(() => card.value && toStudyCard(card.value));
/** An old root notes link to: no game asks it, so it is never learned or mixed up. */
const root = computed(() => card.value?.k === 'root');
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Cards built on this one in deck order, the secret one left out; each with the meaning it builds on when the card has several. */
const derived = computed(() => {
  if (!card.value) return [];
  const senses = card.value.f.split('; ');
  return (sheet.index.value.derived.get(card.value.id) ?? [])
    .filter(d => d.id !== sheet.secret.value)
    .map(d => ({ ...d, card: sheet.index.value.byId.get(d.id)!, sense: senses.length > 1 ? senses.find(s => d.gloss && same(d.gloss, s)) : undefined }));
});

/** Cards that are a form of this one, a variant of it or easy to confuse with it, in deck order, the secret one left out. */
const related = computed(() => {
  if (!card.value) return [];
  return (sheet.index.value.related.get(card.value.id) ?? []).filter(r => r.id !== sheet.secret.value).map(r => ({ ...r, card: sheet.index.value.byId.get(r.id)! }));
});

/** Cards the learner mixed up with this one, the secret one left out. */
const mixedUp = computed(() => (card.value ? (confusions.value[card.value.id] ?? []) : []).filter(id => id !== sheet.secret.value).flatMap(id => sheet.index.value.byId.get(id) ?? []));
/** The search for a card to link as mixed up with this one is open. */
const mixing = shallowRef(false);

/** Learned words built on this one, at any depth: learning it again can take them along. */
const learnedFamily = computed(() => (card.value ? familyOf(card.value.id).filter(isLearned) : []));
/** The choice of what learning the word again takes along is open. */
const choosing = shallowRef(false);
const choices = computed(() => {
  const n = learnedFamily.value.length;
  const deep = { deep: true, label: `With ${n} learned ${n === 1 ? 'word' : 'words'} from it` };
  const one = { deep: false, label: 'Only this word' };
  return settings.value.relearnDeep ? [deep, one] : [one, deep];
});
const choiceButtons = useTemplateRef<HTMLButtonElement[]>('choiceButtons');

async function onRelearn() {
  if (!learnedFamily.value.length) return relearn(card.value!.id, false);
  choosing.value = true;
  await nextTick();
  choiceButtons.value?.[0]?.focus();
}

function doRelearn(deep: boolean) {
  relearn(card.value!.id, deep);
  choosing.value = false;
}

watch(() => card.value?.id, () => (choosing.value = false));

const body = useTemplateRef('body');
const { dragY, dragging, onDragStart } = useSheetDrag(body, () => sheet.close());
</script>

<template>
  <Transition name="sheet-fade">
    <div v-if="card" class="fixed inset-0 z-40 bg-black/60" data-testid="card-sheet-backdrop" @click="sheet.close()" />
  </Transition>
  <Transition name="sheet-slide" @after-leave="dragY = 0">
    <div
      v-if="card && study"
      class="sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-stone-900"
      :class="{ 'sheet-dragging': dragging }"
      :style="dragY ? { translate: `0 ${dragY}px` } : undefined"
      role="dialog"
      data-testid="card-sheet"
      @pointerdown="onDragStart"
    >
      <div class="flex shrink-0 touch-none flex-col gap-1 px-4 pt-2 pb-2">
        <div class="mx-auto mb-1 h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
        <div class="flex items-center gap-2">
          <button v-if="sheet.layers.value.length > 1" type="button" class="btn-ghost px-2" aria-label="Back" data-testid="card-sheet-back" @click="sheet.back()">‹</button>
          <p class="flex-1 text-xl font-semibold" data-testid="card-sheet-word">{{ card.b }}</p>
          <PlayButton class="btn-ghost px-2" aria-label="Play" data-testid="card-sheet-play" :sound="cardKey(study)" @play="speak(study)" />
          <button type="button" class="btn-ghost px-2" aria-label="Close" data-testid="card-sheet-close" @click="sheet.close()">✕</button>
        </div>
        <p v-if="card.tr" class="text-stone-500 dark:text-stone-400" data-testid="card-sheet-transcription">[{{ card.tr }}]</p>
      </div>
      <div ref="body" class="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-2" data-testid="card-sheet-body">
        <p data-testid="card-sheet-meaning">
          <span v-for="sense in card.f.split('; ')" :key="sense" class="block" :class="{ 'font-semibold text-sky-700 dark:text-sky-400': layer?.gloss && same(layer.gloss, sense) && card.f.includes('; ') }" data-testid="card-sheet-sense">{{ sense }}</span>
        </p>
        <NoteList v-if="card.n" :note="card.n" :kinds="study?.promptKinds" :self="card.id" class="mx-0!" testid="card-sheet-note" />
        <div v-if="card.xb" class="flex items-start gap-2" data-testid="card-sheet-example">
          <div class="flex-1 text-sm">
            <p><AffixWord v-if="study?.affix" :word="card.xb" :affix="study.affix.dutch" /><SoundWord v-else-if="study?.marks" :text="study.marks.nl" /><template v-else>{{ card.xb }}</template></p>
            <p v-if="study?.affix?.tr && study.tr" class="text-stone-500 dark:text-stone-400">[<AffixWord :word="study.tr" :affix="study.affix.dutch" :size="letterCount(study.affix.tr)" />]</p>
            <p v-else-if="study?.marks?.tr" class="text-stone-500 dark:text-stone-400">[<SoundWord :text="study.marks.tr" />]</p>
            <p v-if="card.xf" class="text-stone-500 dark:text-stone-400">{{ card.xf }}</p>
          </div>
          <PlayButton class="btn-ghost px-2" aria-label="Play example" :sound="exampleKey(study)" @play="speakExample(study)" />
        </div>
        <div class="flex items-center gap-2">
          <p class="flex-1 text-xs text-stone-500 dark:text-stone-400" data-testid="card-sheet-status" aria-live="polite">{{ root ? 'Old word, not studied' : isLearned(card.id) ? 'Learned' : 'Not learned yet' }}</p>
          <button v-if="!root && !choosing && (isLearned(card.id) || learnedFamily.length)" type="button" class="btn-ghost px-2 py-1 text-sm" data-testid="card-sheet-relearn" @click="onRelearn"><span aria-hidden="true">↺</span> Learn again</button>
        </div>
        <div v-if="choosing" role="group" aria-label="Learn again" class="flex flex-col gap-1 rounded-lg bg-stone-100 p-2 dark:bg-stone-800" data-testid="card-sheet-relearn-choices">
          <button v-for="(choice, i) in choices" ref="choiceButtons" :key="choice.label" type="button" :class="i ? 'btn-ghost' : 'btn-primary'" class="px-3 py-2 text-left text-sm" data-testid="card-sheet-relearn-choice" @click="doRelearn(choice.deep)">{{ choice.label }}</button>
          <button type="button" class="btn-ghost px-3 py-2 text-left text-sm" data-testid="card-sheet-relearn-choice" @click="choosing = false">Cancel</button>
        </div>
        <section v-if="derived.length" class="flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-700" data-testid="card-sheet-derived">
          <p class="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Words built on it</p>
          <button v-for="word in derived" :key="word.id" type="button" class="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1 text-left" data-testid="card-sheet-derived-word" @click="sheet.open(word.id)">
            <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.card.b }}</span>
            <span class="flex-1 text-stone-500 dark:text-stone-400">{{ word.card.f }}</span>
            <span v-if="!isLearned(word.id)" class="text-xs text-stone-500 dark:text-stone-400">new</span>
            <span v-if="word.sense" class="basis-full"><span class="rounded bg-stone-100 px-1.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400" :class="{ 'text-sky-700 dark:text-sky-400': layer?.gloss && same(layer.gloss, word.sense) }">{{ word.sense }}</span></span>
          </button>
        </section>
        <section v-if="related.length" class="flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-700" data-testid="card-sheet-related">
          <p class="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Related words</p>
          <button v-for="word in related" :key="word.id" type="button" class="flex items-baseline gap-2 py-1 text-left" data-testid="card-sheet-related-word" @click="sheet.open(word.id)">
            <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.card.b }}</span>
            <span class="flex-1 text-stone-500 dark:text-stone-400">{{ word.card.f }}</span>
            <span v-if="!isLearned(word.id)" class="text-xs text-stone-500 dark:text-stone-400">new</span>
          </button>
        </section>
        <section v-if="!root" class="flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-700" data-testid="card-sheet-mixed">
          <div class="flex items-center">
            <p class="flex-1 text-xs font-semibold uppercase text-stone-500 dark:text-stone-400">Mixed up with</p>
            <button type="button" class="btn-ghost px-2 py-1 text-sm" data-testid="card-sheet-mixed-add" @click="mixing = true">+ Add</button>
          </div>
          <div v-for="word in mixedUp" :key="word.id" class="flex items-center gap-1">
            <button type="button" class="flex flex-1 items-baseline gap-2 py-1 text-left" data-testid="card-sheet-mixed-word" @click="sheet.open(word.id)">
              <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.b }}</span>
              <span class="flex-1 text-stone-500 dark:text-stone-400">{{ word.f }}</span>
            </button>
            <button type="button" class="btn-ghost px-2" :aria-label="`Not mixed up with ${word.b}`" data-testid="card-sheet-mixed-remove" @click="unconfuse(card.id, word.id)">✕</button>
          </div>
        </section>
      </div>
    </div>
  </Transition>
  <MixUpSheet v-if="card && !root" :id="card.id" :open="mixing" @close="mixing = false" />
</template>
