<script setup lang="ts">
import { watch } from 'vue';
import { copyText } from '@/utils/copy';
import { letterCount, type StudyCard } from '@/utils/deck';
import { speak } from '@/utils/speak';

const sheet = useCardSheet();

// Hidden answers still take their space, so revealing one does not shift the prompt.
const props = defineProps<{ card: StudyCard; hidden?: boolean; silent?: boolean; right?: boolean; noTranscription?: boolean }>();
/** An affix's example on this side is its Dutch word, with the affix marked; otherwise this is the side of its meaning. */
const dutchExample = computed(() => !!props.card.affix && props.card.answerExample === props.card.nl);
watch(() => props.hidden, hidden => hidden || props.silent || speak(props.card), { immediate: true });
</script>

<template>
  <div data-testid="answer-card" class="relative flex min-h-0 flex-1 basis-0 flex-col justify-center-safe overflow-hidden w-full self-stretch rounded-xl border border-stone-300 bg-white px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900 border-dashed" :class="{ 'border-solid': !hidden }">
    <div class="flex min-h-0 flex-col items-center gap-1 text-center" :class="{ invisible: hidden }" :aria-hidden="hidden">
    <slot name="above" />
    <p data-testid="answer" :class="right ? 'text-green-600' : 'text-orange-600'" class="cursor-copy px-7 text-xl font-semibold" @click="hidden || copyText(card.answer)">{{ card.answer }}</p>
    <!-- Only the word stays put, clear of the corner buttons; the rest scrolls. -->
    <div v-if="card.tr || card.answerNote || card.answerExample || card.breakdown" class="flex min-h-0 w-full flex-col items-center gap-1 overflow-y-auto overscroll-contain" data-testid="answer-scroll">
    <p v-if="card.tr" class="text-stone-500" :class="{ invisible: noTranscription }" data-testid="transcription">[<AffixWord v-if="card.affix?.tr" :word="card.tr" :affix="card.affix.dutch" :size="letterCount(card.affix.tr)" /><template v-else>{{ card.tr }}</template>]</p>
    <!-- The example and its meaning stand apart from the rules below. -->
    <div v-if="card.answerExample || (card.affix && !dutchExample && card.breakdown)" class="flex w-fit max-w-full flex-col items-center gap-0.5 rounded-lg bg-stone-100 px-3 py-1.5 dark:bg-stone-800" data-testid="answer-context">
    <p v-if="card.answerExample" class="cursor-copy text-sm text-stone-700 dark:text-stone-200" data-testid="answer-example" @click="hidden || copyText(card.answerExample)"><AffixWord v-if="dutchExample" :word="card.answerExample" :affix="card.affix!.dutch" /><template v-else>{{ card.answerExample }}</template></p>
    <p v-if="card.affix && !dutchExample && card.breakdown" class="text-sm text-stone-600 dark:text-stone-300" data-testid="breakdown"><NoteText :text="card.breakdown" :self="card.id" breakdown /></p>
    </div>
    <NoteList v-if="card.answerNote" :note="card.answerNote" :kinds="card.answerKinds" :self="card.id" :class="{ 'mt-1': card.answerExample || (card.affix && card.breakdown) }" testid="answer-note" />
    </div>
    </div>
    <button v-if="!hidden" type="button" class="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full border border-stone-300 text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400" aria-label="Details" data-testid="card-details" @click.stop="sheet.open(card.id)">?</button>
    <div v-if="hidden && $slots.default" class="absolute inset-0 flex items-center justify-center px-3 text-center text-xl"><slot /></div>
  </div>
</template>
