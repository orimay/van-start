<script setup lang="ts">
import { watch } from 'vue';
import { copyText } from '@/utils/copy';
import { noteLines, type StudyCard } from '@/utils/deck';
import { speak } from '@/utils/speak';

// Hidden answers still take their space, so revealing one does not shift the prompt.
const props = defineProps<{ card: StudyCard; hidden?: boolean; silent?: boolean; right?: boolean; noTranscription?: boolean }>();
watch(() => props.hidden, hidden => hidden || props.silent || speak(props.card), { immediate: true });
</script>

<template>
  <div data-testid="answer-card" class="relative flex min-h-0 flex-1 basis-0 flex-col justify-center overflow-y-auto w-full self-stretch rounded-xl border border-stone-300 bg-white px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900 border-dashed" :class="{ 'border-solid': !hidden }">
    <div class="flex flex-col items-center gap-1 text-center" :class="{ invisible: hidden }" :aria-hidden="hidden">
    <slot name="above" />
    <p data-testid="answer" :class="right ? 'text-green-600' : 'text-orange-600'" class="cursor-copy text-xl font-semibold" @click="hidden || copyText(card.answer)">{{ card.answer }}</p>
    <p v-if="card.tr" class="text-stone-500" :class="{ invisible: noTranscription }" data-testid="transcription">[{{ card.tr }}]</p>
    <p v-if="card.answerNote" class="text-sm italic text-stone-500" data-testid="answer-note"><span v-for="(line, i) in noteLines(card.answerNote)" :key="i" class="block" :class="{ 'text-[oklch(55.3%_0.2_25)]': line.exception }" :data-exception="line.exception" data-testid="answer-note-line"><NoteText :text="line.text" :self="card.id" /></span></p>
    <p v-if="card.answerExample" class="cursor-copy text-sm text-stone-500" @click="hidden || copyText(card.answerExample)">{{ card.answerExample }}</p>
    </div>
    <div v-if="hidden && $slots.default" class="absolute inset-0 flex items-center justify-center px-3 text-center text-xl"><slot /></div>
  </div>
</template>
