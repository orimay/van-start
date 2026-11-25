import { stopPlaying } from '@/utils/play';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import type { GameScores, Score } from '@/utils/score';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import Session from './Session.vue';
import { ladder } from '@/utils/scheduler';
import type { StudyCard } from '@/utils/deck';
import { speak, speakExample } from '@/utils/speak';
import { noteStep } from '@/utils/check-for-update';

vi.mock('@/utils/speak');
vi.mock('@/utils/check-for-update');

const cards = (n: number): StudyCard[] => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, prompt: `p${i}`, answer: `a${i}`, nl: `a${i}` }));

describe('learning', () => {
  it('introduces new cards in deck order', async () => {
    const w = await doMount({ cards: cards(5), stages: ['intro'] });
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(promptOf(w));
      await doClick(w, 'next');
    }
    expect(seen).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
  });

  it('never shows the same card twice in a row, across games too', async () => {
    for (let run = 0; run < 20; run++) {
      const w = await doMount({ cards: cards(4), stages: ['intro', 'recall', 'recall'] });
      const seen: string[] = [];
      while (!w.emitted('finished')) {
        if (w.find('[data-testid="next-game"]').exists()) {
          await doClick(w, 'start-game');
          continue;
        }
        seen.push(promptOf(w));
        await (seen.length <= 4 ? doClick(w, 'next') : doRecall(w, true));
      }
      expect(seen.some((p, i) => p === seen[i - 1])).toBe(false);
    }
  });

  it('repeats a missed card once four others have come between', async () => {
    const w = await doMount({ cards: cards(6), stages: ['recall'] });
    const missed = promptOf(w);
    await doRecall(w, false);
    const pass: string[] = [];
    for (let i = 0; i < 4; i++) {
      pass.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(pass).not.toContain(missed);
    expect(promptOf(w)).toBe(missed);
  });
});

describe('a card mixed up with another', () => {
  /** The deck the mix-up sheet searches, holding the session's cards. */
  function givenDeck(list: StudyCard[]) {
    const { deck, unconfuse, confusions } = useStore();
    const was = deck.value;
    deck.value = { id: 'root', name: 'root', cards: list.map(c => ({ id: c.id, f: c.prompt, b: c.answer })) };
    onTestFinished(() => {
      deck.value = was;
      for (const [a, others] of Object.entries(confusions.value)) for (const b of others) unconfuse(a, b);
    });
  }

  it('stays on the card, Remembered off while the mix-up picked on it stands', async () => {
    givenDeck(cards(6));
    const w = await doMount({ cards: cards(6), stages: ['recall'] });
    const first = promptOf(w);
    await doRecall(w, true);
    const second = promptOf(w);
    await doMixUp(w, idOf(first));
    expect(promptOf(w)).toBe(second);
    ensureDisabled(w, 'remembered');
    ensureDisabled(w, 'guessed');
    ensureContains(w, 'mixed-hint', answerFor(first));
  });

  it('says both come back when taken for one word, all when for more', async () => {
    givenDeck(cards(6));
    const w = await doMount({ cards: cards(6), stages: ['recall'] });
    const first = promptOf(w);
    await doRecall(w, true);
    const second = promptOf(w);
    await doRecall(w, true);
    await doMixUp(w, idOf(first));
    expect(w.get('[data-testid="mixed-hint"]').text()).toBe(`Taken for ${answerFor(first)}: both come back as missed`);
    await doMixUp(w, idOf(second));
    expect(w.get('[data-testid="mixed-hint"]').text()).toBe(`Taken for ${answerFor(first)}, ${answerFor(second)}: all come back as missed`);
  });

  it('turns Remembered back on once that mix-up is taken back', async () => {
    givenDeck(cards(6));
    const w = await doMount({ cards: cards(6), stages: ['recall'] });
    const first = promptOf(w);
    await doRecall(w, true);
    await doMixUp(w, idOf(first));
    await doMixUp(w, idOf(first));
    ensureDisabled(w, 'remembered', false);
    expect(w.find('[data-testid="mixed-hint"]').exists()).toBe(false);
  });

  describe('linked from the card sheet', () => {
    it('turns Remembered off on the revealed card', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      await doClick(w, 'reveal');
      await doLinkInCardSheet(w, idOf(first));
      ensureDisabled(w, 'remembered');
      ensureContains(w, 'mixed-hint', answerFor(first));
    });

    it('turns Remembered back on once unlinked there', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      await doClick(w, 'reveal');
      await doLinkInCardSheet(w, idOf(first));
      await doUnlinkInCardSheet(w, idOf(first));
      ensureDisabled(w, 'remembered', false);
    });

    /** The card sheet's Add and ✕ write the link straight to the store. */
    async function doLinkInCardSheet(w: VueWrapper, other: string) {
      useStore().confuse(idOf(promptOf(w)), other);
      await nextTick();
    }

    async function doUnlinkInCardSheet(w: VueWrapper, other: string) {
      useStore().unconfuse(idOf(promptOf(w)), other);
      await nextTick();
    }
  });

  describe('linked earlier', () => {
    it('is shown once the card is revealed', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      useStore().confuse(idOf(promptOf(w)), idOf(first));
      await nextTick();
      ensureHas(w, 'mixed-before', false);
      await doClick(w, 'reveal');
      expect(readMixedBefore(w)).toEqual([answerFor(first)]);
    });

    it('are listed newest first', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      const second = promptOf(w);
      await doRecall(w, true);
      useStore().confuse(idOf(promptOf(w)), idOf(first));
      useStore().confuse(idOf(promptOf(w)), idOf(second));
      await doClick(w, 'reveal');
      expect(readMixedBefore(w)).toEqual([answerFor(second), answerFor(first)]);
    });

    it('keeps Remembered on', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      useStore().confuse(idOf(promptOf(w)), idOf(first));
      await doClick(w, 'reveal');
      ensureDisabled(w, 'remembered', false);
    });

    it('counts as mixed up again when picked: both missed, the link kept', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      const second = idOf(promptOf(w));
      useStore().confuse(second, idOf(first));
      await doMixUp(w, idOf(first));
      ensureDisabled(w, 'remembered');
      ensureHas(w, 'mixed-before', false);
      await doClick(w, 'forgot');
      expect(w.emitted('answer')).toContainEqual([idOf(first), 'recall', false]);
      expect(w.emitted('answer')).toContainEqual([second, 'recall', false]);
      expect(useStore().confusions.value[second]).toEqual([idOf(first)]);
    });
  });

  it('keeps the mix-up picked on the card when continued', async () => {
    givenDeck(cards(6));
    const before = await doMount({ cards: cards(6), stages: ['recall'] });
    const first = promptOf(before);
    await doRecall(before, true);
    await doMixUp(before, idOf(first));
    const after = await doMount({ cards: cards(6), stages: ['recall'], resumeAt: lastPosition(before), announce: true });
    await doClick(after, 'start-game');
    ensureDisabled(after, 'remembered');
  });

  it('brings the other back as missed, with other cards between', async () => {
    givenDeck(cards(8));
    const w = await doMount({ cards: cards(8), stages: ['recall'], retryGap: 4 });
    const first = promptOf(w);
    await doRecall(w, true);
    const second = promptOf(w);
    await doMixUp(w, idOf(first));
    await doClick(w, 'forgot');
    const seen: string[] = [];
    while (!w.emitted('finished')) {
      seen.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(seen.indexOf(first)).toBeGreaterThan(1);
    expect(seen.indexOf(first)).toBeLessThan(seen.indexOf(second));
    expect(w.emitted('answer')).toContainEqual([idOf(first), 'recall', false]);
  });

  describe('a miss', () => {
    it('counts the cards linked to it as missed too', async () => {
      givenDeck(cards(6));
      const w = await doMount({ cards: cards(6), stages: ['recall'] });
      const first = promptOf(w);
      await doRecall(w, true);
      useStore().confuse(idOf(promptOf(w)), idOf(first));
      await doRecall(w, false);
      expect(w.emitted('answer')).toContainEqual([idOf(first), 'recall', false]);
    });

    it('follows no link of a link', async () => {
      givenDeck(cards(8));
      const w = await doMount({ cards: cards(6), pool: cards(8), stages: ['recall'] });
      const second = idOf(promptOf(w));
      useStore().confuse(second, 'c6');
      useStore().confuse('c6', 'c7');
      await doRecall(w, false);
      expect(w.emitted('answer')).toContainEqual(['c6', 'recall', false]);
      expect(w.emitted('answer')).not.toContainEqual(['c7', 'recall', false]);
    });

    it('brings the linked ones back, with other cards between', async () => {
      givenDeck(cards(8));
      const w = await doMount({ cards: cards(6), pool: cards(8), stages: ['recall'], retryGap: 4 });
      useStore().confuse(idOf(promptOf(w)), 'c7');
      await doRecall(w, false);
      const seen: string[] = [];
      while (!w.emitted('finished')) {
        seen.push(promptOf(w));
        await doRecall(w, true);
      }
      expect(seen.indexOf('p7')).toBeGreaterThan(0);
    });

    it('leaves the linked ones alone when remembered', async () => {
      givenDeck(cards(8));
      const w = await doMount({ cards: cards(6), pool: cards(8), stages: ['recall'] });
      useStore().confuse(idOf(promptOf(w)), 'c7');
      await doRecall(w, true);
      expect(w.emitted('answer')).not.toContainEqual(['c7', 'recall', false]);
    });

  });

  it('brings in a deck card the session did not hold', async () => {
    givenDeck(cards(8));
    const w = await doMount({ cards: cards(6), pool: cards(8), stages: ['recall'] });
    await doMixUp(w, 'c7');
    await doClick(w, 'forgot');
    const seen: string[] = [];
    while (!w.emitted('finished')) {
      seen.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(seen).toContain('p7');
    expect(w.emitted('answer')).toContainEqual(['c7', 'recall', false]);
  });
});

