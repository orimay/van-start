<script setup lang="ts">
/** A link up to the page this one opened from: back in history when that page is right below, else in this page's place, so going up never grows history. */
const props = defineProps<{ to: string }>();
const router = useRouter();
const target = computed(() => router.resolve(props.to));

function go() {
  if (history.state?.back === target.value.fullPath) history.back();
  else void router.replace(props.to);
}
</script>

<template>
  <a :href="target.href" @click.prevent="go"><slot /></a>
</template>
