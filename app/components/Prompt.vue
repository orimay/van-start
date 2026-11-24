<script setup lang="ts">
import { copyText } from '@/utils/copy';
import { givesAway, noteLines, processLabel, type StudyCard } from '@/utils/deck';

/** `secret`: the answer is not out yet, so note items giving it away are hidden in place. */
const props = defineProps<{ card: StudyCard; secret?: boolean }>();
const process = computed(() => props.card.promptNote && noteLines(props.card.promptNote).map(l => processLabel(l.text)).find(Boolean));
const base = useRuntimeConfig().app.baseURL;
/** An affix's example on this side is its Dutch word, with the affix marked; otherwise this is the side of its meaning. */
const dutchExample = computed(() => !!props.card.affix && props.card.promptExample === props.card.nl);
/** The example would prompt the word, so a closed card keeps it back until asked for, at no cost. */
const contextShown = shallowRef(false);
const contextHidden = computed(() => props.secret && !contextShown.value);
</script>

<template>
  <div class="flex min-h-0 flex-1 basis-0 flex-col items-center justify-center-safe overflow-hidden gap-1 text-center w-full self-stretch rounded-xl border border-stone-300 bg-white px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900">
    <img v-if="card.img" :class="{ invisible: secret && card.prompt === card.nl }" :src="`${base}img/${card.img}`" alt="" class="h-20 w-20 shrink-0 rounded-xl object-cover" />
    <p data-testid="prompt" class="cursor-copy px-7 text-xl font-semibold" @click="copyText(card.prompt)">{{ card.prompt }}<span v-if="process" class="font-normal text-stone-500"> ({{ process }})</span></p>
    <!-- Only the notes scroll: the word stays in view, clear of the corner badge. -->
    <div v-if="card.promptNote || card.promptExample || card.breakdown" class="flex min-h-0 w-full flex-col items-center gap-1 overflow-y-auto overscroll-contain" data-testid="prompt-scroll">
    <!-- The example and its meaning stand apart from the rules below. -->
    <div v-if="card.promptExample || (card.affix && !dutchExample && card.breakdown)" class="flex w-fit max-w-full flex-col items-center gap-0.5 rounded-lg bg-stone-100 px-3 py-1.5 dark:bg-stone-800" data-testid="prompt-context">
    <div v-if="card.promptExample" class="grid"><p class="col-start-1 row-start-1 cursor-copy text-sm text-stone-700 dark:text-stone-200" :class="{ invisible: contextHidden }" data-testid="prompt-example" @click="copyText(card.promptExample)"><AffixWord v-if="dutchExample" :word="card.promptExample" :affix="card.affix!.dutch" /><template v-else>{{ card.promptExample }}</template></p><button v-if="contextHidden" type="button" class="col-start-1 row-start-1 self-center justify-self-center rounded-full border border-stone-300 px-3 text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400" data-testid="show-context" @click="contextShown = true">Show context</button></div>
    <p v-if="card.affix && !dutchExample && card.breakdown" class="text-sm text-stone-600 dark:text-stone-300" :class="{ invisible: secret }" data-testid="breakdown"><NoteText :text="card.breakdown" :self="card.id" :secret="secret" breakdown /></p>
    </div>
    <ul v-if="card.promptNote" class="mx-auto w-fit max-w-full space-y-1 text-sm italic text-stone-500 marker:text-stone-400" :class="{ 'list-disc pl-5 text-left': noteLines(card.promptNote).length > 1, 'mt-1': card.promptExample || (card.affix && card.breakdown) }" data-testid="prompt-note"><li v-for="(line, i) in noteLines(card.promptNote)" :key="i" :class="{ 'text-[oklch(55.3%_0.2_25)]': line.exception, invisible: secret && (card.promptSecret?.[i] ?? givesAway(line.text, card.answer)) }" :data-exception="line.exception" data-testid="prompt-note-line"><NoteText :text="line.text" :self="card.id" :secret="secret" /></li></ul>
    </div>
  </div>
</template>
