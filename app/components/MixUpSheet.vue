<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue';
import { onBack } from '@/utils/back';
import { cardsOf } from '@/utils/deck';
import { matching, suspects } from '@/utils/mix-up';

/** Picks the card `id` was mixed up with: by Dutch or native text, or from its look-alikes before anything is typed. */
const props = defineProps<{ id: string }>();
const emit = defineEmits<{ pick: [id: string]; close: [] }>();
const store = useStore();
const query = shallowRef('');
const field = useTemplateRef('field');

const cards = store.deck.value ? cardsOf(store.deck.value) : [];
const self = cards.find(c => c.id === props.id);
const linked = new Set([props.id, ...(store.confusions.value[props.id] ?? [])]);
const open = cards.filter(c => !linked.has(c.id));
const suggested = self ? suspects(self, open, store.isLearned) : [];
const options = computed(() => (query.value.trim() ? matching(open, query.value) : suggested));

const drop = onBack(() => emit('close'));
onBeforeUnmount(drop);
onMounted(() => field.value?.focus());
</script>

<template>
  <div class="fixed inset-0 z-60 bg-black/60" data-testid="mix-up-backdrop" @click="emit('close')" />
  <div class="fixed inset-x-0 bottom-0 z-70 mx-auto flex h-[85dvh] max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] dark:bg-stone-900" role="dialog" data-testid="mix-up-sheet">
    <div class="flex shrink-0 flex-col gap-2 px-4 pt-3 pb-2">
      <div class="flex items-center gap-2">
        <p class="flex-1 text-lg font-semibold">Mixed up <span class="text-orange-600">{{ self?.b }}</span> with…</p>
        <button type="button" class="btn-ghost px-2" aria-label="Close" data-testid="mix-up-close" @click="emit('close')">✕</button>
      </div>
      <TextField ref="field" v-model="query" placeholder="Dutch word or meaning" data-testid="mix-up-search" />
    </div>
    <ScrollBox class="flex-1" box-class="items-stretch! px-4 pb-4" testid="mix-up-options">
      <p v-if="!query.trim() && options.length" class="pt-1 pb-1 text-xs font-semibold uppercase text-stone-500">Looks alike</p>
      <button v-for="card in options" :key="card.id" type="button" class="flex items-baseline gap-2 border-b border-stone-100 py-2.5 text-left last:border-0 dark:border-stone-800" data-testid="mix-up-option" @click="emit('pick', card.id)">
        <span class="font-semibold">{{ card.b }}</span>
        <span class="flex-1 text-stone-500">{{ card.f }}</span>
        <span v-if="!store.isLearned(card.id)" class="text-xs text-stone-400">new</span>
      </button>
      <p v-if="query.trim() && !options.length" class="py-4 text-center text-stone-500" data-testid="mix-up-none">Nothing found</p>
    </ScrollBox>
  </div>
</template>
