<script setup lang="ts">
import { useFileDialog } from '@vueuse/core';
import { shallowRef, watch } from 'vue';
import { type Language, LANGUAGES } from '@/composables/useStore';
import { GAMES as ALL_GAMES, GAME_HINTS, GAME_TITLES, toggled } from '@/utils/games';
import { readLexilize } from '@/utils/lexilize';
import { exportLog, importLog } from '@/db/backup';
import { sessions } from '@/db/sessions';
import { type Kind, KINDS } from '@/utils/kinds';

const store = useStore();
await store.ready;
const draft = shallowRef({ ...store.settings.value });
const imported = shallowRef<string>();
/** `van-start-2026-11-20-1930-v20261120-1621.json`: when it was saved, then the app version that saved it. */
function backupName() {
  const minute = (at: string) => at.replace(/\D/g, '').slice(0, 12).replace(/(\d{8})(\d{4})/, '$1-$2');
  const now = new Date().toISOString();
  return `van-start-${now.slice(0, 10)}-${now.slice(11, 16).replace(':', '')}-v${minute(useRuntimeConfig().public.version as string)}.json`;
}



/** Unfinished learn and review sessions. */
const SESSION_KEYS = /^(learn-resume|review-left):/;

async function saveBackup() {
  const unfinished = Object.fromEntries(sessions.keys().filter(k => SESSION_KEYS.test(k)).map(k => [k, sessions.get(k)!]));
  const backup = JSON.stringify({ ...JSON.parse(store.exportProgress()), sessions: unfinished, ...(await exportLog()) });
  await saveFile(new File([backup], backupName(), { type: 'application/json' }));
  imported.value = 'Backup saved';
}

/** Through the share sheet where there is one: an installed iOS app ignores download links. */
async function saveFile(file: File) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      return await navigator.share({ files: [file] });
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  // Safari drops the download when the link dies right after the click.
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

const importDialog = useFileDialog({ accept: '.json,.lxb,.lxf,application/json,application/octet-stream', multiple: false });
importDialog.onChange(async files => {
  const file = files?.[0];
  if (!file) return;
  try {
    if (/\.json$/i.test(file.name)) {
      const text = await file.text();
      store.importProgress(text);
      const data = JSON.parse(text) as { sessions?: Record<string, string> } & Parameters<typeof importLog>[0];
      for (const [k, v] of Object.entries(data.sessions ?? {})) if (SESSION_KEYS.test(k)) sessions.set(k, v);
      await importLog(data);
      draft.value = { ...store.settings.value };
      imported.value = 'Progress loaded';
    } else {
      imported.value = `Lexilize: ${store.importLexilize(readLexilize(await file.arrayBuffer()))} studied cards loaded`;
    }
  } catch (error) {
    imported.value = `Could not read ${file.name}: ${(error as Error).message}`;
  }
});

const KIND_TITLES: Record<Kind, [string, string]> = {
  sentence: ['Sentences', 'Example sentences and phrases that show a word in use.'],
  combination: ['Combinations', 'Series built by one rule, like a day with a part of the day.'],
};
/** Groups with their own switch for the kind. */
const ownGroups = (kind: Kind) => Object.values(draft.value.groupKinds ?? {}).filter(g => g[kind] !== undefined).length;
function setKind(kind: Kind, on: boolean) {
  draft.value = { ...draft.value, kinds: { ...draft.value.kinds, [kind]: on } };
}
/** The groups follow the global switch again. */
function resetGroups(kind: Kind) {
  const groups = Object.entries(draft.value.groupKinds ?? {}).map(([id, { [kind]: _, ...rest }]) => [id, rest] as const);
  draft.value = { ...draft.value, groupKinds: Object.fromEntries(groups.filter(([, rest]) => Object.keys(rest).length)) };
}

function setGroupSize(input: HTMLInputElement) {
  const size = Math.floor(Number(input.value));
  if (size >= 5) draft.value = { ...draft.value, groupSize: size };
  else input.value = String(draft.value.groupSize);
}

// No save button: every change is kept, and a first visit counts as set up.
store.updateSettings(draft.value);
watch(draft, value => store.updateSettings(value));
</script>

