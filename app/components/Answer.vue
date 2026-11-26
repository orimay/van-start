<script setup lang="ts">
import { watch } from 'vue';
import { copyText } from '@/utils/copy';
import { letterCount, unmark, type StudyCard } from '@/utils/deck';
import { surfaceOf } from '@/utils/surface';
import { speak } from '@/utils/speak';
import { wordsWithAffix } from '@/utils/links';

const sheet = useCardSheet();
const { isLearned } = useStore();

// Hidden answers still take their space, so revealing one does not shift the prompt.
const props = defineProps<{ card: StudyCard; hidden?: boolean; silent?: boolean; right?: boolean; noTranscription?: boolean; noDetails?: boolean }>();
/** An affix's example on this side is its Dutch word, with the affix marked; otherwise this is the side of its meaning. */
const dutchExample = computed(() => !!props.card.affix && props.card.answerExample === props.card.nl);
/** Sound and letter cards mark their sound in the Dutch example words. */
const markedExample = computed(() => props.card.marks && unmark(props.card.marks.nl) === props.card.answerExample ? props.card.marks.nl : undefined);
/** Words the deck builds on the affix, four at most, the learned ones first: one or two leave it abstract. */
const affixWords = computed(() => {
  if (!props.card.affix) return [];
  const words = wordsWithAffix(sheet.index.value, props.card.id);
  return [...words.filter(w => isLearned(w.id)), ...words.filter(w => !isLearned(w.id))].slice(0, 4);
});
watch(() => props.hidden, hidden => hidden || props.silent || speak(props.card), { immediate: true });
</script>

<template>
  <div data-testid="answer-card" class="relative flex min-h-0 flex-1 basis-0 flex-col justify-center-safe overflow-hidden w-full self-stretch rounded-xl border px-3 py-2 shadow-sm border-dashed" :class="[surfaceOf(card), { 'border-solid': !hidden }]">
    <div class="flex min-h-0 flex-col items-center gap-1 text-center" :class="{ invisible: hidden }" :aria-hidden="hidden">
    <slot name="above" />
    <p data-testid="answer" :class="right ? 'text-green-700 dark:text-green-600' : 'text-orange-700 dark:text-orange-400'" class="cursor-copy px-7 text-xl font-semibold" @click="hidden || copyText(card.answer)"><KeepAffixes :text="card.answer" /><AffixTag :card="card" :text="card.answer" /></p>
    <!-- Only the word stays put, clear of the corner buttons; the rest scrolls. The transcription sits by its word, each block after it a group apart. -->
    <ScrollBox v-if="card.tr || card.answerNote || card.answerExample || card.breakdown || affixWords.length" box-class="gap-3" :class="{ 'mt-2': !card.tr }" testid="answer-scroll">
    <p v-if="card.tr" class="text-stone-500 dark:text-stone-400" :class="{ invisible: noTranscription }" data-testid="transcription">[<AffixWord v-if="card.affix?.tr" :word="card.tr" :affix="card.affix.dutch" :size="letterCount(card.affix.tr)" /><SoundWord v-else-if="card.marks?.tr" :text="card.marks.tr" /><template v-else>{{ card.tr }}</template>]</p>
    <!-- Where the example comes from, then the example, apart from the rules below. -->
    <div v-if="card.answerExample || (card.affix && !dutchExample && card.breakdown)" class="flex w-fit max-w-full flex-col items-center gap-0.5 rounded-lg bg-stone-100 px-3 py-1.5 dark:bg-stone-800" data-testid="answer-context">
    <p v-if="card.affix && !dutchExample && card.breakdown" class="text-sm text-stone-600 dark:text-stone-300" data-testid="breakdown"><NoteText :text="card.breakdown" :self="card.id" breakdown /></p>
    <p v-if="card.answerExample" class="text-sm text-stone-700 dark:text-stone-200"><ContextIcon class="mr-1 inline-block align-text-bottom" data-testid="context-icon" /><span class="cursor-copy" data-testid="answer-example" @click="hidden || copyText(card.answerExample)"><AffixWord v-if="dutchExample" :word="card.answerExample" :affix="card.affix!.dutch" /><SoundWord v-else-if="markedExample" :text="markedExample" /><template v-else>{{ card.answerExample }}</template></span></p>
    </div>
    <NoteList v-if="card.answerNote" :note="card.answerNote" :kinds="card.answerKinds" :self="card.id" testid="answer-note" />
    <ul v-if="affixWords.length" class="flex flex-col items-center gap-0.5 text-sm" aria-label="Words with it" data-testid="affix-words">
      <li v-for="word in affixWords" :key="word.id"><button type="button" data-testid="affix-word" @click.stop="sheet.open(word.id)"><AffixWord :word="word.b" :affix="card.affix!.dutch" class="underline decoration-sky-700 decoration-dotted decoration-2 underline-offset-4 dark:decoration-sky-400" /> <span class="text-stone-500 dark:text-stone-400">{{ word.f.split('; ')[0] }}</span></button></li>
    </ul>
    </ScrollBox>
    </div>
    <button v-if="!hidden && !noDetails" type="button" class="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full border border-stone-300 text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400" aria-label="Details" data-testid="card-details" @click.stop="sheet.open(card.id)">?</button>
    <div v-if="!hidden && $slots.corner" class="absolute top-1 left-1"><slot name="corner" /></div>
    <div v-if="hidden && $slots.default" class="absolute inset-0 flex items-center justify-center px-3 text-center text-xl"><slot /></div>
  </div>
</template>
