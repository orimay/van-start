import { describe, expect, it } from 'vitest';
import type { DeckNode } from './deck';
import { inheritedKind, kindsIn, kindState, overridden, shownCards, withGroupKind } from './kinds';

const tree: DeckNode = {
  id: 'root',
  name: 'root',
  children: [
    {
      id: 'a',
      name: 'A',
      cards: [{ id: 'word', f: 'дом', b: 'het huis' }, { id: 'sentence', f: 'Я дома.', b: 'Ik ben thuis.', k: 'sentence' }],
      children: [{ id: 'a1', name: 'A1', cards: [{ id: 'sentence2', f: 'Он дома.', b: 'Hij is thuis.', k: 'sentence' }, { id: 'combo', f: 'в понедельник утром', b: 'maandagochtend', k: 'combination' }] }],
    },
    { id: 'b', name: 'B', cards: [{ id: 'combo2', f: 'во вторник утром', b: 'dinsdagochtend', k: 'combination' }] },
  ],
};
const ids = (node: DeckNode): string[] => [...(node.cards ?? []).map(c => c.id), ...(node.children ?? []).flatMap(ids)];

describe('the shown deck', () => {
  it('keeps every card with both kinds on', () => {
    expect(ids(shownCards(tree, {}, {}))).toEqual(['word', 'sentence', 'sentence2', 'combo', 'combo2']);
  });

  it('leaves out the kind switched off', () => {
    expect(ids(shownCards(tree, { sentence: false }, {}))).toEqual(['word', 'combo', 'combo2']);
  });

  it('keeps the groups whose cards are all left out', () => {
    expect(shownCards(tree, { combination: false }, {}).children!.map(n => n.id)).toEqual(['a', 'b']);
  });

  it('follows a group switch over the global one, in its subgroups too', () => {
    expect(ids(shownCards(tree, { sentence: false }, { a: { sentence: true } }))).toEqual(['word', 'sentence', 'sentence2', 'combo', 'combo2']);
  });

  it('follows the nearest group switch', () => {
    expect(ids(shownCards(tree, {}, { a: { sentence: false }, a1: { sentence: true } }))).toEqual(['word', 'sentence2', 'combo', 'combo2']);
  });

  it('leaves the other kind to the global switch', () => {
    expect(ids(shownCards(tree, { combination: false }, { a: { sentence: true } }))).toEqual(['word', 'sentence', 'sentence2']);
  });
});

describe('a group kind state', () => {
  it('is its own switch', () => {
    expect(kindState(tree, 'a1', 'sentence', {}, { a1: { sentence: false } })).toBe('off');
  });

  it('follows the global switch without one', () => {
    expect(kindState(tree, 'a', 'sentence', { sentence: false }, {})).toBe('global');
  });

  it('is mixed when a subgroup has another', () => {
    expect(kindState(tree, 'a', 'sentence', {}, { a1: { sentence: false } })).toBe('mixed');
  });

  it('is not mixed when the subgroup agrees with it', () => {
    expect(kindState(tree, 'a', 'sentence', {}, { a: { sentence: false }, a1: { sentence: false } })).toBe('off');
  });
});

describe('a group switch set', () => {
  it('clears its subgroups own switches of that kind', () => {
    expect(withGroupKind(tree, 'a', 'sentence', true, { a1: { sentence: false, combination: false } })).toEqual({ a: { sentence: true }, a1: { combination: false } });
  });

  it('set back to the global one drops the group', () => {
    expect(withGroupKind(tree, 'a', 'sentence', undefined, { a: { sentence: false } })).toEqual({});
  });
});

describe('the subgroups a group switch overrides', () => {
  it('are those with their own, by name, with what they get', () => {
    expect(overridden(tree, 'root', 'sentence', false, { a1: { sentence: true }, b: { combination: false } })).toEqual([{ name: 'A1', from: true, to: false }]);
  });
});

describe('what a group inherits', () => {
  it('is the nearest parent switch, its own left aside', () => {
    expect(inheritedKind(tree, 'a1', 'sentence', {}, { a: { sentence: false }, a1: { sentence: true } })).toBe(false);
  });

  it('is the global switch without a parent one', () => {
    expect(inheritedKind(tree, 'a', 'combination', { combination: false }, {})).toBe(false);
  });
});

describe('the kinds in a group', () => {
  it('count its subgroups cards too', () => {
    expect(kindsIn(tree.children![0]!)).toEqual(['sentence', 'combination']);
  });

  it('are none for plain words', () => {
    expect(kindsIn({ id: 'w', name: 'W', cards: [{ id: 'w', f: 'f', b: 'b' }] })).toEqual([]);
  });
});