<template>
  <div class="flex flex-1 flex-col gap-4">
    <header class="flex items-center gap-3">
      <NuxtLink v-if="store.configured.value" to="/" class="text-2xl text-stone-500" data-testid="back">‹</NuxtLink>
      <h1 class="flex-1 truncate text-2xl font-bold">Settings</h1>
    </header>
    <VersionInfo />
    <section class="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm dark:bg-stone-900">
      <h2 class="font-semibold">Language</h2>
      <label class="flex items-center justify-between gap-2">
        My language
        <select class="tile py-1" :value="draft.language" data-testid="language" @change="draft = { ...draft, language: ($event.target as HTMLSelectElement).value as Language }">
          <option v-for="(label, code) in LANGUAGES" :key="code" :value="code">{{ label }}</option>
        </select>
      </label>
      <p class="-mt-1 text-xs text-stone-500">Meanings and transcriptions are shown in it.</p>
    </section>
    <section class="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm dark:bg-stone-900">
      <h2 class="font-semibold">Learning</h2>
      <label class="flex items-center justify-between gap-2">
        New cards per group
        <input type="number" min="5" step="1" inputmode="numeric" class="tile w-20 py-1 text-right" :value="draft.groupSize" data-testid="group-size" @change="setGroupSize($event.target as HTMLInputElement)">

      </label>
      <p class="-mt-1 text-xs text-stone-500">A group is learned in one go. In review, a missed card comes back after this many others.</p>
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1">Games</legend>
        <label v-for="g in ALL_GAMES" :key="g" class="flex items-center justify-between gap-2 pl-2">
          <span class="flex flex-col">{{ GAME_TITLES[g] }}<span class="text-xs text-stone-500" :data-testid="`game-hint-${g}`">{{ GAME_HINTS[g] }}</span></span>
          <input type="checkbox" class="h-5 w-5 accent-orange-600" :checked="draft.games.includes(g)" :disabled="draft.games.length === 1 && draft.games.includes(g)" :data-testid="`game-${g}`" @change="draft = { ...draft, games: toggled(draft.games, g) }" />
        </label>
      </fieldset>
      <label v-if="draft.games.includes('pronounce')" class="flex items-center justify-between gap-2">
        <span class="flex flex-col">Start with pronouncing<span class="text-xs text-stone-500">A new group opens with pronouncing in place of the intro.</span></span>
        <input type="checkbox" class="h-5 w-5 accent-orange-600" :checked="draft.pronounceFirst" data-testid="pronounce-first" @change="draft = { ...draft, pronounceFirst: ($event.target as HTMLInputElement).checked }" />
      </label>
      <p class="-mt-1 text-xs text-stone-500">A new group plays them in this order. At least one stays on. Every game but Associating and Recognizing is reviewed on its own schedule, with its own mistakes.</p>
      <label class="flex items-center justify-between gap-2">
        <span class="flex flex-col">Top up a short group with<span class="text-xs text-stone-500">When fewer new words are left than a group holds.</span></span>
        <select class="tile py-1" :value="draft.topUp ?? 'trouble'" data-testid="top-up" @change="draft = { ...draft, topUp: ($event.target as HTMLSelectElement).value as 'trouble' | 'next' }">
          <option value="trouble">Words that gave trouble</option>
          <option value="next">Next group's words</option>
        </select>
      </label>
      <label class="flex items-center justify-between gap-2">
        Time to recall
        <select class="tile py-1" :value="draft.recallSeconds" data-testid="recall-seconds" @change="draft = { ...draft, recallSeconds: Number(($event.target as HTMLSelectElement).value) as 5 | 10 | 15 | 20 | 30 }">
          <option v-for="n in [5, 10, 15, 20, 30]" :key="n" :value="n">{{ n }} s</option>
        </select>
      </label>
      <p class="-mt-1 text-xs text-stone-500">In recall games, the answer shows by itself after this.</p>
    </section>
    <section class="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm dark:bg-stone-900">
      <h2 class="font-semibold">Cards</h2>
      <template v-for="kind in KINDS" :key="kind">
        <label class="flex items-center justify-between gap-2">
          <span class="flex flex-col">{{ KIND_TITLES[kind][0] }}<span class="text-xs text-stone-500">{{ KIND_TITLES[kind][1] }}</span></span>
          <input type="checkbox" class="h-5 w-5 accent-orange-600" :checked="draft.kinds?.[kind] !== false" :data-testid="`kind-${kind}`" @change="setKind(kind, ($event.target as HTMLInputElement).checked)" />
        </label>
        <p v-if="ownGroups(kind)" class="-mt-1 flex items-center justify-between gap-2 text-xs text-stone-500" :data-testid="`kind-own-${kind}`">
          {{ ownGroups(kind) === 1 ? '1 group keeps its own' : `${ownGroups(kind)} groups keep their own` }}
          <button class="font-medium text-orange-700 dark:text-orange-400" :data-testid="`kind-reset-${kind}`" @click="resetGroups(kind)">Reset</button>
        </p>
      </template>
      <p class="-mt-1 text-xs text-stone-500">Off leaves those cards out of learning and review; what was learned comes back when on. A section can keep its own choice from its menu.</p>
    </section>
    <section class="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm dark:bg-stone-900">
      <h2 class="font-semibold">Writing</h2>
      <label class="flex items-center justify-between gap-2">
        Ignore letter case (A = a)
        <input type="checkbox" class="h-5 w-5 accent-orange-600" :checked="draft.ignoreCase" data-testid="ignore-case" @change="draft = { ...draft, ignoreCase: ($event.target as HTMLInputElement).checked }" />
      </label>
      <label class="flex items-center justify-between gap-2">
        Ignore accents (é = e)
        <input type="checkbox" class="h-5 w-5 accent-orange-600" :checked="draft.ignoreMarks" data-testid="ignore-marks" @change="draft = { ...draft, ignoreMarks: ($event.target as HTMLInputElement).checked }" />
      </label>
    </section>
    <section class="flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm dark:bg-stone-900">
      <h2 class="font-semibold">Progress</h2>
      <div class="grid grid-cols-2 gap-2">
        <button class="btn-ghost" data-testid="export" @click="saveBackup()">Save backup</button>
        <button class="btn-ghost" data-testid="import" @click="importDialog.open()">Load from file</button>
      </div>
      <p class="-mt-1 text-xs text-stone-500">Saving keeps everything: progress, schedules, scores, settings, your words and unfinished sessions. Loading takes a saved backup or a Lexilize backup.</p>
    </section>
    <p v-if="imported" class="text-sm text-stone-500" data-testid="imported">{{ imported }}</p>
  </div>
</template>

