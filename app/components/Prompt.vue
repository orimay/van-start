<script setup lang="ts">
import { copyText } from '@/utils/copy';
import { givesAway, noteLines, processLabel, type StudyCard } from '@/utils/deck';

/** `secret`: the answer is not out yet, so note items giving it away are hidden in place. */
const props = defineProps<{ card: StudyCard; secret?: boolean }>();
const process = computed(() => props.card.promptNote && noteLines(props.card.promptNote).map(l => processLabel(l.text)).find(Boolean));
const base = useRuntimeConfig().app.baseURL;
/** An affix's example on this side is its Dutch word, with the affix marked; otherwise this is the side of its meaning. */
const dutchExample = computed(() => !!props.card.affix && props.card.promptExample === props.card.nl);
</script>

<template>
  <div class="flex min-h-0 flex-1 basis-0 flex-col items-center justify-center overflow-y-auto gap-1 text-center w-full self-stretch rounded-xl border border-stone-300 bg-white px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-900">
    <img v-if="card.img" :class="{ invisible: secret && card.prompt === card.nl }" :src="`${base}img/${card.img}`" alt="" class="h-20 w-20 rounded-xl object-cover" />
    <p data-testid="prompt" class="cursor-copy text-xl font-semibold" @click="copyText(card.prompt)">{{ card.prompt }}<span v-if="process" class="font-normal text-stone-500"> ({{ process }})</span></p>
    <p v-if="card.promptNote" class="text-sm italic text-stone-500" data-testid="prompt-note"><span v-for="(line, i) in noteLines(card.promptNote)" :key="i" class="block" :class="{ 'text-[oklch(55.3%_0.2_25)]': line.exception, invisible: secret && (card.promptSecret?.[i] ?? givesAway(line.text, card.answer)) }" :data-exception="line.exception" data-testid="prompt-note-line"><NoteText :text="line.text" :self="card.id" :secret="secret" /></span></p>
    <p v-if="card.promptExample" class="cursor-copy text-sm text-stone-500" data-testid="prompt-example" @click="copyText(card.promptExample)"><AffixWord v-if="dutchExample" :word="card.promptExample" :affix="card.affix!.dutch" /><template v-else>{{ card.promptExample }}</template></p>
    <p v-if="card.affix && !dutchExample && card.breakdown" class="text-sm text-stone-500" :class="{ invisible: secret }" data-testid="breakdown"><NoteText :text="card.breakdown" :self="card.id" :secret="secret" breakdown /></p>
  </div>
</template>
