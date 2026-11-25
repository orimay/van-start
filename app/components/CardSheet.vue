<script setup lang="ts">
import { toStudyCard } from '@/utils/deck';
import { cardKey, exampleKey } from '@/utils/play';
import { speak, speakExample } from '@/utils/speak';
import { useEventListener } from '@vueuse/core';

const sheet = useCardSheet();
const { isLearned, confusions, confuse, unconfuse } = useStore();
const layer = computed(() => sheet.layers.value.at(-1));
const card = computed(() => layer.value && sheet.index.value.byId.get(layer.value.id));
const study = computed(() => card.value && toStudyCard(card.value));
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

function mixUp(other: string) {
  mixing.value = false;
  confuse(card.value!.id, other);
}

// The panel follows the finger down; let go past a quarter of its height it closes, short of that it springs back.
// The body owns the gesture while scrolled or moving up, so its own scroll still works.
const DRAG_SLOP_PX = 6;
const body = useTemplateRef('body');
const dragY = shallowRef(0);
const dragging = shallowRef(false);
let drag: { id: number; startY: number; fromBody: boolean; panel: HTMLElement } | undefined;
let stopListening: (() => void)[] = [];

function endDrag(dismiss: boolean) {
  for (const stop of stopListening) stop();
  stopListening = [];
  const wasDragging = dragging.value;
  const past = dismiss && wasDragging && !!drag && dragY.value > drag.panel.offsetHeight / 4;
  drag = undefined;
  dragging.value = false;
  // Closing slides on from where the finger let go, once the drag's no-transition style is off.
  if (past) return void nextTick(() => sheet.close());
  dragY.value = 0;
  // A drag let go over the button it started on would otherwise press it.
  if (wasDragging) {
    const swallow = (e: Event) => e.stopPropagation();
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }));
  }
}

function onDragMove(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.id) return;
  const dy = e.clientY - drag.startY;
  if (!dragging.value) {
    if (dy < 0 && drag.fromBody) return endDrag(false);
    if (Math.abs(dy) < DRAG_SLOP_PX) return;
    dragging.value = true;
  }
  dragY.value = Math.max(0, dy);
}

function onDragStart(e: PointerEvent) {
  if (!e.isPrimary || e.button !== 0) return;
  const fromBody = !!body.value?.contains(e.target as Node);
  if (fromBody && body.value!.scrollTop > 0) return;
  endDrag(false);
  drag = { id: e.pointerId, startY: e.clientY, fromBody, panel: e.currentTarget as HTMLElement };
  stopListening = [
    useEventListener(window, 'pointermove', onDragMove),
    useEventListener(window, 'pointerup', (ev: PointerEvent) => ev.pointerId === drag?.id && endDrag(true)),
    useEventListener(window, 'pointercancel', (ev: PointerEvent) => ev.pointerId === drag?.id && endDrag(false)),
  ];
}

// At scrollTop 0 the browser would take a downward swipe as a scroll and cancel the pointer stream.
useEventListener(
  body,
  'touchmove',
  (e: TouchEvent) => {
    if (drag?.fromBody && (dragging.value || (e.touches[0]?.clientY ?? 0) > drag.startY)) e.preventDefault();
  },
  { passive: false },
);
</script>