describe('a typed answer that is another word', () => {
  const words = (...answers: string[]): StudyCard[] => [{ id: 'c0', prompt: 'p0', answer: 'a0', nl: 'a0' }, ...answers.map((answer, i) => ({ id: `c${i + 1}`, prompt: `p${i + 1}`, answer, nl: answer }))];

  /** The deck the typed answer is looked up in. */
  function givenDeck(list: StudyCard[]) {
    const { deck, unconfuse, confusions } = useStore();
    const was = deck.value;
    deck.value = { id: 'root', name: 'root', cards: list.map(c => ({ id: c.id, f: c.prompt, b: c.answer })) };
    onTestFinished(() => {
      deck.value = was;
      for (const [a, others] of Object.entries(confusions.value)) for (const b of others) unconfuse(a, b);
    });
  }

  async function doMountTyping(list: StudyCard[]) {
    givenDeck(list);
    return doMount({ cards: list.slice(0, 1), pool: list, stages: ['type'] });
  }

  it('is taken for that word', async () => {
    const w = await doMountTyping(words('terug', 'weg'));
    await doType(w, 'input', 'terug');
    ensureContains(w, 'mixed-hint', 'terug');
    expect(useStore().confusions.value.c0).toEqual(['c1']);
  });

  it('counts symbols', async () => {
    const w = await doMountTyping(words('terug', 'terug-'));
    await doType(w, 'input', 'terug-');
    expect(useStore().confusions.value.c0).toEqual(['c2']);
  });

  it('brings that word back as missed', async () => {
    const w = await doMountTyping(words('terug', 'weg'));
    await doType(w, 'input', 'terug');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'a0');
    await doClick(w, 'submit');
    expect(w.emitted('answer')).toContainEqual(['c1', 'type', false]);
  });

  it('keeps the words it was mixed up with before back until the answer shows, so a retry cannot steer clear of them', async () => {
    const w = await doMountTyping(words('terug', 'weg'));
    useStore().confuse('c0', 'c2');
    await doType(w, 'input', 'xyz');
    ensureHas(w, 'mixed-before', false);
    await doClick(w, 'show-answer');
    expect(readMixedBefore(w)).toEqual(['weg']);
  });

  it('is also a word linked in the card sheet once the answer shows', async () => {
    const w = await doMountTyping(words('terug', 'weg'));
    await doType(w, 'input', 'xyz');
    await doClick(w, 'show-answer');
    useStore().confuse('c0', 'c2');
    await nextTick();
    ensureContains(w, 'mixed-hint', 'weg');
  });

  it('keeps the word guessed out of the mix-up sheet until the answer shows', async () => {
    const w = await doMountTyping(words('terug', 'weg'));
    useStore().confuse('c0', 'c2');
    await doType(w, 'input', 'xyz');
    await doClick(w, 'mixed-up');
    const sheet = w.get('[data-testid="mix-up-sheet"]').text();
    expect(sheet).not.toContain('a0');
    expect(sheet).not.toContain('weg');
  });

  it('keeps an earlier link picked again once claimed right', async () => {
    const w = await doMountTyping(words('terug', 'weg'));
    useStore().confuse('c0', 'c2');
    await doType(w, 'input', 'xyz');
    await doClick(w, 'show-answer');
    await doClick(w, 'mixed-up');
    await w.get('[data-testid="mix-up-option"]').trigger('click');
    await doClick(w, 'mix-up-done');
    ensureContains(w, 'mixed-hint', 'weg');
    await doClick(w, 'accept');
    ensureHas(w, 'mixed-hint', false);
    expect(useStore().confusions.value.c0).toEqual(['c2']);
  });

  it('is no mix-up once claimed right', async () => {
    const w = await doMountTyping(words('terug'));
    await doType(w, 'input', 'terug');
    await doClick(w, 'show-answer');
    await doClick(w, 'accept');
    ensureHas(w, 'mixed-hint', false);
    expect(useStore().confusions.value.c0 ?? []).toEqual([]);
  });

  describe('linked by hand', () => {
    const list = words('de tocht', 'de wandeling', 'fietsen');

    async function doLink(w: VueWrapper, word: string) {
      const search = w.get('[data-testid="mix-up-search"]');
      search.element.textContent = word;
      await search.trigger('input');
      await w.get('[data-testid="mix-up-option"]').trigger('click');
    }

    for (const [where, pool] of [['in the round', list], ['only in the deck', [list[0]!, list[3]!]]] as const) {
      it(`counts every word picked as missed in this game, ${where}`, async () => {
        givenDeck(list);
        const w = await doMount({ cards: [list[0]!, list[3]!], pool: [...pool], stages: ['type'] });
        const answer = list.find(c => c.prompt === promptOf(w))!.answer;
        await doType(w, 'input', 'fietwandeling');
        await doClick(w, 'mixed-up');
        await doLink(w, 'tocht');
        await doLink(w, 'wandeling');
        await doClick(w, 'mix-up-done');
        await doClick(w, 'try-again');
        await doType(w, 'input', answer);
        await doClick(w, 'submit');
        expect(w.emitted('answer')).toEqual(expect.arrayContaining([['c1', 'type', false], ['c2', 'type', false]]));
      });
    }
  });

  describe('on a card put off', () => {
    const list = words('terug', 'weg');
    /** `terug` is in the deck but not in the round, so whichever card shows can be typed as it. */
    async function doMountPair() {
      givenDeck(list);
      return doMount({ cards: [list[0]!, list[2]!], pool: list, stages: ['type'] });
    }
    const answerOf = (w: VueWrapper) => list.find(c => c.prompt === promptOf(w))!.answer;
    const missesLeft = (w: VueWrapper, id: string) =>
      (w.emitted('answer') ?? []).filter(([at, , ok]) => at === id && !ok).length - (w.emitted('undo') ?? []).filter(([at]) => at === id).length;

    it('takes that word\'s miss back', async () => {
      const w = await doMountPair();
      await doType(w, 'input', 'terug');
      await doClick(w, 'later');
      expect(missesLeft(w, 'c1')).toBe(0);
    });

    it('unlinks that word', async () => {
      const w = await doMountPair();
      const id = list.find(c => c.prompt === promptOf(w))!.id;
      await doType(w, 'input', 'terug');
      await doClick(w, 'later');
      expect(useStore().confusions.value[id] ?? []).toEqual([]);
    });

    it('takes that word\'s miss back when put off after stepping back to it', async () => {
      const w = await doMountPair();
      await doType(w, 'input', 'terug');
      await doClick(w, 'try-again');
      await doType(w, 'input', answerOf(w));
      await doClick(w, 'submit');
      await doClick(w, 'previous');
      await doClick(w, 'later');
      expect(missesLeft(w, 'c1')).toBe(0);
    });
  });

  describe('matching several words', () => {
    it('asks which one it was taken for', async () => {
      const w = await doMountTyping(words('een (a)', 'een (one)', 'eens'));
      await doType(w, 'input', 'een');
      expect(w.findAll('[data-testid="mix-up-typed"] [data-testid="mix-up-word"]').map(o => o.text())).toEqual(['een (a)', 'een (one)']);
      await w.findAll('[data-testid="mix-up-typed"] [data-testid="mix-up-option"]')[1]!.trigger('click');
      await doClick(w, 'mix-up-done');
      expect(useStore().confusions.value.c0).toEqual(['c2']);
      ensureContains(w, 'mixed-hint', 'een (one)');
    });

    it('offers the hyphenated word too when typed without its hyphen', async () => {
      const w = await doMountTyping(words('terug', 'terug-'));
      await doType(w, 'input', 'terug');
      expect(w.findAll('[data-testid="mix-up-typed"] [data-testid="mix-up-word"]').map(o => o.text())).toEqual(['terug', 'terug-']);
    });

    it('says all come back once taken for more than one', async () => {
      const w = await doMountTyping(words('een (a)', 'een (one)'));
      await doType(w, 'input', 'een');
      for (const option of w.findAll('[data-testid="mix-up-typed"] [data-testid="mix-up-option"]')) await option.trigger('click');
      await doClick(w, 'mix-up-done');
      expect(w.get('[data-testid="mixed-hint"]').text()).toBe('Taken for een (a), een (one): all come back as missed');
    });

    it('asks again from the card once closed unanswered', async () => {
      const w = await doMountTyping(words('een (a)', 'een (one)'));
      await doType(w, 'input', 'een');
      await doClick(w, 'mix-up-done');
      ensureHas(w, 'mix-up-typed', false);
      await doClick(w, 'mixed-up');
      ensureHas(w, 'mix-up-typed');
    });
  });
});

describe('choice', () => {
  it('repeats a missed card once four others have come between', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(6), stages: ['choice'] });
    const missed = promptOf(w);
    await doPick(w, w.findAll('[data-testid="option"]').map(o => o.text()).find(o => !o.startsWith(answerFor(missed)))!);
    await doClick(w, 'next');
    const pass: string[] = [];
    for (let i = 0; i < 4; i++) {
      pass.push(promptOf(w));
      await doPick(w, answerFor(promptOf(w)));
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(pass).not.toContain(missed);
    expect(promptOf(w)).toBe(missed);
    vi.useRealTimers();
  });

  it('offers five options, one of them right', async () => {
    const w = await doMount({ cards: cards(8), stages: ['choice'] });
    const options = w.findAll('[data-testid="option"]').map(o => o.text());
    expect(options).toHaveLength(5);
    expect(options.some(o => o.startsWith(answerFor(promptOf(w))))).toBe(true);
  });

  it('offers the words that look most like the answer', async () => {
    const words = ['zeven', 'geven', 'leven', 'zweven', 'hoeven', 'de appel', 'het boek', 'rood', 'de straat', 'lopen'];
    const pool = words.map((answer, i) => ({ id: `w${i}`, prompt: `p${i}`, answer, nl: answer }));
    const w = await doMount({ cards: pool.slice(0, 1), stages: ['choice'], pool });
    expect(w.findAll('[data-testid="option"]').map(o => o.text()).sort()).toEqual(['geven', 'hoeven', 'leven', 'zeven', 'zweven']);
  });

  it('prefers known words among equal lookalikes', async () => {
    const words = ['zeven', 'geven', 'beven', 'heven', 'leven', 'weven', 'de appel'];
    const pool = words.map((answer, i) => ({ id: `w${i}`, prompt: `p${i}`, answer, nl: answer }));
    const w = await doMount({ cards: pool.slice(0, 1), stages: ['choice'], pool, known: ['w5'] });
    expect(w.findAll('[data-testid="option"]').map(o => o.text())).toContain('weven');
  });

  it('tops the options up from the pool when the set is small', async () => {
    const set = cards(2);
    const w = await doMount({ cards: set, stages: ['choice'], pool: cards(10) });
    expect(w.findAll('[data-testid="option"]')).toHaveLength(5);
  });

  it('moves on by itself after the right pick', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(8), stages: ['choice'] });
    const first = promptOf(w);
    await doPick(w, answerFor(first));
    await vi.advanceTimersByTimeAsync(500);
    expect(promptOf(w)).not.toBe(first);
    vi.useRealTimers();
  });

  it('waits for Next after a wrong pick', async () => {
    const w = await doMount({ cards: cards(8), stages: ['choice'] });
    const first = promptOf(w);
    const wrong = w.findAll('[data-testid="option"]').map(o => o.text()).find(o => !o.startsWith(answerFor(first)))!;
    await doPick(w, wrong);
    expect(promptOf(w)).toBe(first);
    await doClick(w, 'next');
    expect(promptOf(w)).not.toBe(first);
  });

  it('lets the learner step back before picking', async () => {
    const w = await doMount({ cards: cards(8), stages: ['intro', 'choice'] });
    for (let i = 0; i < 8; i++) await doClick(w, 'next');
    expect(w.find('[data-testid="previous"]').exists()).toBe(true);
  });
});

describe('an affix meaning among options', () => {
  const affixes: StudyCard[] = ['-es', '-in', '-te', '-heid', 'ge-'].map((dutch, i) => ({ id: `x${i}`, prompt: dutch, answer: `m${i}`, nl: `w${i}`, affix: { dutch } }));

  it('says it means an affix in choice', async () => {
    const w = await doMount({ cards: affixes, stages: ['choice'] });
    expect(w.findAll('[data-testid="option"]').map(o => o.text()).sort()).toEqual(['m0 (affix)', 'm1 (affix)', 'm2 (affix)', 'm3 (affix)', 'm4 (affix)']);
  });

  it('never breaks an affix a meaning names from its hyphen', async () => {
    const named = affixes.map(c => ({ ...c, answer: `${c.answer} не после -er` }));
    const choice = await doMount({ cards: named, stages: ['choice'] });
    expect(choice.findAll('[data-testid="option"]').map(o => o.find('[data-testid="unbroken"]').text())).toEqual(Array(5).fill('-er'));
    const match = await doMount({ cards: named, stages: ['match'] });
    expect(match.findAll('[data-testid="match-right"]').map(t => t.find('[data-testid="unbroken"]').text())).toEqual(Array(5).fill('-er'));
  });

  it('says it means an affix in match', async () => {
    const w = await doMount({ cards: affixes, stages: ['match'] });
    expect(w.findAll('[data-testid="match-right"]').map(t => t.get('[data-testid="match-text"]').text()).sort()).toEqual(['m0 (affix)', 'm1 (affix)', 'm2 (affix)', 'm3 (affix)', 'm4 (affix)']);
  });
});

describe('recall native', () => {
  it('keeps quiet until the answer shows, so the Dutch is read, not heard', async () => {
    vi.mocked(speak).mockClear();
    const w = await doMount({ cards: cards(2), stages: ['recallNative'] });
    expect(vi.mocked(speak)).not.toHaveBeenCalled();
    expect(w.get('[data-testid="play-card"]').attributes('disabled')).toBeDefined();
  });

  it('names its button Reveal', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recallNative'] });
    expect(w.get('[data-testid="reveal"]').text()).toBe('Reveal');
  });

  it('voices the Dutch on reveal', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recallNative'] });
    await doClick(w, 'reveal');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: promptOf(w) }));
    expect(w.get('[data-testid="play-card"]').attributes('disabled')).toBeUndefined();
  });
});

describe('pronouncing', () => {
  it('shows the Dutch quietly, with no timer', async () => {
    vi.mocked(speak).mockClear();
    const w = await doMount({ cards: cards(2), stages: ['pronounce'] });
    expect(promptOf(w)).toMatch(/^a/);
    expect(vi.mocked(speak)).not.toHaveBeenCalled();
    expect(w.get('[data-testid="timer"]').classes()).toContain('invisible');
  });

  it('shows the meaning at once, the transcription only on reveal', async () => {
    const w = await doMount({ cards: [{ ...cards(1)[0]!, tr: 'aa' }], stages: ['pronounce'] });
    expect(w.get('[data-testid="answer"]').element.closest('.invisible')).toBeNull();
    expect(w.get('[data-testid="answer"]').text()).toBe('p0');
    expect(w.get('[data-testid="transcription"]').classes()).toContain('invisible');
    await doClick(w, 'reveal');
    expect(w.get('[data-testid="transcription"]').classes()).not.toContain('invisible');
    expect(w.get('[data-testid="transcription"]').text()).toBe('[aa]');
  });

  it('offers the details only on reveal, as they give the transcription away', async () => {
    const w = await doMount({ cards: [{ ...cards(1)[0]!, tr: 'aa' }], stages: ['pronounce'] });
    expect(w.find('[data-testid="card-details"]').exists()).toBe(false);
    await doClick(w, 'reveal');
    expect(w.find('[data-testid="card-details"]').exists()).toBe(true);
  });

  it('voices the Dutch and shows its meaning on reveal', async () => {
    const w = await doMount({ cards: cards(2), stages: ['pronounce'] });
    const dutch = promptOf(w);
    await doClick(w, 'reveal');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: dutch }));
    expect(w.get('[data-testid="answer"]').text()).toBe('p' + dutch.slice(1));
  });

  it('is graded by the learner as said right or wrong', async () => {
    const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
    await doClick(w, 'reveal');
    expect([w.get('[data-testid="forgot"]').text(), w.get('[data-testid="remembered"]').text()]).toEqual(['Said wrong', 'Said right']);
    await doClick(w, 'forgot');
    expect(w.emitted('answer')?.at(-1)).toEqual(['c0', 'pronounce', false]);
  });

  it('offers the example and the right one to listen to once the answer shows', async () => {
    const w = await doMount({ cards: [{ ...cards(1)[0]!, nlExample: 'ex0' }], stages: ['pronounce'] });
    expect(w.get('[data-testid="play-example"]').attributes('disabled')).toBeDefined();
    await doClick(w, 'reveal');
    expect(w.get('[data-testid="play-example"]').attributes('disabled')).toBeUndefined();
    expect(w.find('[data-testid="play"]').exists()).toBe(false);
    vi.mocked(speak).mockClear();
    await doClick(w, 'play-card');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
  });

  describe('a recording', () => {
    afterEach(() => {
      stopPlaying();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('is offered where the browser can record', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      await doClick(w, 'record');
      await doClick(w, 'record');
      await flushPromises();
      expect(w.get('[data-testid="play"]').text()).toBe('▶ Compare');
      expect(w.find('[data-testid="play-card"]').exists()).toBe(false);
      expect(w.get('[data-testid="play"]').attributes('disabled')).toBeDefined();
    });

    it('plays before the right one on reveal', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      await doClick(w, 'record');
      await doClick(w, 'record');
      await flushPromises();
      vi.mocked(speak).mockClear();
      await doClick(w, 'reveal');
      expect(played).toEqual(['blob:mine']);
      expect(vi.mocked(speak)).not.toHaveBeenCalled();
      ended.at(-1)!();
      expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
    });

    it('plays again before the right one on Compare', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      await doClick(w, 'record');
      await doClick(w, 'record');
      await flushPromises();
      await doClick(w, 'reveal');
      ended.at(-1)!();
      await nextTick();
      played = [];
      vi.mocked(speak).mockClear();
      expect(w.get('[data-testid="play"]').text()).toBe('▶ Compare');
      await doClick(w, 'play');
      expect(played).toEqual(['blob:mine']);
      ended.at(-1)!();
      expect(vi.mocked(speak)).toHaveBeenCalledTimes(1);
    });

    it('that cannot play still lets the right one play', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      await doClick(w, 'record');
      await doClick(w, 'record');
      await flushPromises();
      vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new DOMException('broken', 'NotSupportedError'));
      vi.mocked(speak).mockClear();
      await doClick(w, 'reveal');
      await flushPromises();
      expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
    });

    it('can be made again once the answer shows, then compared', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      await doClick(w, 'reveal');
      expect(w.find('[data-testid="play"]').exists()).toBe(false);
      await doClick(w, 'record');
      await doClick(w, 'record');
      await flushPromises();
      expect(w.get('[data-testid="play"]').text()).toBe('▶ Compare');
      played = [];
      await doClick(w, 'play');
      expect(played).toEqual(['blob:mine']);
    });

    it('cannot be played before one is made', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      expect(w.find('[data-testid="play"]').exists()).toBe(false);
    });

    it('stops on a second tap while it plays', async () => {
      givenRecorder();
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      await doClick(w, 'record');
      await doClick(w, 'record');
      await flushPromises();
      await doClick(w, 'reveal');
      ended.at(-1)!();
      await nextTick();
      played = [];
      await doClick(w, 'play');
      expect(w.get('[data-testid="play"]').text()).toBe('■ Compare');
      await doClick(w, 'play');
      expect(w.get('[data-testid="play"]').text()).toBe('▶ Compare');
      expect(played).toEqual(['blob:mine']);
    });

    it('is not offered where the browser cannot record', async () => {
      const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
      expect(w.find('[data-testid="record"]').exists()).toBe(false);
    });
  });
});

