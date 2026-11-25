import { shallowRef } from 'vue';
import { onBack } from '@/utils/back';

/** A sheet on a card, opened from a link; `gloss` is the meaning the link gave the word. */
interface Layer {
  id: string;
  gloss?: string;
  drop: () => void;
}

const layers = shallowRef<Layer[]>([]);
/** The card whose answer is still secret: sheets leave it out of their lists. */
const secret = shallowRef<string>();

function pop() {
  layers.value = layers.value.slice(0, -1);
}

/** Sheets on the cards a note links to, stacked: back closes the top one. */
export function useCardSheet() {
  const { index } = useStore();
  return {
    index,
    layers,
    secret,
    open(id: string, gloss?: string, hide?: string) {
      if (!layers.value.length) secret.value = hide;
      layers.value = [...layers.value, { id, gloss, drop: onBack(pop) }];
    },
    /** Back to the sheet under the top one. */
    back() {
      layers.value.at(-1)?.drop();
      pop();
    },
    close() {
      for (const layer of [...layers.value].reverse()) layer.drop();
      layers.value = [];
    },
  };
}
