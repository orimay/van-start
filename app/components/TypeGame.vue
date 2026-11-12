<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { diffLetters, isCorrect, soundsLike } from '@/utils/answer';
import type { StudyCard } from '@/utils/deck';
import { speak } from '@/utils/speak';
import { learnGaps, typingPart } from '@/utils/typing-pace';

/** `missed`: the miss is shown, the answer is not; `shown`: both are. A new try hides the answer again. */
type Phase = 'typing' | 'missed' | 'shown' | 'done';
interface State { input?: string; verdict?: boolean; phase?: Phase | 'fixing'; retried?: boolean; again?: boolean }

/** `listening`: the Dutch is only heard until its answer shows. */
const props = defineProps<{ card: StudyCard; lang: string; listening?: boolean; state?: State }>();
const emit = defineEmits<{ result: [ok: boolean, guessed?: boolean, typingMs?: number]; progress: [state: State]; miss: [] }>();
/** The answer was out since the last try, so a wrong one counts as another miss. */
let sawAnswer = false;

const input = shallowRef(props.state?.input ?? '');
/** The first attempt's result; a later right try does not undo a miss. */
const verdict = shallowRef(props.state?.verdict);
/** Time spent typing, so a long word is not timed as a slow recall. */
let typingMs = 0;
let typedAt: number | undefined;
const gaps: number[] = [];
watch(input, () => {
  const now = Date.now();
  if (typedAt !== undefined) {
    typingMs += typingPart(now - typedAt, gaps);
    gaps.push(now - typedAt);
  }
  typedAt = now;
});
/** The answer was shown before this try, so a typo in it is not claimable. */
const retried = shallowRef(props.state?.retried ?? false);
/** This is not the first try, so claiming it leaves the first one's miss. */
const again = shallowRef(props.state?.again ?? false);
const PHASES: Phase[] = ['typing', 'missed', 'shown', 'done'];
// A phase saved by an older version (the retype field) comes back as the shown answer.
const saved = props.state?.phase && (PHASES.includes(props.state.phase as Phase) ? (props.state.phase as Phase) : 'shown');
const phase = shallowRef<Phase>(saved || (verdict.value === undefined ? 'typing' : verdict.value ? 'done' : 'missed'));
const field = useTemplateRef('field');
const keeper = useTemplateRef('keeper');
const letters = computed(() => diffLetters(input.value, props.card.answer));
const answerShown = computed(() => phase.value === 'shown' || phase.value === 'done');
if (props.listening && !answerShown.value) speak(props.card);

onMounted(() => (phase.value === 'typing' ? field : keeper).value?.focus());
/** A typo may be claimed right once it can be compared with the answer; giving up leaves nothing to claim. */
const claimable = computed(() => phase.value === 'shown' && input.value !== '' && !retried.value);

function matches(text: string) {
  const { ignoreCase, ignoreMarks } = useStore().settings.value;
  return isCorrect(text, props.card.answer, { ignoreCase, ignoreMarks });
}

/** Dictation can only judge what was heard: a spelling that sounds the same counts. */
const sameSound = computed(() => props.listening && phase.value === 'done' && !matches(input.value) && soundsLike(input.value, props.card.answer));

function goTo(next: Phase) {
  phase.value = next;
  if (next === 'shown') sawAnswer = true;
  emit('progress', { input: input.value, verdict: verdict.value, phase: next, retried: retried.value, again: again.value });
  void nextTick(() => (next === 'typing' ? field : keeper).value?.focus());
}

function submit() {
  if (phase.value === 'done') {
    learnGaps(gaps);
    return emit('result', verdict.value!, false, typingMs);
  }
  if (phase.value !== 'typing') return;
  const ok = matches(input.value) || (props.listening && soundsLike(input.value, props.card.answer));
  if (!ok && sawAnswer) emit('miss');
  sawAnswer = false;
  verdict.value ??= ok;
  goTo(ok ? 'done' : 'missed');
}

function tryAgain() {
  retried.value ||= phase.value === 'shown';
  again.value = true;
  input.value = '';
  goTo('typing');
}

function accept() {
  if (!again.value) verdict.value = true;
  goTo('done');
}

/** Enter while no field is shown: the keyboard stays up, and Enter does what the main button does. */
function onKeeperEnter() {
  if (phase.value === 'missed' || phase.value === 'shown') tryAgain();
  else submit();
}

function giveUp() {
  input.value = '';
  verdict.value = false;
  goTo('shown');
}
</script>

<template>
  <div class="flex flex-1 flex-col justify-between gap-2">
    <div class="flex flex-1 flex-col gap-2">
      <!-- Dictation: nothing to read until answered, so the ear does the work. -->
      <Prompt v-if="!listening || answerShown" :card="card" :secret="!answerShown" />
      <!-- Dictation: the speaker holds the hidden Dutch's place, and the Dutch shows without being voiced again. -->
      <ListenButton v-if="listening && phase === 'typing'" :card="card" />
      <Answer v-else :card="card" :hidden="!answerShown" :silent="listening" :right="phase === 'done'">
        <template #above>
          <p v-if="claimable" data-testid="typed" class="text-xl"><TypedLetters :letters="letters" /></p>
          <p v-if="sameSound" data-testid="same-sound" class="text-sm text-stone-500">Sounds the same, spelled {{ card.answer }}</p>
        </template>
        <p v-if="phase === 'missed'" data-testid="typed"><TypedLetters :letters="letters" /></p>
      </Answer>
    </div>
    <div class="flex flex-col gap-2">
      <TextField v-if="phase === 'typing'" ref="field" v-model="input" data-testid="input" :lang="lang" @enter="submit" />
      <ExampleButton v-if="phase === 'done' || listening" :card="card" />
      <TextField v-if="phase === 'missed' || phase === 'shown' || phase === 'done'" ref="keeper" data-testid="keeper" aria-hidden="true" class="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0" :lang="lang" @enter="onKeeperEnter" />
      <div class="actions flex gap-2"><BackButton /><LaterButton /><div class="grid flex-1 grid-cols-2 gap-2">
        <button v-if="claimable" type="button" class="btn-ghost"  data-testid="accept" @click="accept">I was right</button>
        <template v-if="phase === 'missed'">
          <button type="button" class="btn-ghost" data-testid="show-answer" @click="goTo('shown')">Reveal answer</button>
          <button type="button" class="btn-primary" data-testid="try-again" @click="tryAgain">Try again</button>
        </template>
        <button v-else-if="phase === 'shown'" type="button" class="btn-primary" :class="claimable ? '' : 'col-span-2'" data-testid="try-again" @click="tryAgain">Try again</button>
        <template v-else>
          <button v-if="phase === 'typing'" type="button" class="btn-ghost" data-testid="unknown" @click="giveUp">No idea</button>
          <button v-else-if="verdict" type="button" class="btn-ghost" data-testid="guessed" @click="emit('result', false, true)">Guessed</button>
          <button type="button" class="btn-primary" :class="phase === 'done' && !verdict ? 'col-span-2' : ''" data-testid="submit" @click="submit">
            {{ phase === 'done' ? 'Next' : 'Check' }}
          </button>
        </template>
      </div></div>
    </div>
  </div>
</template>
