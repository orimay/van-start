import { shallowRef } from 'vue';
import type { StudyCard } from '@/utils/deck';

/** Keys a card's sounds play under, so their buttons know when they are playing. */
export const cardKey = (card: StudyCard) => `card:${card.nl}`;
export const exampleKey = (card: StudyCard) => `example:${card.nlExample}`;

// One element reused for every sound: iOS unlocks playback per element on the first tap, and a new sound cuts off the last.
let player: HTMLAudioElement | undefined;

/** Whether the browser can record the learner. */
export const canRecord = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** What is playing now, by the key it was played under. */
export const playing = shallowRef<string>();

/** Stops whatever plays, clip or device voice. */
export function stopPlaying() {
  player?.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel();
  playing.value = undefined;
}

/** Plays a sound under `key`, cutting off the one before; `then` runs once it has ended. */
export function play(src: string, key: string, then?: () => void, failed?: () => void) {
  stopPlaying();
  player ??= new Audio();
  const own = player;
  own.onended = () => {
    playing.value = undefined;
    then?.();
  };
  own.src = src;
  playing.value = key;
  own.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (playing.value === key) playing.value = undefined;
    failed?.();
  });
}
