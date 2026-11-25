<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import type { DeckNode } from '@/utils/deck';
import { inheritedKind, type Kind, kindsIn, kindState, overridden, withGroupKind } from '@/utils/kinds';

/** The library group whose sentences and combinations are switched here. */
const props = defineProps<{ node: DeckNode | undefined }>();
const emit = defineEmits<{ close: [] }>();
const { settings, library, updateSettings } = useStore();

const TITLES: Record<Kind, string> = { sentence: 'Sentences', combination: 'Combinations' };
const CHOICES = [
  { id: 'global', label: 'As in settings', value: undefined },
  { id: 'on', label: 'On', value: true },
  { id: 'off', label: 'Off', value: false },
] as const;

const groups = computed(() => settings.value.groupKinds ?? {});
const global = computed(() => settings.value.kinds ?? {});
const stateOf = (kind: Kind) => kindState(library.value!, shown.value!.id, kind, global.value, groups.value);

/** A switch that would replace subgroups' own ones, waiting for a yes. */
const pending = shallowRef<{ kind: Kind; value: boolean | undefined; lines: string[] }>();
/** The last group, kept on screen while the sheet slides away. */
const shown = shallowRef(props.node);
watch(
  () => props.node,
  node => {
    pending.value = undefined;
    if (node) shown.value = node;
  },
);

const word = (on: boolean) => (on ? 'on' : 'off');

function choose(kind: Kind, value: boolean | undefined) {
  const to = value ?? inheritedKind(library.value!, props.node!.id, kind, global.value, groups.value);
  const lines = overridden(library.value!, props.node!.id, kind, to, groups.value).map(o => `${o.name}: ${word(o.from)} → ${word(o.to)}`);
  if (lines.length) return void (pending.value = { kind, value, lines });
  save(kind, value);
}

function save(kind: Kind, value: boolean | undefined) {
  updateSettings({ groupKinds: withGroupKind(library.value!, props.node!.id, kind, value, groups.value) });
  pending.value = undefined;
}
</script>

<template>
  <BottomSheet :open="!!node" testid="kind-sheet" @close="emit('close')">
    <template #title>{{ shown?.name }}: cards</template>
    <div v-if="pending" class="flex flex-col gap-2 text-sm" data-testid="kind-overrides">
      <p class="text-stone-600 dark:text-stone-400">These groups keep their own choice for {{ TITLES[pending.kind].toLowerCase() }}; it changes for them too:</p>
      <ul class="list-disc pl-5">
        <li v-for="line in pending.lines" :key="line">{{ line }}</li>
      </ul>
    </div>
    <div v-else-if="shown" class="flex flex-col gap-4">
      <div v-for="kind in kindsIn(shown)" :key="kind" class="flex flex-col gap-1.5">
        <p class="text-sm font-medium">{{ TITLES[kind] }}</p>
        <div class="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
          <button
            v-for="c in CHOICES"
            :key="c.id"
            type="button"
            class="rounded-lg px-2 py-1.5 text-sm"
            :class="stateOf(kind) === c.id ? 'bg-white shadow-sm dark:bg-stone-700' : 'text-stone-600 dark:text-stone-400'"
            :aria-pressed="stateOf(kind) === c.id"
            :data-testid="`kind-${kind}-${c.id}`"
            @click="choose(kind, c.value)"
          >
            {{ c.label }}
          </button>
        </div>
        <p v-if="stateOf(kind) === 'mixed'" class="text-xs text-stone-500 dark:text-stone-400" :data-testid="`kind-${kind}-mixed`">Mixed: some groups keep their own</p>
      </div>
    </div>
    <template #footer>
      <template v-if="pending">
        <button type="button" class="btn bg-orange-700 text-white" data-testid="kind-overrides-yes" @click="save(pending.kind, pending.value)">Change them too</button>
        <button type="button" class="btn-ghost" data-testid="kind-overrides-no" @click="pending = undefined">Cancel</button>
      </template>
      <button v-else type="button" class="btn-primary" data-testid="kind-close" @click="emit('close')">Done</button>
    </template>
  </BottomSheet>
</template>
