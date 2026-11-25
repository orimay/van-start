<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { cardsOf, type DeckCard } from '@/utils/deck';
import { matching, suspects } from '@/utils/mix-up';

/**
 * Links the cards `id` was mixed up with, and unlinks them: a tap toggles a card, which stays in the list ticked or not.
 * Before anything is typed it lists the cards a typed answer may be, the cards already linked, then its look-alikes; typing searches Dutch and native text.
 * Opened from a step (`mixed` given), a tick means taken for it on this step: a card linked before is picked again with its link kept,
 * and only a link this step made (`fresh`) is undone on taking it back.
 * Before its answer shows (`secret`) it names neither the card nor what hints at it: its look-alikes and earlier mix-ups.
 */
const props = defineProps<{ id: string; open: boolean; typed?: readonly string[]; mixed?: readonly string[]; fresh?: readonly string[]; secret?: boolean }>();
/** `pick`'s `linked`: the tap made a new link, not picked one again. */
const emit = defineEmits<{ pick: [id: string, linked: boolean]; drop: [id: string]; close: [] }>();
const store = useStore();
const query = shallowRef('');

const cards = computed(() => (store.deck.value ? cardsOf(store.deck.value) : []));
const self = computed(() => cards.value.find(c => c.id === props.id));
const others = computed(() => cards.value.filter(c => c.id !== props.id));
const linked = computed(() => new Set(store.confusions.value[props.id] ?? []));
const ticked = (other: string) => (props.mixed ? props.mixed.includes(other) : linked.value.has(other));

/** The lists as they were on opening, so a tap ticks a row without moving it. */
const typedAtOpen = shallowRef<DeckCard[]>([]);
const linkedAtOpen = shallowRef<DeckCard[]>([]);
const suggested = shallowRef<DeckCard[]>([]);
watch(
  () => props.open && props.id,
  open => {
    if (!open) return;
    query.value = '';
    const typed = new Set(props.typed);
    const was = new Set(store.confusions.value[props.id] ?? []);
    typedAtOpen.value = others.value.filter(c => typed.has(c.id));
    linkedAtOpen.value = others.value.filter(c => was.has(c.id) && !typed.has(c.id));
    suggested.value = self.value ? suspects(self.value, others.value.filter(c => !was.has(c.id) && !typed.has(c.id)), store.isLearned) : [];
  },
  { immediate: true },
);

const found = computed(() => (query.value.trim() ? matching(others.value, query.value) : []));
const sections = computed(() =>
  query.value.trim()
    ? [{ title: '', cards: found.value }]
    : [
        { title: 'The typed answer is', cards: typedAtOpen.value, testid: 'mix-up-typed' },
        ...(props.secret
          ? []
          : [
              { title: props.mixed ? 'Mixed up before' : 'Mixed up with', cards: linkedAtOpen.value },
              { title: 'Looks alike', cards: suggested.value },
            ]),
      ].filter(s => s.cards.length),
);

function toggle(other: string) {
  if (ticked(other)) {
    if (!props.mixed || props.fresh?.includes(other)) store.unconfuse(props.id, other);
    emit('drop', other);
  } else {
    const fresh = !linked.value.has(other);
    store.confuse(props.id, other);
    emit('pick', other, fresh);
  }
}
</script>

<template>
  <BottomSheet :open="open" testid="mix-up-sheet" tall over @close="emit('close')">
    <template #title>Mixed up <span v-if="!secret" class="text-orange-700 dark:text-orange-400">{{ self?.b }}</span><template v-else>this word</template> with…</template>
    <div class="flex flex-col" data-testid="mix-up-options">
      <section v-for="section in sections" :key="section.title" class="flex flex-col" :data-testid="'testid' in section ? section.testid : 'mix-up-section'">
        <h3 v-if="section.title" class="pt-2 pb-1 text-xs font-semibold uppercase text-stone-500">{{ section.title }}</h3>
        <button
          v-for="card in section.cards"
          :key="card.id"
          type="button"
          class="flex items-center gap-3 border-b border-stone-100 py-2.5 text-left last:border-0 dark:border-stone-800"
          :aria-pressed="ticked(card.id)"
          data-testid="mix-up-option"
          @click="toggle(card.id)"
        >
          <span class="flex flex-1 flex-wrap items-baseline gap-x-2">
            <span class="font-semibold" data-testid="mix-up-word">{{ card.b }}</span>
            <span class="text-stone-500">{{ card.f }}</span>
            <span v-if="!store.isLearned(card.id)" class="text-xs text-stone-400">new</span>
          </span>
          <span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-sm" :class="ticked(card.id) ? 'border-orange-700 bg-orange-700 text-white' : 'border-stone-300 dark:border-stone-600'" aria-hidden="true">{{ ticked(card.id) ? '✓' : '' }}</span>
        </button>
      </section>
      <div v-if="query.trim() && !found.length" class="flex flex-col items-center gap-2 py-6 text-center" data-testid="mix-up-none">
        <p class="text-stone-500">Nothing found for "{{ query.trim() }}"</p>
        <button type="button" class="btn-ghost text-sm" data-testid="mix-up-clear" @click="query = ''">Clear search</button>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center gap-2">
        <TextField v-model="query" class="min-w-0 flex-1" placeholder="Search: Dutch word or meaning" data-testid="mix-up-search" />
        <button type="button" class="btn-primary" data-testid="mix-up-done" @click="emit('close')">Done</button>
      </div>
    </template>
  </BottomSheet>
</template>
