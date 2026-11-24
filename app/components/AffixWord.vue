<script setup lang="ts">
/** An affix's example word: the affix bright, the rest of the word grey. */
const props = defineProps<{ word: string; affix: string }>();
const stem = computed(() => props.affix.replace(/^-|-$/g, ''));
/** A noun's article stays grey before a prefix. */
const article = computed(() => /^(de|het) /.exec(props.word)?.[0] ?? '');
const parts = computed(() => (props.affix.startsWith('-') ? [props.word.slice(0, -stem.value.length), stem.value, ''] : [article.value, stem.value, props.word.slice(article.value.length + stem.value.length)]));
</script>

<template>
  <span><span class="text-stone-400 dark:text-stone-500">{{ parts[0] }}</span><span data-testid="affix-part">{{ parts[1] }}</span><span class="text-stone-400 dark:text-stone-500">{{ parts[2] }}</span></span>
</template>
