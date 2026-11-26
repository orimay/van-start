<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import { useStore } from '@/composables/useStore';
import { guardLeaving, leaveApp, stayInApp } from '@/utils/back';

/**
 * Back on the app's first page asks before leaving: Leave goes on as back would, Stay or another back keeps the app open.
 * A page opened in home's place (a lesson) goes home on that back instead.
 */
const open = shallowRef(false);
const route = useRoute();
const router = useRouter();
const store = useStore();
/** Nothing comes before the app to go back to (an installed app): the next back leaves it. */
const stuck = shallowRef(false);
let unguard: (() => void) | undefined;

function ask() {
  stuck.value = false;
  open.value = true;
}

function stay() {
  open.value = false;
  stayInApp();
}

async function leave() {
  await leaveApp();
  stuck.value = true;
}

/** Back in the app after leaving it (restored from the browser's cache): the question is answered. */
const onPageShow = (event: PageTransitionEvent) => event.persisted && open.value && stay();

onMounted(() => {
  unguard = guardLeaving(ask, () => (route.path === '/' || !store.configured.value ? undefined : router.replace('/')));
  window.addEventListener('pageshow', onPageShow);
});
onBeforeUnmount(() => {
  unguard?.();
  window.removeEventListener('pageshow', onPageShow);
});
</script>

<template>
  <BottomSheet :open testid="leave-sheet" @close="stay">
    <template #title>Leave Van start?</template>
    <p v-if="stuck" class="text-stone-600 dark:text-stone-400" data-testid="leave-hint">Press back once more to leave.</p>
    <template #footer>
      <button type="button" class="btn-primary" data-testid="leave-confirm" :disabled="stuck" @click="leave">Leave</button>
      <button type="button" class="btn-ghost" data-testid="leave-cancel" @click="stay">Stay</button>
    </template>
  </BottomSheet>
</template>