describe('pronouncing as the intro', () => {
  it('shows the meaning on top and the Dutch under it', async () => {
    const w = await doMount({ cards: cards(1), stages: ['pronounce', 'recall'], introducing: true });
    expect(promptOf(w)).toBe('p0');
    expect(w.get('[data-testid="answer"]').text()).toBe('a0');
  });

  it('is announced, telling to remember, say aloud and compare', async () => {
    const w = await doMount({ cards: cards(1), stages: ['pronounce', 'recall'], introducing: true, announce: true });
    const page = w.get('[data-testid="next-game"]').text();
    expect(page).toContain('Remember');
    expect(page).toContain('compare');
    await doClick(w, 'start-game');
    expect(promptOf(w)).toBe('p0');
  });
});

describe('a note giving the answer away', () => {
  const card: StudyCard = { id: 'c0', prompt: 'ты хочешь', answer: 'jij wil', nl: 'jij wil', promptNote: 'вариант: jij wilt' };
  // Attached: a hidden line is told by its computed style, which a detached element lacks.
  const noteHidden = (w: VueWrapper) => !w.get('[data-testid="prompt-note-line"]').isVisible();

  it('waits for the reveal in recall', async () => {
    const w = await doMount({ cards: [card], stages: ['recall'] }, true);
    expect(noteHidden(w)).toBe(true);
    await doClick(w, 'reveal');
    expect(noteHidden(w)).toBe(false);
  });

  it('is shown at once when pronouncing, the Dutch being on screen', async () => {
    const w = await doMount({ cards: [card], stages: ['pronounce', 'recall'], introducing: true });
    expect(noteHidden(w)).toBe(false);
  });

  it('waits for the answer in typing', async () => {
    const w = await doMount({ cards: [card], stages: ['type'] }, true);
    expect(noteHidden(w)).toBe(true);
  });
});

describe('the buttons of pronouncing', () => {
  it('stay in place, disabled until they can be used', async () => {
    const w = await doMount({ cards: cards(1), stages: ['pronounce'] });
    expect(w.get('[data-testid="play-card"]').attributes('disabled')).toBeDefined();
    await doClick(w, 'reveal');
    expect(w.get('[data-testid="play-card"]').attributes('disabled')).toBeUndefined();
  });
});

describe('the count of cards left', () => {
  it('drops by one with each right answer, fillers included', async () => {
    const w = await doMount({ cards: cards(3), stages: ['recall'], retryGap: 5 });
    await doRecall(w, false);
    const counts = [leftOf(w)];
    while (counts.length < 40) {
      await doRecall(w, true);
      if (w.emitted('finished')) break;
      counts.push(leftOf(w));
    }
    expect(counts).toEqual(counts.map((_, i) => counts[0]! - i));
    expect(counts.at(-1)).toBe(1);
  });

  it('leaves out a miss nothing is left to space', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recall'], retryGap: 5 });
    await doRecall(w, false);
    expect(leftOf(w)).toBe(1);
  });

  it('counts the climbs of a miss the new cards still space', async () => {
    const w = await doMount({ cards: cards(10), stages: ['recall'], retryGap: 5 });
    await doRecall(w, false);
    // Nine new cards, the miss back after four of them and again after the last five.
    expect(leftOf(w)).toBe(9 + ladder(5).length);
  });
});

describe('back over passed cards', () => {
  it('shows the cards passed before, in the order they would have come, after the card answered last', async () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const fresh = await doMount({ cards: cards(4), stages: ['recall'], seed });
      const order = [promptOf(fresh)];
      for (let i = 0; i < 3; i++) {
        await doRecall(fresh, true);
        order.push(promptOf(fresh));
      }
      const passed = { ['c' + order[0]!.slice(1)]: ['recall'], ['c' + order[2]!.slice(1)]: ['recall'] };
      const w = await doMount({ cards: cards(4), stages: ['recall'], seed, passed, announce: true });
      await doClick(w, 'start-game');
      expect(promptOf(w), seed).toBe(order[1]);
      await doRecall(w, true);
      expect(promptOf(w), seed).toBe(order[3]);
      await doClick(w, 'previous');
      expect(promptOf(w), seed).toBe(order[1]);
      await doClick(w, 'previous');
      expect(promptOf(w), seed).toBe(order[0]);
      await doClick(w, 'previous');
      ensureHas(w, 'next-game');
    }
  });

  it('are passed over by the first Back, then go by again going forward', async () => {
    const fresh = await doMount({ cards: cards(3), stages: ['recall'], seed: 's1' });
    const order = [promptOf(fresh)];
    for (let i = 0; i < 2; i++) {
      await doRecall(fresh, true);
      order.push(promptOf(fresh));
    }
    const w = await doMount({ cards: cards(3), stages: ['recall'], seed: 's1', passed: { ['c' + order[1]!.slice(1)]: ['recall'] } });
    await doRecall(w, true);
    expect(promptOf(w)).toBe(order[2]);
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe(order[0]);
    await doClick(w, 'remembered');
    expect(promptOf(w)).toBe(order[2]);
  });

  it('leave the page of a game back to the last card of the game before', async () => {
    const w = await doMount({ cards: cards(3), stages: ['intro', 'recall'], passed: { c2: ['intro'], c0: ['recall'] } });
    await doClick(w, 'next');
    await doClick(w, 'next');
    ensureHas(w, 'next-game');
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe('p1');
  });

  it('leave them out of the count of cards left', async () => {
    const w = await doMount({ cards: cards(3), stages: ['recall'], passed: { c0: ['recall'] } });
    expect(w.get('[data-testid="left"]').text()).toBe('left 2');
  });
});

describe('a continued session', () => {
  it('picks up at a filler from the rest of the deck', async () => {
    const filler = { id: 'x9', prompt: 'p9', answer: 'a9', nl: 'a9' };
    const resumeAt = { stage: 0, queue: [{ match: false, ids: ['x9'], filler: true }, { match: false, ids: ['c0'] }], size: 1, reported: [] };
    const w = await doMount({ cards: cards(1), pool: [...cards(1), filler], stages: ['recall'], resumeAt });
    expect(promptOf(w)).toBe('p9');
  });

  it('does not pass a filler from the rest of the deck in its game', async () => {
    const filler = { id: 'x9', prompt: 'p9', answer: 'a9', nl: 'a9' };
    const resumeAt = { stage: 0, queue: [{ match: false, ids: ['x9'], filler: true }, { match: false, ids: ['c0'] }], size: 1, reported: [] };
    const w = await doMount({ cards: cards(1), pool: [...cards(1), filler], stages: ['recall'], resumeAt });
    await doRecall(w, true);
    expect((w.emitted('passed') ?? []).map(([id]) => id)).not.toContain('x9');
  });

  it('starts its game afresh when the saved spot names a card no longer in the group', async () => {
    const before = await doMount({ cards: cards(3), stages: ['recall'] });
    await doRecall(before, true);
    const w = await doMount({ cards: cards(3).slice(1), stages: ['recall'], resumeAt: lastPosition(before) });
    expect(['p1', 'p2']).toContain(promptOf(w));
  });

  it('opens on the page of its game', async () => {
    const before = await doMount({ cards: cards(2), stages: ['recall'] });
    await doRecall(before, true);
    const left = promptOf(before);
    const after = await doMount({ cards: cards(2), stages: ['recall'], resumeAt: lastPosition(before), announce: true });
    expect(after.get('[data-testid="next-game"]').text()).toContain('Speaking');
    await doClick(after, 'start-game');
    expect(promptOf(after)).toBe(left);
  });

  it('steps back from its card to the page of its game', async () => {
    const before = await doMount({ cards: cards(2), stages: ['recall'] });
    await doRecall(before, true);
    const after = await doMount({ cards: cards(2), stages: ['recall'], resumeAt: lastPosition(before), announce: true });
    await doClick(after, 'start-game');
    await doClick(after, 'previous');
    ensureHas(after, 'next-game');
  });

  it('steps back from the first card to the page of its game', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recall'], announce: true });
    await doClick(w, 'start-game');
    await doClick(w, 'previous');
    ensureHas(w, 'next-game');
  });
});

describe('a change of game', () => {
  it('is announced with what to do in the next game', async () => {
    const w = await doMount({ cards: cards(1), stages: ['intro', 'recallNative'] });
    await doClick(w, 'next');
    expect(w.get('[data-testid="next-game"]').text()).toContain('Reading');
    expect(w.find('[data-testid="prompt"]').exists()).toBe(false);
  });

  it('tells how to put a card off in the first game that allows it', async () => {
    const w = await doMount({ cards: cards(1), stages: ['intro', 'recallNative', 'recall'] });
    await doClick(w, 'next');
    ensureHas(w, 'tip-later');
    ensureHas(w, 'tip-back');
    await doClick(w, 'start-game');
    await doRecall(w, true);
    ensureHas(w, 'tip-later', false);
  });

  it('tells that recording is optional before pronouncing', async () => {
    const w = await doMount({ cards: cards(1), stages: ['intro', 'pronounce'] });
    await doClick(w, 'next');
    ensureHas(w, 'tip-record');
  });

  it('starts the next game on Start', async () => {
    const w = await doMount({ cards: cards(1), stages: ['intro', 'recall'] });
    await doClick(w, 'next');
    await doClick(w, 'start-game');
    expect(w.get('[data-testid="stage"]').text()).toBe('Speaking · 2/2');
    expect(promptOf(w)).toBe('p0');
  });

  it('can be stepped back over to the last card', async () => {
    const w = await doMount({ cards: cards(1), stages: ['intro', 'recall'] });
    await doClick(w, 'next');
    await doClick(w, 'previous');
    expect(w.find('[data-testid="next-game"]').exists()).toBe(false);
    expect(w.get('[data-testid="stage"]').text()).toBe('Intro · 1/2');
  });

  it('is shown again on a step back from the first card of the game', async () => {
    const w = await doMount({ cards: cards(1), stages: ['intro', 'recall'] });
    await doClick(w, 'next');
    await doClick(w, 'start-game');
    await doClick(w, 'previous');
    expect(w.get('[data-testid="next-game"]').text()).toContain('Speaking');
    await doClick(w, 'previous');
    expect(w.get('[data-testid="stage"]').text()).toBe('Intro · 1/2');
  });
});

describe('a game per card', () => {
  it('asks each card in its own game and reports the answer under it', async () => {
    const w = await doMount({ cards: cards(1), stages: ['recall'], games: { c0: 'type' } });
    await doType(w, 'input', 'wrong');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'a0');
    await doClick(w, 'submit');
    await doClick(w, 'submit');
    expect(w.emitted('answer')).toEqual([['c0', 'type', false]]);
  });

  it('asks a card without its own game in the stage game', async () => {
    const w = await doMount({ cards: cards(1), stages: ['recall'], games: {} });
    await doRecall(w, true);
    expect(w.emitted('answer')).toEqual([['c0', 'recall', true]]);
  });

  it('takes the answer back under the card game on Back', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recall'], games: { c0: 'type', c1: 'type' } });
    await doType(w, 'input', answerFor(promptOf(w)));
    await doClick(w, 'submit');
    await doClick(w, 'previous');
    expect(w.emitted('undo')?.[0]?.[1]).toBe('type');
  });
});

