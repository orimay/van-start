import type { StudyCard } from '@/utils/deck';

import { cardKey, exampleKey, play, playing } from '@/utils/play';

if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.getVoices();

/** Fallback when a clip cannot play (e.g. offline and not cached yet): the device's Dutch voice, if any. */
function sayWithDevice(text: string, key: string) {
  const voice = 'speechSynthesis' in window ? speechSynthesis.getVoices().find(v => /^nl[-_]/i.test(v.lang)) : undefined;
  if (!voice) return;
  const utterance = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ''));
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.onend = () => playing.value === key && (playing.value = undefined);
  speechSynthesis.cancel();
  playing.value = key;
  speechSynthesis.speak(utterance);
}

/** Plays the neural-voice clip, fetched on first use and cached by the service worker. */
function say(text: string | undefined, clip: string | undefined, key: string) {
  if (!text) return;
  if (!clip) return sayWithDevice(text, key);
  play(`${useRuntimeConfig().public.audioBase}${clip}.mp3`, key, undefined, () => sayWithDevice(text, key));
}


export const speak = (card: StudyCard) => say(card.nl, card.audio, cardKey(card));
export const speakExample = (card: StudyCard) => say(card.nlExample, card.exampleAudio, exampleKey(card));
