<script lang="ts">
/** A word opening with a hyphen (an affix, `(-ing`) and what clings to it, kept on one line: a break after the hyphen reads as a dash. */
const AFFIX = /(?<!\p{L})([(«"']?-\p{L}[\p{L}'’]*[)»"':;,.]*)/u;
</script>

<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
  <template v-for="(part, j) in text.split(AFFIX)" :key="j"><span v-if="j % 2" class="whitespace-nowrap" data-testid="unbroken">{{ part }}</span><template v-else>{{ part }}</template></template>
</template>