describe('listening', () => {
  it('shows the transcription under the speaker', async () => {
    const w = await doMount({ cards: [{ ...cards(1)[0]!, tr: 'aa' }], stages: ['listen'] });
    expect(w.get('[data-testid="listen-transcription"]').text()).toBe('[aa]');
  });

  it('voices the Dutch side and hides its text until shown', async () => {
    vi.mocked(speak).mockClear();
    const w = await doMount({ cards: cards(1), stages: ['listen'] });
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
    expect(w.text()).not.toContain('a0');
  });

  it('lets the Dutch side be replayed', async () => {
    const w = await doMount({ cards: cards(1), stages: ['listen'] });
    vi.mocked(speak).mockClear();
    await doClick(w, 'play-card');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
  });

  it('shows both sides on reveal and reports the answer under listening', async () => {
    const w = await doMount({ cards: cards(1), stages: ['listen'] });
    await doRecall(w, true);
    expect(w.emitted('answer')).toEqual([['c0', 'listen', true]]);
  });

  it('shows the Dutch text once revealed', async () => {
    const w = await doMount({ cards: cards(1), stages: ['listen'] });
    await doClick(w, 'reveal');
    expect(w.text()).toContain('a0');
    expect(w.text()).toContain('p0');
  });

  it('keeps the next card hidden when continued', async () => {
    const before = await doMount({ cards: cards(2), stages: ['listen'] });
    await doRecall(before, true);
    const after = await doMount({ cards: cards(2), stages: ['listen'], resumeAt: lastPosition(before), announce: true });
    await doClick(after, 'start-game');
    ensureHas(after, 'reveal');
    ensureHas(after, 'listen-again');
  });

  it('waits for the learner, however long they listen', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(1), stages: ['listen'] });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(w.find('[data-testid="reveal"]').exists()).toBe(true);
    vi.useRealTimers();
  });

  it('asks a missed card again after four others, like any game', async () => {
    const w = await doMount({ cards: cards(12), stages: ['listen'], retryGap: 3 });
    await doClick(w, 'reveal');
    const missed = promptOf(w);
    await doClick(w, 'forgot');
    let distance = 0;
    for (;;) {
      await doClick(w, 'reveal');
      if (promptOf(w) === missed) break;
      distance++;
      await doClick(w, 'remembered');
    }
    expect(distance).toBe(4);
  });
});

describe('an affix', () => {
  const affix: StudyCard = { id: 'af', prompt: 'acting on someone', answer: 'be-', nl: 'bewonen', affix: { dutch: 'be-', tr: 'bu' }, promptExample: 'to inhabit', answerExample: 'bewonen', breakdown: 'be- (on) + wonen (to live)', tr: 'buvónun' };

  it('sits out listening', async () => {
    const w = await doMount({ cards: [affix, ...cards(1)], stages: ['listen'] });
    await doRecall(w, true);
    expect(w.emitted('answer')).toEqual([['c0', 'listen', true]]);
    expect(w.emitted('finished')).toBeTruthy();
  });

  it('sits out dictation', async () => {
    const w = await doMount({ cards: [affix], stages: ['intro', 'dictation'] });
    await doClick(w, 'next');
    expect(w.emitted('finished')).toBeTruthy();
  });

  it('is pronounced as itself, voiced by its example word', async () => {
    vi.mocked(speak).mockClear();
    const w = await doMount({ cards: [affix], stages: ['pronounce'] });
    expect(promptOf(w)).toBe('be-');
    await doClick(w, 'reveal');
    expect(w.get('[data-testid="answer"]').text()).toBe('acting on someone (affix)');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'bewonen' }));
  });

  it('is introduced by pronouncing itself', async () => {
    const w = await doMount({ cards: [affix], stages: ['pronounce', 'recall'], introducing: true });
    expect(promptOf(w)).toBe('acting on someone (affix)');
    expect(w.get('[data-testid="answer"]').text()).toBe('be-');
  });

  for (const introducing of [false, true]) {
    describe(introducing ? 'met by pronouncing' : 'pronounced', () => {
      it('shows its example word transcription, its own part marked', async () => {
        const w = await doMount({ cards: [affix], stages: ['pronounce'], introducing });
        await doClick(w, 'reveal');
        expect(w.get('[data-testid="transcription"]').text()).toBe('[buvónun]');
        expect(w.get('[data-testid="transcription"] [data-testid="affix-part"]').text()).toBe('bu');
      });

      it('sets its own transcription part in bold, as grey on grey does not show', async () => {
        const w = await doMount({ cards: [affix], stages: ['pronounce'], introducing });
        await doClick(w, 'reveal');
        expect(w.get('[data-testid="transcription"] [data-testid="affix-part"]').classes()).toContain('font-semibold');
      });

      it('marks itself in its example word', async () => {
        const w = await doMount({ cards: [affix], stages: ['pronounce'], introducing });
        await doClick(w, 'reveal');
        expect(w.get('[data-testid$="-example"] [data-testid="affix-part"]').text()).toBe('be');
      });

      it('shows the breakdown on the side of its meaning', async () => {
        const w = await doMount({ cards: [affix], stages: ['pronounce'], introducing });
        await doClick(w, 'reveal');
        const sides = w.findAll('[data-testid="prompt"], [data-testid="answer"], [data-testid="breakdown"]').map(e => e.text());
        const meaning = sides.indexOf('acting on someone (affix)');
        expect(sides.indexOf('be- (on) + wonen (to live)')).toBe(meaning + 1);
      });
    });
  }

  it('puts the breakdown, where the example comes from, above the example', async () => {
    const w = await doMount({ cards: [affix], stages: ['recall'] });
    await doClick(w, 'reveal');
    const context = w.get('[data-testid="breakdown"]').element.closest('[data-testid$="-context"]')!;
    expect([...context.querySelectorAll('[data-testid]')].map(e => e.getAttribute('data-testid'))[0]).toBe('breakdown');
  });

  it('takes the breakdown out of the layout while its Dutch side is hidden', async () => {
    const w = await doMount({ cards: [affix], stages: ['recall'] }, true);
    expect(w.get('[data-testid="breakdown"]').isVisible()).toBe(false);
    await doClick(w, 'reveal');
    expect(w.get('[data-testid="breakdown"]').isVisible()).toBe(true);
  });

  it('marks a suffix at the end of its example word', async () => {
    const suffix: StudyCard = { id: 'sf', prompt: 'like, -ly', answer: '-lijk', nl: 'vriendelijk', affix: { dutch: '-lijk', tr: 'luk' }, promptExample: 'friendly', answerExample: 'vriendelijk', tr: 'frínduluk' };
    const w = await doMount({ cards: [suffix], stages: ['pronounce'] });
    await doClick(w, 'reveal');
    expect(w.get('[data-testid$="-example"] [data-testid="affix-part"]').text()).toBe('lijk');
    expect(w.get('[data-testid="transcription"] [data-testid="affix-part"]').text()).toBe('luk');
  });

  it('marks a prefix after the article of its example noun', async () => {
    const prefix: StudyCard = { id: 'pf', prompt: 'in front', answer: 'voor-', nl: 'de voornaam', affix: { dutch: 'voor-', tr: 'fohr' }, promptExample: 'first name', answerExample: 'de voornaam', tr: 'duh fóhrnaam' };
    const w = await doMount({ cards: [prefix], stages: ['pronounce'] });
    await doClick(w, 'reveal');
    expect(w.get('[data-testid$="-example"]').text()).toBe('de voornaam');
    expect(w.get('[data-testid$="-example"] [data-testid="affix-part"]').text()).toBe('voor');
    expect(w.get('[data-testid="transcription"] [data-testid="affix-part"]').text()).toBe('fóhr');
  });
});

describe('dictation', () => {
  it('shows the transcription under the speaker', async () => {
    const w = await doMount({ cards: [{ ...cards(1)[0]!, tr: 'aa' }], stages: ['dictation'] });
    expect(w.get('[data-testid="listen-transcription"]').text()).toBe('[aa]');
  });

  it('voices the Dutch side and shows neither side until answered', async () => {
    vi.mocked(speak).mockClear();
    const w = await doMount({ cards: cards(1), stages: ['dictation'] });
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
    expect(w.text()).not.toContain('p0');
    expect(w.text()).not.toContain('a0');
  });

  it('does not voice the card again once answered', async () => {
    const w = await doMount({ cards: cards(1), stages: ['dictation'] });
    vi.mocked(speak).mockClear();
    await doType(w, 'input', 'a0');
    await doClick(w, 'submit');
    expect(w.get('[data-testid="answer"]').text()).toBe('a0');
    expect(vi.mocked(speak)).not.toHaveBeenCalled();
  });

  it('lets the Dutch side be replayed', async () => {
    const w = await doMount({ cards: cards(1), stages: ['dictation'] });
    vi.mocked(speak).mockClear();
    await doClick(w, 'listen-again');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
  });

  it('plays the card and its example while typing', async () => {
    const w = await doMount({ cards: [{ ...cards(1)[0]!, nlExample: 'ex0' }], stages: ['dictation'] });
    vi.mocked(speak).mockClear();
    await doClick(w, 'play-card');
    expect(vi.mocked(speak)).toHaveBeenCalledWith(expect.objectContaining({ nl: 'a0' }));
    await doClick(w, 'play-example');
    expect(vi.mocked(speakExample)).toHaveBeenCalledWith(expect.objectContaining({ nlExample: 'ex0' }));
  });

  it('takes the Dutch typed and reports it under dictation', async () => {
    const w = await doMount({ cards: cards(1), stages: ['dictation'] });
    await doType(w, 'input', 'a0');
    await doClick(w, 'submit');
    expect(w.get('[data-testid="prompt"]').text()).toBe('p0');
    expect(w.emitted('answer')).toEqual([['c0', 'dictation', true]]);
  });

  describe('a word that sounds the same', () => {
    const hart: StudyCard = { id: 'h', prompt: 'сердце', answer: 'het hart', nl: 'het hart' };

    it('counts as heard right, with the spelling pointed out', async () => {
      const w = await doMount({ cards: [hart], stages: ['dictation'] });
      await doType(w, 'input', 'het hard');
      expect(w.get('[data-testid="same-sound"]').text()).toBe('Sounds the same, spelled het hart');
      await doClick(w, 'submit');
      expect(w.emitted('answer')).toEqual([['h', 'dictation', true]]);
    });

    it('is a typing mistake outside dictation', async () => {
      const w = await doMount({ cards: [hart], stages: ['type'] });
      await doType(w, 'input', 'het hard');
      expect(w.find('[data-testid="same-sound"]').exists()).toBe(false);
      expect(w.find('[data-testid="try-again"]').exists()).toBe(true);
    });
  });
});

describe('recall timer', () => {
  it('runs down the whole width in ten seconds, then shows the answer', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(2), stages: ['recall'] });
    expect(timerWidth(w)).toBe(100);
    await vi.advanceTimersByTimeAsync(5000);
    expect(timerWidth(w)).toBeCloseTo(50, 0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(w.find('[data-testid="reveal"]').exists()).toBe(false);
    vi.useRealTimers();
  });

  it('runs as long as the settings say', async () => {
    useStore().updateSettings({ recallSeconds: 20 });
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(2), stages: ['recall'] });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(timerWidth(w)).toBeCloseTo(50, 0);
    vi.useRealTimers();
    useStore().updateSettings({ recallSeconds: 10 });
  });
});

