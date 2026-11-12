<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue';
import { holdUpdateWhile } from '@/utils/update-hold';

// A contenteditable, not an <input>: mobile keyboards show no password, card or address autofill for it.
const props = defineProps<{ placeholder?: string; readonly?: boolean; lang?: string }>();
const model = defineModel<string>({ default: '' });
const emit = defineEmits<{ enter: [] }>();
const el = useTemplateRef('el');
holdUpdateWhile(() => model.value !== '');

const sync = () => el.value && el.value.textContent !== model.value && (el.value.textContent = model.value);
onMounted(sync);
watch(model, sync);

defineExpose({ focus: () => el.value?.focus(), element: el });
</script>

<template>
  <div
    ref="el"
    :contenteditable="props.readonly ? 'false' : 'plaintext-only'"
    role="textbox"
    inputmode="text"
    :lang="lang"
    :data-placeholder="placeholder"
    autocapitalize="off"
    autocorrect="off"
    autocomplete="off"
    writingsuggestions="false"
    spellcheck="false"
    enterkeyhint="done"
    class="tile min-h-11 text-lg whitespace-pre-wrap outline-none empty:before:text-stone-400 empty:before:content-[attr(data-placeholder)] focus:border-stone-500"
    @input="model = el!.textContent ?? ''"
    @keydown.enter.prevent="emit('enter')"
  />
</template>
