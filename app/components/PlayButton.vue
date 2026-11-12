<script setup lang="ts">
import { computed } from 'vue';
import { playing, stopPlaying } from '@/utils/play';

/** Plays its sound, keyed `sound`; a second tap while that sound plays stops it. */
const props = withDefaults(defineProps<{ sound: string; playIcon?: string; stopIcon?: string }>(), { playIcon: '▶', stopIcon: '■' });
const emit = defineEmits<{ play: [] }>();
const isPlaying = computed(() => playing.value === props.sound);
</script>

<template>
  <button type="button" @click="isPlaying ? stopPlaying() : emit('play')"><span>{{ isPlaying ? stopIcon : playIcon }}</span> <slot /></button>
</template>