describe('typing', () => {
  describe('a mistake', () => {
    it('shows no answer until asked', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'wrong');
      expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('lets the learner try again blind', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      const first = promptOf(w);
      await doType(w, 'input', 'wrong');
      await doClick(w, 'try-again');
      expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).not.toBeNull();
      await doType(w, 'input', 'wrong again');
      expect(w.find('[data-testid="try-again"]').exists()).toBe(true);
      await doClick(w, 'try-again');
      await doType(w, 'input', answerFor(first));
      expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).toBeNull();
      await doClick(w, 'submit');
      expect(promptOf(w)).not.toBe(first);
    });

    it('still counts as a miss after a right second try', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      const first = promptOf(w);
      await doType(w, 'input', 'wrong');
      await doClick(w, 'try-again');
      await doType(w, 'input', answerFor(first));
      await doClick(w, 'submit');
      expect(w.emitted<[string, string, boolean]>('answer')!.at(-1)).toEqual([expect.any(String), 'type', false]);
    });
  });

  describe('the typed text', () => {
    it('shows a miss on the answer card, with the answer still hidden', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'wrong');
      const typed = w.get('[data-testid="typed"]');
      expect(typed.text()).toBe('wrong__');
      expect(typed.element.closest('[data-testid="answer-card"]')).not.toBeNull();
      expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('stays above the shown answer for comparison', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'typo');
      await doClick(w, 'show-answer');
      expect(w.get('[data-testid="typed"]').text()).toBe(`typo${answerFor(promptOf(w))}`);
      expect(w.get('[data-testid="typed"]').element.closest('[data-testid="answer-card"]')).not.toBeNull();
      expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).toBeNull();
    });

    it('marks missing letters as gaps without giving them away', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', answerFor(promptOf(w)).slice(0, 1));
      const typed = w.get('[data-testid="typed"]');
      expect(typed.text()).toBe('a_');
      expect(typed.findAll('[data-kind="missing"]')).toHaveLength(1);
    });

    it('strikes a letter typed in place of another, then leaves a gap for the right one', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'x' + answerFor(promptOf(w)).slice(1));
      const typed = w.get('[data-testid="typed"]');
      expect(typed.text()).toBe('x_' + answerFor(promptOf(w)).slice(1));
      expect(typed.findAll('[data-kind="extra"]').map(l => l.text())).toEqual(['x']);
    });

    it('fills each gap with its right letter once the answer is shown', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      const answer = answerFor(promptOf(w));
      await doType(w, 'input', 'x' + answer.slice(1));
      await doClick(w, 'show-answer');
      const typed = w.get('[data-testid="typed"]');
      expect(typed.text()).toBe('x' + answer);
      expect(typed.findAll('[data-kind="missing"]').map(l => l.text())).toEqual([answer[0]]);
    });

    it('shows an extra space as a visible space mark, so its strike cannot pass for a hyphen', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      const answer = answerFor(promptOf(w));
      await doType(w, 'input', `${answer[0]} ${answer.slice(1)}`);
      expect(w.get('[data-testid="typed"]').findAll('[data-kind="extra"]').map(l => l.text())).toEqual(['␣']);
    });

    it('is not shown once the answer is right', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', answerFor(promptOf(w)));
      expect(w.find('[data-testid="typed"]').exists()).toBe(false);
    });
  });

  describe('the shown answer', () => {
    it('hides the field and offers a new try in place of Check', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'wrong');
      await doClick(w, 'show-answer');
      expect(w.find('[data-testid="input"]').exists()).toBe(false);
      expect(w.find('[data-testid="submit"]').exists()).toBe(false);
      ensureTryAgainOffered(w);
    });

    it('is hidden again for the new try', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'wrong');
      await doClick(w, 'show-answer');
      await doClick(w, 'try-again');
      expect(w.get('[data-testid="input"]').text()).toBe('');
      expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('turns green once retyped right', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      const first = promptOf(w);
      await doType(w, 'input', 'wrong');
      await doClick(w, 'show-answer');
      await doClick(w, 'try-again');
      await doType(w, 'input', answerFor(first));
      expect(w.get('[data-testid="answer"]').classes()).toContain('text-green-700');
    });

    it('stays orange after No idea', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doClick(w, 'unknown');
      expect(w.get('[data-testid="answer"]').classes()).toContain('text-orange-700');
    });

    it('is voiced again once retyped right', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      const first = promptOf(w);
      await doType(w, 'input', 'wrong');
      await doClick(w, 'show-answer');
      await doClick(w, 'try-again');
      vi.mocked(speak).mockClear();
      await doType(w, 'input', answerFor(first));
      expect(speak).toHaveBeenCalledWith(expect.objectContaining({ answer: answerFor(first) }));
    });
  });

  describe('a typo', () => {
    it('cannot be claimed before the answer is shown', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'typo');
      expect(w.find('[data-testid="accept"]').exists()).toBe(false);
    });

    it('can be counted as right after the answer is shown', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'typo');
      await doClick(w, 'show-answer');
      await doClick(w, 'accept');
      await doClick(w, 'submit');
      expect(w.emitted<[string, string, boolean]>('answer')!.at(-1)).toEqual([expect.any(String), 'type', true]);
    });

    it('cannot be claimed on a retry, which only copied the shown answer', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'typo');
      await doClick(w, 'show-answer');
      await doClick(w, 'try-again');
      await doType(w, 'input', 'typo again');
      await doClick(w, 'show-answer');
      expect(w.find('[data-testid="accept"]').exists()).toBe(false);
    });

    it('can be claimed on a retry typed before the answer was shown, keeping the first miss', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doType(w, 'input', 'wrong');
      await doClick(w, 'try-again');
      await doType(w, 'input', 'typo');
      await doClick(w, 'show-answer');
      await doClick(w, 'accept');
      await doClick(w, 'submit');
      expect(w.emitted<[string, string, boolean]>('answer')!.map(([, , ok]) => ok)).toEqual([false]);
    });

    it('cannot be claimed after No idea', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] });
      await doClick(w, 'unknown');
      expect(w.find('[data-testid="accept"]').exists()).toBe(false);
    });
  });

  describe('the keyboard', () => {
    it('stays up after Check', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] }, true);
      await doType(w, 'input', 'wrong');
      ensureEditableFocused();
      await doClick(w, 'show-answer');
      ensureEditableFocused();
    });

    it('stays up on the way to the next card', async () => {
      const w = await doMount({ cards: cards(3), stages: ['type'] }, true);
      await doType(w, 'input', answerFor(promptOf(w)));
      ensureEditableFocused();
      await doEnter();
      ensureEditableFocused();
      w.unmount();
    });

    it('stays up while an example plays', async () => {
      const w = await doMount({ cards: cards(2).map(c => ({ ...c, nlExample: 'ex' })), stages: ['type'] }, true);
      await doType(w, 'input', answerFor(promptOf(w)));
      await doPress(w, 'play-example');
      ensureEditableFocused();
      await doPress(w, 'play-card');
      ensureEditableFocused();
      w.unmount();
    });

    it('stays up on the way back', async () => {
      const w = await doMount({ cards: cards(3), stages: ['type'] }, true);
      await doType(w, 'input', answerFor(promptOf(w)));
      await doEnter();
      await doPress(w, 'previous');
      await nextTick();
      ensureEditableFocused();
      w.unmount();
    });

    it('stays up on a tap beside the buttons', async () => {
      const w = await doMount({ cards: cards(2), stages: ['type'] }, true);
      await doType(w, 'input', 'a');
      await doTapOn(w.get('[data-testid="stage"]').element as HTMLElement);
      ensureEditableFocused();
      w.unmount();
    });

    it('stays up on the way back under dictation', async () => {
      const w = await doMount({ cards: cards(3), stages: ['dictation'] }, true);
      await doType(w, 'input', 'a0');
      await doEnter();
      await doEnter();
      await doPress(w, 'previous');
      await nextTick();
      ensureEditableFocused();
      w.unmount();
    });
  });

  it('offers no autofill: the answer is typed into a text box, not a form field', async () => {
    const w = await doMount({ cards: cards(2), stages: ['type'] });
    expect(w.findAll('form, input').length).toBe(0);
    expect(w.get('[data-testid="input"]').attributes('role')).toBe('textbox');
  });

  it('turns off spell check, autocorrect and suggestions', async () => {
    const w = await doMount({ cards: cards(2), stages: ['type'] });
    expect(w.get('[data-testid="input"]').attributes()).toMatchObject({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off', autocomplete: 'off', writingsuggestions: 'false' });
  });

  it('accepts a different letter case by default', async () => {
    const w = await doMount({ cards: cards(2), stages: ['type'] });
    const first = promptOf(w);
    await doType(w, 'input', answerFor(first).toUpperCase());
    expect(w.find('[data-testid="try-again"]').exists()).toBe(false);
  });

  it('asks for the correct answer before moving on', async () => {
    const w = await doMount({ cards: cards(2), stages: ['type'] });
    const first = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'show-answer');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'still wrong');
    expect(promptOf(w)).toBe(first);
    ensureTryAgainOffered(w);
    await doClick(w, 'try-again');
    await doType(w, 'input', answerFor(first));
    await doClick(w, 'submit');
    await nextTick();
    expect(promptOf(w)).not.toBe(first);
  });

  it('repeats a mistyped card once four others have come between', async () => {
    const w = await doMount({ cards: cards(6), stages: ['type'] });
    const first = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'show-answer');
    await doClick(w, 'try-again');
    await doType(w, 'input', answerFor(first));
    await doClick(w, 'submit');
    await nextTick();
    for (let i = 0; i < 4; i++) {
      await doType(w, 'input', answerFor(promptOf(w)));
      await doClick(w, 'submit');
      await nextTick();
    }
    expect(promptOf(w)).toBe(first);
  });
});

describe('a missed card', () => {
  it('shows how many right answers it still needs', async () => {
    const w = await doMount({ cards: cards(20), stages: ['recall'], retryGap: 20 });
    const missed = promptOf(w);
    ensureHas(w, 'shows-left', false);
    await doRecall(w, false);
    const needed = ladder(20).length;
    await answerUntil(w, missed);
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${needed} left`);
    await doRecall(w, true);
    await answerUntil(w, missed);
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${needed - 1} left`);
  });
});

