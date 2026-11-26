<script setup lang="ts">
import { copyText } from '@/utils/copy';
import { givesAway, noteLines, processLabel, type StudyCard } from '@/utils/deck';
import { senseColourOf, surfaceOf } from '@/utils/surface';

/** `secret`: the answer is not out yet, so note items giving it away are taken out of the layout. */
const props = defineProps<{ card: StudyCard; secret?: boolean }>();
const process = computed(() => props.card.promptNote && noteLines(props.card.promptNote).map(l => processLabel(l.text)).find(Boolean));
const base = useRuntimeConfig().app.baseURL;
/** An affix's example on this side is its Dutch word, with the affix marked; otherwise this is the side of its meaning. */
const dutchExample = computed(() => !!props.card.affix && props.card.promptExample === props.card.nl);
/** The example would prompt the word, so a closed card keeps it back until asked for, at no cost. */
const contextShown = shallowRef(false);
const contextHidden = computed(() => props.secret && !contextShown.value);
const hidden = computed(() => props.secret && props.card.promptNote ? noteLines(props.card.promptNote).map((line, i) => props.card.promptSecret?.[i] ?? givesAway(line.text, props.card.answer)) : undefined);
</script>

<template>
  <div data-testid="prompt-card" class="relative flex min-h-0 flex-1 basis-0 flex-col items-center justify-center-safe overflow-hidden gap-1 text-center w-full self-stretch rounded-xl border px-3 py-2 shadow-sm" :class="surfaceOf(card)" @click="contextShown = true">
    <img v-if="card.img" :class="{ invisible: secret && card.prompt === card.nl }" :src="`${base}img/${card.img}`" alt="" class="h-20 w-20 shrink-0 rounded-xl object-cover" />
    <p data-testid="prompt" class="cursor-copy px-7 text-xl font-semibold" @click="copyText(card.prompt)"><template v-if="card.promptSenses"><template v-for="(sense, i) in card.prompt.split('; ')" :key="i"><template v-if="i">; </template><span data-testid="sense" :class="card.promptSenses[i] && senseColourOf(card.promptSenses[i])"><KeepAffixes :text="sense" /></span></template></template><KeepAffixes v-else :text="card.prompt" /><AffixTag :card="card" :text="card.prompt" /><span v-if="process" class="font-normal text-stone-500 dark:text-stone-400"> ({{ process }})</span></p>
    <!-- Only the notes scroll: the word stays in view, clear of the corner badge. -->
    <ScrollBox v-if="card.promptNote || card.promptExample || card.breakdown" box-class="gap-3" class="mt-2" testid="prompt-scroll">
    <!-- Where the example comes from, then the example, apart from the rules below. -->
    <div v-if="card.promptExample || (card.affix && !dutchExample && card.breakdown)" v-show="!secret || (card.promptExample && !contextHidden)" class="flex w-fit max-w-full flex-col items-center gap-0.5 rounded-lg bg-stone-100 px-3 py-1.5 dark:bg-stone-800" data-testid="prompt-context">
    <p v-if="card.affix && !dutchExample && card.breakdown" v-show="!secret" class="text-sm text-stone-600 dark:text-stone-300" data-testid="breakdown"><NoteText :text="card.breakdown" :self="card.id" :secret="secret" breakdown /></p>
    <p v-if="card.promptExample" v-show="!contextHidden" class="text-sm text-stone-700 dark:text-stone-200"><ContextIcon class="mr-1 inline-block align-text-bottom" data-testid="context-icon" /><span class="cursor-copy" data-testid="prompt-example" @click="copyText(card.promptExample)"><AffixWord v-if="dutchExample" :word="card.promptExample" :affix="card.affix!.dutch" /><template v-else>{{ card.promptExample }}</template></span></p>
    </div>
    <NoteList v-if="card.promptNote" :note="card.promptNote" :kinds="card.promptKinds" :self="card.id" :secret="secret" :hidden="hidden" testid="prompt-note" />
    </ScrollBox>
    <button v-if="card.promptExample && contextHidden" type="button" class="absolute top-1 left-1 flex size-7 items-center justify-center rounded-full border border-stone-300 text-sm dark:border-stone-600" aria-label="Show context" title="Show context" data-testid="show-context"><ContextIcon /></button>
  </div>
</template>