<template>
  <Transition name="sheet-fade">
    <div v-if="card" class="fixed inset-0 z-40 bg-black/60" data-testid="card-sheet-backdrop" @click="sheet.close()" />
  </Transition>
  <Transition name="sheet-slide" @after-leave="dragY = 0">
    <div
      v-if="card && study"
      class="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] dark:bg-stone-900"
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
        <p v-if="card.tr" class="text-stone-500" data-testid="card-sheet-transcription">[{{ card.tr }}]</p>
      </div>
      <div ref="body" class="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pb-4" data-testid="card-sheet-body">
        <p data-testid="card-sheet-meaning">
          <span v-for="sense in card.f.split('; ')" :key="sense" class="block" :class="{ 'font-semibold text-sky-700 dark:text-sky-400': layer?.gloss && same(layer.gloss, sense) && card.f.includes('; ') }" data-testid="card-sheet-sense">{{ sense }}</span>
        </p>
        <NoteList v-if="card.n" :note="card.n" :kinds="study?.promptKinds" :self="card.id" class="mx-0!" testid="card-sheet-note" />
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
          <button v-for="word in derived" :key="word.id" type="button" class="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1 text-left" data-testid="card-sheet-derived-word" @click="sheet.open(word.id)">
            <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.card.b }}</span>
            <span class="flex-1 text-stone-500">{{ word.card.f }}</span>
            <span v-if="!isLearned(word.id)" class="text-xs text-stone-400">new</span>
            <span v-if="word.sense" class="basis-full"><span class="rounded bg-stone-100 px-1.5 text-xs text-stone-500 dark:bg-stone-800" :class="{ 'text-sky-700 dark:text-sky-400': layer?.gloss && same(layer.gloss, word.sense) }">{{ word.sense }}</span></span>
          </button>
        </section>
        <section v-if="related.length" class="flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-700" data-testid="card-sheet-related">
          <p class="text-xs font-semibold uppercase text-stone-500">Related words</p>
          <button v-for="word in related" :key="word.id" type="button" class="flex items-baseline gap-2 py-1 text-left" data-testid="card-sheet-related-word" @click="sheet.open(word.id)">
            <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.card.b }}</span>
            <span class="flex-1 text-stone-500">{{ word.card.f }}</span>
            <span v-if="!isLearned(word.id)" class="text-xs text-stone-400">new</span>
          </button>
        </section>
        <section class="flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-700" data-testid="card-sheet-mixed">
          <div class="flex items-center">
            <p class="flex-1 text-xs font-semibold uppercase text-stone-500">Mixed up with</p>
            <button type="button" class="btn-ghost px-2 py-1 text-sm" data-testid="card-sheet-mixed-add" @click="mixing = true">+ Add</button>
          </div>
          <div v-for="word in mixedUp" :key="word.id" class="flex items-center gap-1">
            <button type="button" class="flex flex-1 items-baseline gap-2 py-1 text-left" data-testid="card-sheet-mixed-word" @click="sheet.open(word.id)">
              <span class="text-sky-700 underline decoration-dotted decoration-2 underline-offset-4 dark:text-sky-400">{{ word.b }}</span>
              <span class="flex-1 text-stone-500">{{ word.f }}</span>
            </button>
            <button type="button" class="btn-ghost px-2" :aria-label="`Not mixed up with ${word.b}`" data-testid="card-sheet-mixed-remove" @click="unconfuse(card.id, word.id)">✕</button>
          </div>
        </section>
      </div>
    </div>
  </Transition>
  <MixUpSheet v-if="mixing && card" :id="card.id" @pick="mixUp" @close="mixing = false" />
</template>

<style scoped>
.sheet-fade-enter-active { transition: opacity 200ms cubic-bezier(0, 0, 0.2, 1); }
.sheet-fade-leave-active { transition: opacity 150ms cubic-bezier(0.4, 0, 1, 1); }
.sheet-fade-enter-from, .sheet-fade-leave-to { opacity: 0; }
/* Springs back from a short pull; follows the finger without lag while held. */
[data-testid='card-sheet'] { transition: translate 200ms cubic-bezier(0, 0, 0.2, 1); }
[data-testid='card-sheet'].sheet-dragging { transition: none; }
.sheet-slide-enter-active { transition: transform 200ms cubic-bezier(0, 0, 0.2, 1); }
.sheet-slide-leave-active { transition: transform 150ms cubic-bezier(0.4, 0, 1, 1); }
.sheet-slide-enter-from, .sheet-slide-leave-to { transform: translateY(100%); }
</style>
