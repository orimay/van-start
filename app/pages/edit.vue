<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { addCard, addSection, type CardInput, CUSTOM_ID, findSection, removeCard, removeSection, renameSection, updateCard } from '@/utils/custom';
import { cardsOf, type DeckNode } from '@/utils/deck';
import { addCourseCard, editCourseCard, removeFromCourse, renameCourse } from '@/utils/edits';

const store = useStore();
await store.ready;
const route = useRoute();

const root = computed(() => store.library.value ?? { id: 'root', name: 'Cards', children: [] });
const section = computed(() => findSection(root.value, String(route.query.id ?? root.value.id)) ?? root.value);
const isRoot = computed(() => section.value.id === root.value.id);
const parentId = computed(() => findParent(root.value, section.value.id)?.id);
/** One of the learner's own groups, or a course section. */
const isOwn = computed(() => findSection(store.custom.value, section.value.id) !== undefined);

const name = shallowRef('');
const newSection = shallowRef('');
const editing = shallowRef<string>();
const EMPTY = { b: '', f: '', tr: '', n: '', xb: '', xf: '' };
const form = shallowRef({ ...EMPTY });

watch(section, s => { name.value = s.name; }, { immediate: true });

function findParent(node: DeckNode, id: string): DeckNode | undefined {
  for (const child of node.children ?? []) {
    if (child.id === id) return node;
    const found = findParent(child, id);
    if (found) return found;
  }
  return undefined;
}

function set<K extends keyof typeof EMPTY>(key: K, value: string) {
  form.value = { ...form.value, [key]: value };
}

function doAddSection() {
  if (!newSection.value.trim()) return;
  store.saveCustom(addSection(store.custom.value, isRoot.value ? CUSTOM_ID : section.value.id, newSection.value)[0]);
  newSection.value = '';
}

function rename() {
  if (!name.value.trim()) return;
  if (isOwn.value) store.saveCustom(renameSection(store.custom.value, section.value.id, name.value));
  else store.saveEdits(renameCourse(store.edits.value, section.value.id, name.value));
}

async function deleteSection() {
  const back = parentId.value;
  if (isOwn.value) store.saveCustom(...removeSection(store.custom.value, section.value.id));
  else store.saveEdits(removeFromCourse(store.edits.value, section.value.id), cardsOf(section.value).map(c => c.id));
  await navigateTo(back && back !== root.value.id ? `/edit?id=${back}` : '/edit');
}

function edit(id: string) {
  const card = section.value.cards?.find(c => c.id === id);
  if (!card) return;
  editing.value = id;
  form.value = { b: card.b, f: card.f, tr: card.tr ?? '', n: card.n ?? '', xb: card.xb ?? '', xf: card.xf ?? '' };
}

function cancel() {
  editing.value = undefined;
  form.value = { ...EMPTY };
}

function saveCard() {
  if (!form.value.b.trim() || !form.value.f.trim()) return;
  const input = form.value as CardInput;
  const original = section.value.cards?.find(c => c.id === editing.value);
  if (isOwn.value) store.saveCustom(editing.value ? updateCard(store.custom.value, editing.value, input) : addCard(store.custom.value, section.value.id, input)[0]);
  else store.saveEdits(original ? editCourseCard(store.edits.value, original, input) : addCourseCard(store.edits.value, section.value.id, input));
  cancel();
}

function deleteCard(id: string) {
  if (isOwn.value) store.saveCustom(removeCard(store.custom.value, id), [id]);
  else store.saveEdits(removeFromCourse(store.edits.value, id), [id]);
  if (editing.value === id) cancel();
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <header class="flex items-center gap-3">
      <NuxtLink :to="isRoot ? '/' : parentId === root.id ? '/edit' : `/edit?id=${parentId}`" class="text-2xl text-stone-500" data-testid="back">‹</NuxtLink>
      <h1 class="flex-1 truncate text-2xl font-bold">{{ section.name }}</h1>
    </header>

    <section v-if="!isRoot" class="flex gap-2">
      <TextField v-model="name" class="flex-1" placeholder="Section name" data-testid="name" @enter="rename" />
      <button class="btn-ghost" data-testid="rename" @click="rename">Rename</button>
      <button class="btn-ghost text-red-700 dark:text-red-400" data-testid="delete-section" @click="deleteSection">Delete</button>
    </section>

    <section v-if="isRoot || isOwn || section.children?.length" class="flex flex-col gap-2">
      <h2 class="font-semibold">{{ isRoot ? 'Groups' : 'Sections' }}</h2>
      <NuxtLink v-for="child in section.children ?? []" :key="child.id" :to="`/edit?id=${child.id}`" class="tile" data-testid="section">{{ child.name }}</NuxtLink>
      <div v-if="isRoot || isOwn" class="flex gap-2">
        <TextField v-model="newSection" class="flex-1" :placeholder="isRoot ? 'New group name' : 'New section'" data-testid="new-section" @enter="doAddSection" />
        <button class="btn-ghost" data-testid="add-section" @click="doAddSection">Add</button>
      </div>
    </section>

    <section v-if="!isRoot" class="flex flex-col gap-2">
      <h2 class="font-semibold">Cards</h2>
      <div v-for="card in section.cards ?? []" :key="card.id" class="flex items-center gap-2">
        <button class="tile flex-1 text-left" :class="{ 'border-orange-600': editing === card.id }" data-testid="card" @click="edit(card.id)">
          <b>{{ card.b }}</b> — {{ card.f }}
        </button>
        <button class="btn-ghost text-red-700 dark:text-red-400" aria-label="Delete" data-testid="delete-card" @click="deleteCard(card.id)">✕</button>
      </div>
    </section>

    <section v-if="!isRoot" class="flex flex-col gap-2 rounded-2xl bg-white p-4 dark:bg-stone-900">
      <h2 class="font-semibold">{{ editing ? 'Edit card' : 'New card' }}</h2>
      <TextField :model-value="form.b" lang="nl" placeholder="Dutch" data-testid="dutch" @update:model-value="set('b', $event)" />
      <TextField :model-value="form.f" placeholder="Translation" data-testid="native" @update:model-value="set('f', $event)" />
      <TextField :model-value="form.tr" placeholder="Transcription (optional)" data-testid="transcription" @update:model-value="set('tr', $event)" />
      <TextField :model-value="form.n" placeholder="Note (optional)" data-testid="note" @update:model-value="set('n', $event)" />
      <TextField :model-value="form.xb" lang="nl" placeholder="Dutch example (optional)" data-testid="dutch-example" @update:model-value="set('xb', $event)" />
      <TextField :model-value="form.xf" placeholder="Example translation (optional)" data-testid="native-example" @update:model-value="set('xf', $event)" />
      <div class="flex gap-2">
        <button v-if="editing" class="btn-ghost flex-1" data-testid="cancel" @click="cancel">Cancel</button>
        <button class="btn-primary flex-1" data-testid="save-card" @click="saveCard">{{ editing ? 'Save' : 'Add' }}</button>
      </div>
    </section>
  </div>
</template>