describe('typing again', () => {
  async function doFinishTyping(w: VueWrapper, prompt: string) {
    await doClick(w, 'try-again');
    await doType(w, 'input', answerFor(prompt));
    await doClick(w, 'submit');
  }
  const misses = (w: VueWrapper) => (w.emitted('answer') ?? []).filter(([, , ok]) => !ok).length;

  it('adds no miss before the answer was revealed', async () => {
    const w = await doMount({ cards: cards(3), stages: ['type'] });
    const prompt = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'wrong');
    await doFinishTyping(w, prompt);
    expect(misses(w)).toBe(1);
  });

  it('adds a miss when wrong after the answer was revealed', async () => {
    const w = await doMount({ cards: cards(3), stages: ['type'] });
    const prompt = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'show-answer');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'wrong');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'wrong');
    await doFinishTyping(w, prompt);
    expect(misses(w)).toBe(2);
  });
  it('takes the added miss back on Back', async () => {
    const w = await doMount({ cards: cards(3), stages: ['type'] });
    const prompt = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'show-answer');
    await doClick(w, 'try-again');
    await doType(w, 'input', 'wrong');
    await doFinishTyping(w, prompt);
    await doClick(w, 'previous');
    expect(w.emitted('undo')).toHaveLength(2);
  });
  it('climbs a ladder as long as the words the game asks, not the whole group', async () => {
    const passed = Object.fromEntries(cards(100).slice(6).map(c => [c.id, ['recall']]));
    const w = await doMount({ cards: cards(100), stages: ['recall'], passed });
    const missed = promptOf(w);
    await doRecall(w, false);
    await answerUntil(w, missed);
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(6).length} left`);
  });
});

describe('a fresh miss', () => {
  it('shows its progress while the right answer is out', async () => {
    const w = await doMount({ cards: cards(20), stages: ['choice'], retryGap: 20 });
    const prompt = promptOf(w);
    await doPick(w, w.findAll('[data-testid="option"]').map(o => o.text()).find(o => !o.startsWith(answerFor(prompt)))!);
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length} left`);
  });

  it('climbs a rung while a right answer is out', async () => {
    const w = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20 });
    const missed = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'try-again');
    await doType(w, 'input', answerFor(missed));
    await doClick(w, 'submit');
    while (promptOf(w) !== missed) {
      await doType(w, 'input', answerFor(promptOf(w)));
      await doClick(w, 'submit');
    }
    await doType(w, 'input', answerFor(missed));
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length - 1} left`);
  });

  it('keeps its progress over a reload', async () => {
    const before = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20 });
    const missed = promptOf(before);
    await doType(before, 'input', 'wrong');
    await doClick(before, 'try-again');
    await doType(before, 'input', answerFor(missed));
    await doClick(before, 'submit');
    const w = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20, resumeAt: lastPosition(before) });
    while (promptOf(w) !== missed) {
      await doType(w, 'input', answerFor(promptOf(w)));
      await doClick(w, 'submit');
    }
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length} left`);
  });

  it('keeps a climbed rung over a reload', async () => {
    const before = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20 });
    const missed = promptOf(before);
    await doType(before, 'input', 'wrong');
    await doClick(before, 'try-again');
    await doType(before, 'input', answerFor(missed));
    await doClick(before, 'submit');
    while (promptOf(before) !== missed) {
      await doType(before, 'input', answerFor(promptOf(before)));
      await doClick(before, 'submit');
    }
    await doType(before, 'input', answerFor(missed));
    await doClick(before, 'submit');
    const w = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20, resumeAt: lastPosition(before) });
    const seen: string[] = [];
    while (promptOf(w) !== missed) {
      seen.push(promptOf(w));
      await doType(w, 'input', answerFor(promptOf(w)));
      await doClick(w, 'submit');
    }
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length - 1} left`);
  });

  it('shows its empty ring when a reload lands on it', async () => {
    const before = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20 });
    const missed = promptOf(before);
    await doType(before, 'input', 'wrong');
    await doClick(before, 'try-again');
    await doType(before, 'input', answerFor(missed));
    await doClick(before, 'submit');
    while (promptOf(before) !== missed) {
      await doType(before, 'input', answerFor(promptOf(before)));
      await doClick(before, 'submit');
    }
    const w = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20, resumeAt: lastPosition(before) });
    expect(promptOf(w)).toBe(missed);
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length} left`);
  });

  it('shows its progress while a typed miss is out', async () => {
    const w = await doMount({ cards: cards(20), stages: ['type'], retryGap: 20 });
    await doType(w, 'input', 'wrong');
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length} left`);
  });
});

describe('a dictation miss', () => {
  const heard = () => (vi.mocked(speak).mock.calls.at(-1)![0] as { nl: string }).nl;
  async function doAnswer(w: VueWrapper, text: string) {
    await doType(w, 'input', text);
    await doClick(w, 'submit');
  }
  async function doAnswerUntil(w: VueWrapper, word: string) {
    while (heard() !== word) await doAnswer(w, heard());
  }

  it('keeps its climbed rungs over a reload', async () => {
    const before = await doMount({ cards: cards(60), stages: ['dictation'], retryGap: 20 });
    const missed = heard();
    await doType(before, 'input', 'wrong');
    await doClick(before, 'try-again');
    await doAnswer(before, missed);
    for (const _ of [1, 2]) {
      await doAnswerUntil(before, missed);
      await doAnswer(before, missed);
    }
    const w = await doMount({ cards: cards(60), stages: ['dictation'], retryGap: 20, resumeAt: lastPosition(before) });
    await doAnswerUntil(w, missed);
    expect(w.get('[data-testid="shows-left"]').attributes('aria-label')).toBe(`${ladder(20).length - 2} left`);
  });
});

describe('a missed card left alone', () => {
  async function missTheLast(w: VueWrapper) {
    for (let i = 0; i < 3; i++) await doRecall(w, true);
    const missed = promptOf(w);
    await doRecall(w, false);
    return missed;
  }

  it('ends the game unpassed and is carried to the next group', async () => {
    const w = await doMount({ cards: cards(4), stages: ['recall'], retryGap: 8 });
    const missed = await missTheLast(w);
    ensureEmitted(w, 'finished');
    expect(w.emitted('carried')).toEqual([[idOf(missed), 'recall']]);
    expect(w.emitted('passed')!.map(e => e[0])).not.toContain(idOf(missed));
  });

  it('colours the ring of a missed card by how well the card is known', async () => {
    const w = await doMount({ cards: cards(6), stages: ['recall'], retryGap: 4 });
    await doRecall(w, false);
    while (!w.find('[data-testid="shows-left"]').exists()) await doRecall(w, true);
    const hue = Number(/oklch\([^ ]+ [^ ]+ ([\d.]+)\)/.exec(w.get('[data-testid="shows-left"]').attributes('style') ?? '')?.[1]);
    expect(hue).toBeLessThan(40);
  });

});

describe('the known mark', () => {
  const hueOf = async (score: { right: number; wrong: number }) => {
    const w = await doMount({ cards: cards(1), stages: ['recall'], gameScores: { c0: { recall: score } } });
    return Number(/oklch\([^ ]+ [^ ]+ ([\d.]+)\)/.exec(w.get('[data-testid="known"]').attributes('style')!)![1]);
  };

  it('is absent on a card new to the game', async () => {
    const w = await doMount({ cards: cards(1), stages: ['recall'] });
    ensureHas(w, 'known', false);
  });

  it('goes from red for a card mostly missed to green for one mostly right', async () => {
    expect(await hueOf({ right: 0, wrong: 6 })).toBeLessThan(40);
    expect(await hueOf({ right: 6, wrong: 0 })).toBeGreaterThan(130);
  });

  it('turns red for a card missed once without fixes', async () => {
    expect(await hueOf({ right: 0, wrong: 1 })).toBeLessThan(40);
  });

  it('gives way to the ring once the card is missed', async () => {
    const w = await doMount({ cards: cards(6), stages: ['recall'], retryGap: 4, gameScores: Object.fromEntries(cards(6).map(c => [c.id, { recall: { right: 2, wrong: 0 } }])) });
    ensureHas(w, 'known');
    await doRecall(w, false);
    while (!w.find('[data-testid="shows-left"]').exists()) await doRecall(w, true);
    ensureHas(w, 'known', false);
  });
});

describe('a card put off', () => {
  it('comes back after the rest of the deck, ungraded', async () => {
    const w = await doMount({ cards: cards(4), stages: ['recall'] });
    const later = promptOf(w);
    await doClick(w, 'later');
    const pass: string[] = [];
    for (let i = 0; i < 3; i++) {
      pass.push(promptOf(w));
      await doRecall(w, true);
    }
    expect(pass).not.toContain(later);
    expect(promptOf(w)).toBe(later);
    expect(w.emitted('answer')?.map(([id]) => id)).not.toContain('c' + later.slice(1));
  });

  it('leaves no trace when put off after the answer is out', async () => {
    const w = await doMount({ cards: cards(3), stages: ['recall'] });
    await doClick(w, 'reveal');
    await doClick(w, 'later');
    expect(w.emitted('show')).toBeUndefined();
    expect(w.emitted('answer')).toBeUndefined();
  });

  it('counts as a first attempt when it comes back', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recall'] });
    const later = promptOf(w);
    await doClick(w, 'later');
    await doRecall(w, true);
    await doRecall(w, true);
    expect(w.emitted('answer')?.find(([id]) => id === 'c' + later.slice(1))?.[2]).toBe(true);
  });

  it('comes back to its place on Back', async () => {
    const w = await doMount({ cards: cards(4), stages: ['recall'] });
    await doRecall(w, true);
    const later = promptOf(w);
    await doClick(w, 'later');
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe(later);
  });

  it('comes back like any card after a miss, keeping its own spacing for next time', async () => {
    const GROUP = 20;
    const steps = ladder(GROUP);
    const within = (d: number, gap: number) => {
      expect(d).toBeGreaterThanOrEqual(gap);
      expect(d).toBeLessThanOrEqual(gap + Math.floor(gap / 4));
    };
    const w = await doMount({ cards: cards(60), stages: ['recall'], retryGap: GROUP, seed: 'put-off-miss' });
    const missed = promptOf(w);
    await doRecall(w, false);
    within(await answerUntil(w, missed), steps[0]!);
    await doRecall(w, true);
    within(await answerUntil(w, missed), steps[1]!);
    await doClick(w, 'later');
    within(await answerUntil(w, missed), steps[0]!);
    await doRecall(w, true);
    within(await answerUntil(w, missed), steps[2]!);
  });

  it('comes back without the ring of a missed card when never missed', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recall'] });
    const later = promptOf(w);
    await doClick(w, 'later');
    await doRecall(w, true);
    expect(promptOf(w)).toBe(later);
    ensureHas(w, 'shows-left', false);
    await doRecall(w, true);
    expect(w.emitted('finished')).toHaveLength(1);
  });

  it('cannot be put off on the intro', async () => {
    const w = await doMount({ cards: cards(3), stages: ['intro'] });
    expect(w.find('[data-testid="later"]').exists()).toBe(false);
  });

  it('cannot be put off when it is the last one', async () => {
    const w = await doMount({ cards: cards(1), stages: ['recall'] });
    expect(w.find('[data-testid="later"]').exists()).toBe(false);
  });
});

describe('back', () => {
  it('is disabled on the first card', async () => {
    const w = await doMount({ cards: cards(3), stages: ['intro'] });
    expect(w.get('[data-testid="previous"]').attributes('disabled')).toBeDefined();
  });

  it('returns to the previous card and takes its right answer back', async () => {
    const w = await doMount({ cards: cards(3), stages: ['recall'] });
    const first = promptOf(w);
    await doRecall(w, true);
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe(first);
    expect(w.emitted('undo')).toEqual([['c' + first.slice(1), 'recall']]);
  });

  it('takes a wrong answer back too, to be given again', async () => {
    const w = await doMount({ cards: cards(3), stages: ['type'] });
    const first = promptOf(w);
    await doType(w, 'input', 'wrong');
    await doClick(w, 'try-again');
    await doType(w, 'input', answerFor(first));
    await doClick(w, 'submit');
    await doClick(w, 'submit');
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe(first);
    await doClick(w, 'submit');
    expect(w.emitted('undo')).toEqual([['c' + first.slice(1), 'type']]);
    expect(w.emitted('answer')).toEqual([['c' + first.slice(1), 'type', false], ['c' + first.slice(1), 'type', false]]);
  });

  it('brings a typed card back as it was left, answer shown', async () => {
    const w = await doMount({ cards: cards(3), stages: ['type'] });
    await doType(w, 'input', 'typo');
    await doClick(w, 'show-answer');
    await doClick(w, 'try-again');
    await doType(w, 'input', answerFor(promptOf(w)));
    await doClick(w, 'submit');
    await doClick(w, 'submit');
    await doClick(w, 'previous');
    expect(w.find('[data-testid="input"]').exists()).toBe(false);
    expect(w.get('[data-testid="answer"]').element.closest('[aria-hidden="true"]')).toBeNull();
    expect(w.get('[data-testid="submit"]').text()).toBe('Next');
  });

  it('then forward again lands on the same next card', async () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const w = await doMount({ cards: cards(8), stages: ['recall'], seed });
      await doRecall(w, true);
      const next = promptOf(w);
      await doClick(w, 'previous');
      await doClick(w, 'remembered');
      expect(promptOf(w), seed).toBe(next);
    }
  });

  it('brings a recalled card back revealed, to grade again', async () => {
    const w = await doMount({ cards: cards(3), stages: ['recall'] });
    const first = promptOf(w);
    await doRecall(w, false);
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe(first);
    expect(w.find('[data-testid="reveal"]').exists()).toBe(false);
    await doClick(w, 'remembered');
    expect(w.emitted('undo')).toEqual([['c' + first.slice(1), 'recall']]);
    expect(w.emitted('answer')).toEqual([['c' + first.slice(1), 'recall', false], ['c' + first.slice(1), 'recall', true]]);
  });
});

describe('resume', () => {
  it('continues at the exact card, without the ones already done', async () => {
    const deck = cards(5);
    const before = await doMount({ cards: deck, stages: ['recall', 'type'] });
    const done = [promptOf(before)];
    await doRecall(before, true);
    done.push(promptOf(before));
    await doRecall(before, true);
    const at = before.emitted<[unknown]>('position')!.at(-1)![0];
    const next = promptOf(before);

    const after = await doMount({ cards: deck, stages: ['recall', 'type'], resumeAt: at });
    expect(promptOf(after)).toBe(next);
    const rest: string[] = [];
    for (let i = 0; i < 3; i++) {
      rest.push(promptOf(after));
      await doRecall(after, true);
    }
    expect(rest).not.toContain(done[0]);
    expect(rest).not.toContain(done[1]);
    expect(after.get('[data-testid="stage"]').text()).toContain('Writing');
  });
});

describe('resume of a card in progress', () => {
  it('keeps a recall answer shown', async () => {
    const deck = cards(3);
    const before = await doMount({ cards: deck, stages: ['recall'] });
    await doClick(before, 'reveal');
    const after = await doMount({ cards: deck, stages: ['recall'], resumeAt: lastPosition(before) });
    expect(after.find('[data-testid="remembered"]').exists()).toBe(true);
  });

  it('keeps a recall that ran out of time', async () => {
    vi.useFakeTimers();
    const deck = cards(3);
    const before = await doMount({ cards: deck, stages: ['recall'] });
    await vi.advanceTimersByTimeAsync(10_000);
    vi.useRealTimers();
    const after = await doMount({ cards: deck, stages: ['recall'], resumeAt: lastPosition(before) });
    expect(after.find('[data-testid="next"]').exists()).toBe(true);
    expect(after.find('[data-testid="remembered"]').exists()).toBe(false);
  });

  it('keeps a wrong choice waiting for Next', async () => {
    const deck = cards(8);
    const before = await doMount({ cards: deck, stages: ['choice'] });
    const wrong = before.findAll('[data-testid="option"]').map(o => o.text()).find(o => !o.startsWith(answerFor(promptOf(before))))!;
    await doPick(before, wrong);
    const after = await doMount({ cards: deck, stages: ['choice'], resumeAt: lastPosition(before) });
    expect(after.get('[data-testid="next"]').classes()).not.toContain('invisible');
  });

  it('keeps a typing mistake waiting for the retype', async () => {
    const deck = cards(3);
    const before = await doMount({ cards: deck, stages: ['type'] });
    await doType(before, 'input', 'wrong');
    const after = await doMount({ cards: deck, stages: ['type'], resumeAt: lastPosition(before) });
    expect(after.find('[data-testid="try-again"]').exists()).toBe(true);
  });

  it('turns a retype saved by an older version into a new try', async () => {
    const deck = cards(3);
    const before = await doMount({ cards: deck, stages: ['type'] });
    const at = lastPosition(before) as { queue: Array<{ state?: unknown }> };
    at.queue[0]!.state = { input: 'wrong', verdict: false, phase: 'fixing' };
    const after = await doMount({ cards: deck, stages: ['type'], resumeAt: at });
    ensureTryAgainOffered(after);
  });

  it('can still step back to the card before', async () => {
    const deck = cards(3);
    const before = await doMount({ cards: deck, stages: ['recall'] });
    const first = promptOf(before);
    await doRecall(before, true);
    const after = await doMount({ cards: deck, stages: ['recall'], resumeAt: lastPosition(before) });
    await doClick(after, 'previous');
    expect(promptOf(after)).toBe(first);
  });
});

describe('resume in matching', () => {
  it('shows only the pairs that were left', async () => {
    const deck = cards(5);
    const before = await doMount({ cards: deck, stages: ['match'] });
    for (const id of ['c0', 'c1', 'c2', 'c3']) await doMatch(before, id);
    const at = before.emitted<[unknown]>('position')!.at(-1)![0];

    const after = await doMount({ cards: deck, stages: ['match'], resumeAt: at });
    expect(visiblePairs(after)).toEqual(['p4']);
  });

  it('keeps the mistakes made before the reload', async () => {
    const deck = cards(5);
    const before = await doMount({ cards: deck, stages: ['match'] });
    await doMismatch(before, 'c0', 'c1');
    for (const id of ['c0', 'c1', 'c2', 'c3']) await doMatch(before, id);
    const at = before.emitted<[unknown]>('position')!.at(-1)![0];

    const after = await doMount({ cards: deck, stages: ['match'], resumeAt: at });
    await doMatch(after, 'c4');
    await vi.waitFor(() => expect(after.emitted('answer')).toBeDefined());
    expect(after.emitted('answer')).toContainEqual(['c0', 'match', false]);
  });
});

describe('back after a reload', () => {
  it('reaches the very first card', async () => {
    const before = await doMount({ cards: cards(40), stages: ['recall'] });
    const first = promptOf(before);
    for (let i = 0; i < 35; i++) await doRecall(before, true);
    const at = before.emitted<[unknown]>('position')!.at(-1)![0];

    const after = await doMount({ cards: cards(40), stages: ['recall'], resumeAt: at });
    for (let i = 0; i < 35; i++) await doClick(after, 'previous');
    expect(promptOf(after)).toBe(first);
    expect(after.get('[data-testid="previous"]').attributes('disabled')).toBeDefined();
  });
});

describe('after matching', () => {
  it('matches the mismatched cards again after the other rounds', async () => {
    const w = await doMount({ cards: cards(10), stages: ['match', 'recall'] });
    await vi.waitFor(() => expect(visiblePairs(w)).toHaveLength(5));
    const [left, right] = visiblePairs(w);
    await doMismatch(w, 'c' + left!.slice(1), 'c' + right!.slice(1));
    for (const p of visiblePairs(w)) await doMatch(w, 'c' + p.slice(1));
    await vi.waitFor(() => expect(visiblePairs(w)).toHaveLength(5));
    const second = visiblePairs(w);
    expect(second).not.toContain(left);
    for (const p of second) await doMatch(w, 'c' + p.slice(1));
    await vi.waitFor(() => expect(visiblePairs(w).length).toBeGreaterThan(0));
    expect(visiblePairs(w)).toContain(left);
  });

  it('starts the next stage with a card matched long ago, not the last round', async () => {
    const deck = cards(10);
    for (let run = 0; run < 15; run++) {
      const w = await doMount({ cards: deck, stages: ['match', 'recall'], seed: `s${run}` });
      const lastRound: string[] = [];
      for (let round = 0; round < 2; round++) {
        // 15 sessions in one test: a loaded machine needs more than the default second per round.
        await vi.waitFor(() => expect(visiblePairs(w)).toHaveLength(5), { timeout: 5000 });
        const pairs = visiblePairs(w);
        if (round === 1) lastRound.push(...pairs);
        for (const p of pairs) await doMatch(w, 'c' + p.slice(1));
      }
      await doStartNextGame(w);
      expect(lastRound).not.toContain(promptOf(w));
    }
  }, 60_000);
});

describe('saved position', () => {
  it('keeps back history that grows with the steps taken, not with the deck size', async () => {
    const sizeAfter = async (deck: number) => {
      let last = '';
      const w = await doMount({ cards: cards(deck), stages: ['recall'], onPosition: (p: unknown) => (last = JSON.stringify((p as { history: unknown }).history)) });
      for (let i = 0; i < 20; i++) await doRecall(w, true);
      return last.length;
    };
    const [small, big] = [await sizeAfter(25), await sizeAfter(250)];
    expect(big).toBeLessThan(small * 2);
  });

  it('still steps back from a position saved with whole queues', async () => {
    const at = {
      stage: 0,
      queue: [{ match: false, ids: ['c1'] }, { match: false, ids: ['c2'] }],
      size: 3,
      reported: ['c0'],
      history: [{ stage: 0, queue: [{ match: false, ids: ['c0'] }, { match: false, ids: ['c1'] }, { match: false, ids: ['c2'] }], size: 3, reported: [], answers: ['c0'] }],
    };
    const w = await doMount({ cards: cards(3), stages: ['recall'], resumeAt: at });
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe('p0');
  });
});

describe('back into matching', () => {
  it('lays the round out afresh', async () => {
    const deck = cards(5);
    const w = await doMount({ cards: deck, stages: ['match', 'recall'] });
    for (const id of ['c0', 'c1', 'c2', 'c3', 'c4']) await doMatch(w, id);
    await doStartNextGame(w);
    await doClick(w, 'previous');
    await doClick(w, 'previous');
    expect(visiblePairs(w)).toHaveLength(5);
  });

  it('lays the round out afresh after a reload', async () => {
    const deck = cards(5);
    const before = await doMount({ cards: deck, stages: ['match', 'recall'] });
    for (const id of ['c0', 'c1', 'c2', 'c3', 'c4']) await doMatch(before, id);
    await doStartNextGame(before);
    const at = before.emitted<[unknown]>('position')!.at(-1)![0];

    const after = await doMount({ cards: deck, stages: ['match', 'recall'], resumeAt: at });
    await doClick(after, 'previous');
    await doClick(after, 'previous');
    expect(visiblePairs(after)).toHaveLength(5);
  });
});

describe('a step', () => {
  it('looks for an update', async () => {
    const w = await doMount({ cards: cards(3), stages: ['recall'] });
    // The app's router also notes each navigation, the test router's own included.
    vi.mocked(noteStep).mockClear();
    await doRecall(w, true);
    expect(noteStep).toHaveBeenCalledOnce();
  });
});

describe('layout', () => {
  it('keeps match tiles sized for five pairs when fewer are left', async () => {
    const w = await doMount({ cards: cards(2), stages: ['match'] });
    expect(w.get('[data-testid="match-grid"]').attributes('style')).toContain('repeat(5, minmax(0, 1fr))');
  });

  it('keeps choice options sized for five when fewer are offered', async () => {
    const w = await doMount({ cards: cards(2), stages: ['choice'] });
    expect(w.findAll('[data-testid="option"]')).toHaveLength(2);
    expect(w.get('[data-testid="choice-grid"]').attributes('style')).toContain('repeat(5, minmax(0, 1fr))');
  });

  it('lets the prompt tile grow with its content, never below an option', async () => {
    const w = await doMount({ cards: cards(6), stages: ['choice'] });
    expect(w.get('[data-testid="choice-grid"]').attributes('style')).toContain('grid-template-rows: minmax(calc((100% - 2.5rem) / 6), auto) repeat(5, minmax(0, 1fr))');
  });
});

describe('seed', () => {
  async function playChoice(seed: string) {
    const w = await doMount({ cards: cards(10), stages: ['choice'], seed });
    const seen: string[][] = [];
    for (let i = 0; i < 4; i++) {
      seen.push([promptOf(w), ...w.findAll('[data-testid="option"]').map(o => o.text())]);
      await doPick(w, answerFor(promptOf(w)));
      await doClick(w, 'next');
    }
    return seen;
  }

  function matchLayout(w: VueWrapper) {
    return ['left', 'right'].map(side => w.findAll(`[data-testid="match-${side}"]`).map(t => t.text()));
  }

  it('repeats the order and options for the same seed', async () => {
    expect(await playChoice('s1')).toEqual(await playChoice('s1'));
  });

  it('changes them for another seed', async () => {
    expect(await playChoice('s1')).not.toEqual(await playChoice('s2'));
  });

  it('repeats a matching layout for the same seed', async () => {
    const layout = async (seed: string) => matchLayout(await doMount({ cards: cards(10), stages: ['match'], seed }));
    expect(await layout('m1')).toEqual(await layout('m1'));
    expect(await layout('m1')).not.toEqual(await layout('m2'));
  });
});

describe('review', () => {
  const GAP = 4;
  /** Group size: the ladder runs 4, 7, 12, 20. */
  const GROUP = 20;
  const STEP = 4;

  it('starts with the cards missed before', async () => {
    const w = await doMount({ cards: cards(8), stages: ['recall'], retryGap: GAP, scores: { c6: { right: 1, wrong: 1 }, c7: { right: 0, wrong: 3 }, c5: { right: 3, wrong: 0 } } });
    const firstTwo = [promptOf(w)];
    await doRecall(w, true);
    firstTwo.push(promptOf(w));
    expect(firstTwo.sort()).toEqual(['p6', 'p7']);
  });

  it('shows progress as the share of its cards done, held still by a miss', async () => {
    const w = await doMount({ cards: cards(4), stages: ['recall'], retryGap: GAP });
    await doRecall(w, true);
    expect(progressOf(w)).toBe(25);
    await doRecall(w, false);
    expect(progressOf(w)).toBe(25);
  });

  it('brings a miss back after four cards', async () => {
    for (let run = 0; run < 10; run++) {
      const w = await doMount({ cards: cards(12), stages: ['recall'], retryGap: GROUP, seed: `gap${run}` });
      const missed = promptOf(w);
      await doRecall(w, false);
      expect(await answerUntil(w, missed)).toBe(STEP);
    }
  });

  it('counts only cards shown, not passed ones going by, toward the gap', async () => {
    const all = cards(24);
    const passed = Object.fromEntries(all.filter((_, i) => i % 2).map(c => [c.id, ['recall']]));
    for (let run = 0; run < 10; run++) {
      const w = await doMount({ cards: all, stages: ['recall'], retryGap: GROUP, passed, seed: `passing${run}` });
      const missed = promptOf(w);
      await doRecall(w, false);
      expect(await answerUntil(w, missed)).toBe(STEP);
    }
  });

  it('brings a miss back further up the ladder after each right answer', async () => {
    const steps = ladder(GROUP);
    const w = await doMount({ cards: cards(60), stages: ['recall'], retryGap: GROUP, seed: 'widening' });
    const missed = promptOf(w);
    await doRecall(w, false);
    const distances: number[] = [];
    for (let i = 0; i < 4; i++) {
      distances.push(await answerUntil(w, missed));
      await doRecall(w, true);
    }
    distances.forEach((d, i) => {
      expect(d).toBeGreaterThanOrEqual(steps[i]!);
      expect(d).toBeLessThanOrEqual(steps[i]! + Math.floor(steps[i]! / 4));
    });
  });

  it('brings a slow right answer back like a guess, ungraded but logged as right', async () => {
    const w = await doMount({ cards: cards(60), stages: ['recall'], retryGap: GROUP, isSlow: () => true });
    const slow = promptOf(w);
    await doRecall(w, true);
    expect(w.emitted('answer')).toBeUndefined();
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'plus' });
    expect(await answerUntil(w, slow)).toBe(STEP);
  });

  it('passes an intro card however long it was looked at', async () => {
    const w = await doMount({ cards: cards(3), stages: ['intro'], isSlow: () => true });
    for (let i = 0; i < 3; i++) await doClick(w, 'next');
    expect(w.emitted('passed')?.map(([id]) => id)).toEqual(['c0', 'c1', 'c2']);
  });

  it('times a recall to the reveal, so reading the answer long does not make it slow', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(60), stages: ['recall'], retryGap: GROUP, isSlow: (_, ms) => ms > 3000 });
    const missed = promptOf(w);
    await doRecall(w, false);
    await answerUntil(w, missed);
    await doClick(w, 'reveal');
    await vi.advanceTimersByTimeAsync(10_000);
    await doClick(w, 'remembered');
    expect(await answerUntil(w, missed)).toBeGreaterThan(STEP);
    vi.useRealTimers();
  });

  it('times a typed answer to its check, so reading the result long does not make it slow', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(2), stages: ['type'] });
    await doType(w, 'input', answerFor(promptOf(w)));
    await vi.advanceTimersByTimeAsync(10_000);
    await doClick(w, 'submit');
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'plus', ms: 0 });
    vi.useRealTimers();
  });

  it('stops the clock while a sheet on a linked word is open', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(2), stages: ['type'] });
    const sheet = useCardSheet();
    sheet.open('c1');
    await vi.advanceTimersByTimeAsync(10_000);
    sheet.close();
    await doType(w, 'input', answerFor(promptOf(w)));
    await doClick(w, 'submit');
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'plus', ms: 0 });
    vi.useRealTimers();
  });

  it('times a choice to the pick, not to the move on', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(5), stages: ['choice'] });
    await doPick(w, answerFor(promptOf(w)));
    await vi.advanceTimersByTimeAsync(500);
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'plus', ms: 0 });
    vi.useRealTimers();
  });

  it('carries a miss left only waiting to the next group, unpassed, instead of filling its wait', async () => {
    const w = await doMount({ cards: cards(2), stages: ['recall'], retryGap: 100 });
    await doRecall(w, true);
    const missed = promptOf(w);
    await doRecall(w, false);
    ensureEmitted(w, 'finished');
    expect(w.emitted('carried')).toEqual([[idOf(missed), 'recall']]);
    expect(w.emitted('passed')!.map(e => e[0])).not.toContain(idOf(missed));
  });

  it('spaces a late miss only between the cards still new, then carries it', async () => {
    const w = await doMount({ cards: cards(6), stages: ['recall'], retryGap: 100, seed: 'late' });
    const missed = promptOf(w);
    await doRecall(w, false);
    let shows = 0;
    while (!w.emitted('finished')) {
      shows++;
      await doRecall(w, true);
    }
    // Five new cards plus the climbs that fit between them.
    expect(shows).toBeLessThanOrEqual(5 + 3);
    expect(w.emitted('carried')?.map(e => e[0]) ?? []).toContain(idOf(missed));
  });

  it('lets a miss go once it climbs past the top of the ladder', async () => {
    const w = await doMount({ cards: cards(60), stages: ['recall'], retryGap: GROUP });
    const missed = promptOf(w);
    await doRecall(w, false);
    expect(await timesShown(w, missed)).toBe(ladder(GROUP).length);
  });

  it('starts the ladder over on another miss', async () => {
    const w = await doMount({ cards: cards(200), stages: ['recall'], retryGap: GROUP });
    const missed = promptOf(w);
    await doRecall(w, false);
    await answerUntil(w, missed);
    await doRecall(w, true);
    await answerUntil(w, missed);
    await doRecall(w, false);
    expect(await timesShown(w, missed)).toBe(ladder(GROUP).length);
  });
});

describe('a shown card', () => {
  it('is reported with its answer, time and rung', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(8), stages: ['recall'], retryGap: 8 });
    const first = promptOf(w);
    await vi.advanceTimersByTimeAsync(1500);
    await doRecall(w, false);
    expect(w.emitted('show')![0]![0]).toMatchObject({ id: 'c' + first.slice(1), game: 'recall', answer: 'minus', rung: -1, source: 'new' });
    expect((w.emitted('show')![0]![0] as { ms: number }).ms).toBeGreaterThanOrEqual(1500);
    await answerUntil(w, first);
    await doRecall(w, true);
    expect(w.emitted('show')!.at(-1)![0]).toMatchObject({ answer: 'plus', rung: 0, source: 'ladder' });
    vi.useRealTimers();
  });

  it('is timed without the typing in dictation, so a long word is not slower', async () => {
    vi.useFakeTimers();
    const long = cards(8).map(c => ({ ...c, answer: c.answer + 'lang woord', nl: c.nl + 'lang woord' }));
    const w = await doMount({ cards: long, stages: ['dictation'], retryGap: 8 });
    const answer = (vi.mocked(speak).mock.calls.at(-1)![0] as { nl: string }).nl;
    await vi.advanceTimersByTimeAsync(2000);
    const field = w.get('[data-testid="input"]');
    for (const at of answer.split('').keys()) {
      field.element.textContent = answer.slice(0, at + 1);
      await field.trigger('input');
      await vi.advanceTimersByTimeAsync(300);
    }
    await doType(w, 'input', answer);
    await doClick(w, 'submit');
    const ms = (w.emitted('show')![0]![0] as { ms: number }).ms;
    expect(ms).toBeGreaterThanOrEqual(2000);
    expect(ms).toBeLessThan(2000 + 300 * 3);
    vi.useRealTimers();
  });

  it('starts over on a replay in dictation, as a replay means the word was not caught', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(8), stages: ['dictation'], retryGap: 8 });
    const answer = (vi.mocked(speak).mock.calls.at(-1)![0] as { nl: string }).nl;
    await vi.advanceTimersByTimeAsync(3000);
    const field = w.get('[data-testid="input"]');
    for (const at of [0, 1, 2]) {
      field.element.textContent = answer.slice(0, at + 1);
      await field.trigger('input');
      await vi.advanceTimersByTimeAsync(300);
    }
    await vi.advanceTimersByTimeAsync(5000);
    await doClick(w, 'listen-again');
    await vi.advanceTimersByTimeAsync(2000);
    await doType(w, 'input', answer);
    await doClick(w, 'submit');
    const ms = (w.emitted('show')![0]![0] as { ms: number }).ms;
    expect(ms).toBeGreaterThanOrEqual(2000);
    expect(ms).toBeLessThan(2900);
    vi.useRealTimers();
  });

  it('counts a pause after the start of a word as thinking, slow keys of a slow typist as typing', async () => {
    vi.useFakeTimers();
    const long = cards(8).map(c => ({ ...c, answer: c.answer + 'lang woord', nl: c.nl + 'lang woord' }));
    const w = await doMount({ cards: long, stages: ['dictation'], retryGap: 8 });
    const answer = (vi.mocked(speak).mock.calls.at(-1)![0] as { nl: string }).nl;
    const field = w.get('[data-testid="input"]');
    for (const at of answer.split('').keys()) {
      field.element.textContent = answer.slice(0, at + 1);
      await field.trigger('input');
      // A slow typist: 700 ms a key, 1400 ms on every fifth, but 5 s of thinking after the third.
      await vi.advanceTimersByTimeAsync(at === 2 ? 5000 : at % 5 === 4 ? 1400 : 700);
    }
    await doType(w, 'input', answer);
    await doClick(w, 'submit');
    const ms = (w.emitted('show')![0]![0] as { ms: number }).ms;
    // The thinking, plus the look over the typed word before Check, plus a slow key before the pace is known.
    expect(ms).toBeGreaterThanOrEqual(5000 - 700);
    expect(ms).toBeLessThan(5000 + 1400 + 1400);
    vi.useRealTimers();
  });

  it('is taken back on Back', async () => {
    const w = await doMount({ cards: cards(4), stages: ['recall'] });
    await doRecall(w, true);
    await doClick(w, 'previous');
    expect(w.emitted('unshow')).toHaveLength(1);
  });
});

describe('a guess', () => {
  it('is not offered before the answer shows, so it holds no empty place', async () => {
    const w = await doMount({ cards: cards(4), stages: ['recall'] });
    expect(w.find('[data-testid="guessed"]').exists()).toBe(false);
  });

  it('comes back like a miss in recall, logged as a guess, graded neither way', async () => {
    const w = await doMount({ cards: cards(8), stages: ['recall'], retryGap: 8 });
    const guessed = promptOf(w);
    await doClick(w, 'reveal');
    await doClick(w, 'guessed');
    expect(w.emitted('answer')).toBeUndefined();
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'guessed' });
    expect(await answerUntil(w, guessed)).toBe(4);
  });

  it('leaves the card ungraded when it comes back and is recalled', async () => {
    const w = await doMount({ cards: cards(8), stages: ['recall'], retryGap: 8 });
    const guessed = promptOf(w);
    await doClick(w, 'reveal');
    await doClick(w, 'guessed');
    await answerUntil(w, guessed);
    await doRecall(w, true);
    expect(w.emitted('answer')!.map(a => a[0])).not.toContain('c' + guessed.slice(1));
  });

  it('is taken back by stepping back, so the card is graded on its next answer', async () => {
    const w = await doMount({ cards: cards(8), stages: ['recall'], retryGap: 8 });
    const guessed = promptOf(w);
    await doClick(w, 'reveal');
    await doClick(w, 'guessed');
    await doClick(w, 'previous');
    expect(promptOf(w)).toBe(guessed);
    await doClick(w, 'remembered');
    expect(w.emitted('undo')).toBeUndefined();
    expect(w.emitted('answer')).toEqual([['c' + guessed.slice(1), 'recall', true]]);
  });

  it('is claimed after a right answer in typing', async () => {
    const w = await doMount({ cards: cards(8), stages: ['type'], retryGap: 8 });
    const guessed = promptOf(w);
    await doType(w, 'input', answerFor(guessed));
    await doClick(w, 'guessed');
    expect(w.emitted('answer')).toBeUndefined();
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'guessed' });
  });

  it('cannot be claimed in typing before the answer is right', async () => {
    const w = await doMount({ cards: cards(8), stages: ['type'], retryGap: 8 });
    expect(w.find('[data-testid="guessed"]').exists()).toBe(false);
  });

  it('is announced before the pick in choice', async () => {
    vi.useFakeTimers();
    const w = await doMount({ cards: cards(8), stages: ['choice'], retryGap: 8 });
    const guessed = promptOf(w);
    await doClick(w, 'guessing');
    await doPick(w, answerFor(guessed));
    await vi.advanceTimersByTimeAsync(500);
    expect(w.emitted('show')![0]![0]).toMatchObject({ answer: 'guessed' });
    vi.useRealTimers();
  });
});

/** Answers every other card right until `prompt` shows; how many were answered. */
async function answerUntil(w: VueWrapper, prompt: string) {
  let distance = 0;
  while (promptOf(w) !== prompt) {
    distance++;
    await doRecall(w, true);
  }
  return distance;
}

/** Answers everything right to the end; how many times `prompt` showed. */
async function timesShown(w: VueWrapper, prompt: string) {
  let shown = 0;
  while (!w.emitted('finished')) {
    if (promptOf(w) === prompt) shown++;
    await doRecall(w, true);
  }
  return shown;
}

// declarative helpers

let played: string[] = [];
let ended: Array<() => void> = [];

/** A browser with a microphone: what is recorded plays back from `blob:mine`. */
function givenRecorder() {
  played = [];
  ended = [];
  class FakeRecorder {
    ondataavailable?: (e: { data: Blob }) => void;
    onstop?: () => void;
    start() {}
    stop() {
      this.ondataavailable?.({ data: new Blob(['x']) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder);
  vi.stubGlobal('navigator', { ...navigator, mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
  const revoked = new Set<string>();
  Object.assign(URL, { createObjectURL: () => (revoked.delete('blob:mine'), 'blob:mine'), revokeObjectURL: (url: string) => revoked.add(url) });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    if (revoked.has(this.src)) return Promise.reject(new DOMException('revoked', 'NotSupportedError'));
    played.push(this.src);
    ended.push(() => this.onended?.(new Event('ended')));
    return Promise.resolve();
  });

}

async function doStartNextGame(w: VueWrapper) {
  await vi.waitFor(() => expect(w.find('[data-testid="next-game"]').exists()).toBe(true), { timeout: 5000 });
  await doClick(w, 'start-game');
}

function progressOf(w: VueWrapper) {
  return Number(w.get('[role="progressbar"]').attributes('aria-valuenow'));
}

function ensureTryAgainOffered(w: VueWrapper) {
  expect(w.find('[data-testid="try-again"]').exists()).toBe(true);
}

async function doMount(props: { cards: StudyCard[]; stages: string[]; retryGap?: number; resumeAt?: unknown; pool?: StudyCard[]; known?: string[]; seed?: string; scores?: Record<string, Score>; gameScores?: Record<string, GameScores>; games?: Record<string, string>; passed?: Record<string, string[]>; isSlow?: (game: string, ms: number) => boolean; introducing?: boolean; announce?: boolean; onPosition?: (p: unknown) => void }, attached = false) {
  return mountSuspended(Session, { props: { pool: props.cards, lang: 'nl', ...props } as never, ...(attached ? { attachTo: document.body } : {}) });
}

function ensureEditableFocused() {
  expect((document.activeElement as HTMLElement | null)?.isContentEditable || document.activeElement?.getAttribute('contenteditable')).toBeTruthy();
}

async function doEnter() {
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await nextTick();
  await nextTick();
}

function promptOf(w: VueWrapper) {
  return w.get('[data-testid="prompt"]').text();
}

/** The words listed as mixed up before, top to bottom. */
function readMixedBefore(w: VueWrapper) {
  return w.findAll('[data-testid="mixed-before"] li').map(li => li.text());
}

function answerFor(prompt: string) {
  return 'a' + prompt.slice(1);
}

/** A tap as a browser does it: the button takes focus unless its mousedown is cancelled. */
async function doPress(w: VueWrapper, testId: string) {
  const button = w.get(`[data-testid="${testId}"]`).element as HTMLElement;
  if (button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))) button.focus();
  await doClick(w, testId);
}

/** A tap on plain text: the focus leaves the field unless the mousedown is cancelled. */
async function doTapOn(element: HTMLElement) {
  if (element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))) (document.activeElement as HTMLElement | null)?.blur();
  await nextTick();
}

async function doClick(w: VueWrapper, testId: string) {
  await w.get(`[data-testid="${testId}"]`).trigger('click');
  await nextTick();
}

/** Takes the card on screen for card `other`, picked in the mix-up sheet stood in for by a button. */
/** Reveals the card if hidden, ticks or unticks `other` in the mix-up sheet and closes it. */
async function doMixUp(w: VueWrapper, other: string) {
  if (w.find('[data-testid="reveal"]').exists()) await doClick(w, 'reveal');
  await doClick(w, 'mixed-up');
  const search = w.get('[data-testid="mix-up-search"]');
  search.element.textContent = answerFor(promptOfId(other));
  await search.trigger('input');
  await w.get('[data-testid="mix-up-option"]').trigger('click');
  await doClick(w, 'mix-up-done');
}

function ensureDisabled(w: VueWrapper, testId: string, disabled = true) {
  expect(w.get(`[data-testid="${testId}"]`).attributes('disabled') !== undefined).toBe(disabled);
}

function ensureContains(w: VueWrapper, testId: string, text: string) {
  expect(w.get(`[data-testid="${testId}"]`).text()).toContain(text);
}

const promptOfId = (id: string) => 'p' + id.slice(1);

async function doRecall(w: VueWrapper, remembered: boolean) {
  await doClick(w, 'reveal');
  await doClick(w, remembered ? 'remembered' : 'forgot');
}

async function doType(w: VueWrapper, testId: string, text: string) {
  const field = w.get(`[data-testid="${testId}"]`);
  field.element.textContent = text;
  await field.trigger('input');
  await field.trigger('keydown', { key: 'Enter' });
  await nextTick();
}

function tileFor(w: VueWrapper, side: 'left' | 'right', text: string) {
  return w.findAll(`[data-testid="match-${side}"]`).find(t => t.get('[data-testid="match-text"]').text() === text)!;
}

async function doMismatch(w: VueWrapper, leftId: string, rightId: string) {
  await tileFor(w, 'left', 'p' + leftId.slice(1)).trigger('click');
  await tileFor(w, 'right', 'a' + rightId.slice(1)).trigger('click');
  await nextTick();
}

async function doMatch(w: VueWrapper, id: string) {
  await doMismatch(w, id, id);
}

function visiblePairs(w: VueWrapper) {
  return w.findAll('[data-testid="match-left"]').filter(t => !t.classes('invisible')).map(t => t.get('[data-testid="match-text"]').text());
}

async function doPick(w: VueWrapper, answer: string) {
  await w.findAll('[data-testid="option"]').find(o => o.text().startsWith(answer))!.trigger('click');
  await nextTick();
}

function timerWidth(w: VueWrapper) {
  return Number.parseFloat(w.get('[data-testid="timer"] > div').attributes('style')!.match(/width: ([\d.]+)%/)![1]!);
}

function lastPosition(w: VueWrapper) {
  return w.emitted<[unknown]>('position')!.at(-1)![0];
}

function ensureHas(w: VueWrapper, testId: string, has = true) {
  expect(w.find(`[data-testid="${testId}"]`).exists()).toBe(has);
}

function leftOf(w: { get: (s: string) => { text: () => string } }) {
  return Number(w.get('[data-testid="left"]').text().replace('left ', ''));
}

function idOf(prompt: string) {
  return 'c' + prompt.slice(1);
}

function ensureEmitted(w: VueWrapper, event: string) {
  expect(w.emitted(event)).toBeDefined();
}
