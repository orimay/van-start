import { describe, expect, it } from 'vitest';
import { addCard, addSection, cardIdsOf, emptyCustom, findSection, removeCard, removeSection, renameSection, updateCard } from './custom';
import { cardsOf } from './deck';

const word = { f: 'house', b: 'het huis' };

describe('my words', () => {
  it('start empty', () => {
    expect(cardsOf(emptyCustom())).toEqual([]);
  });

  describe('a section', () => {
    it('is added under its parent', () => {
      const [root, id] = addSection(emptyCustom(), undefined, 'Home');
      const [withSub, subId] = addSection(root, id, 'Kitchen');
      expect(findSection(withSub, id)!.name).toBe('Home');
      expect(findSection(withSub, id)!.children!.map(c => c.name)).toEqual(['Kitchen']);
      expect(findSection(withSub, subId)!.name).toBe('Kitchen');
    });

    it('is renamed', () => {
      const [root, id] = addSection(emptyCustom(), undefined, 'Home');
      expect(findSection(renameSection(root, id, 'House'), id)!.name).toBe('House');
    });

    it('is removed with everything inside', () => {
      const [a, home] = addSection(emptyCustom(), undefined, 'Home');
      const [b, kitchen] = addSection(a, home, 'Kitchen');
      const [c] = addCard(b, kitchen, word);
      const [after, removed] = removeSection(c, home);
      expect(findSection(after, home)).toBeUndefined();
      expect(findSection(after, kitchen)).toBeUndefined();
      expect(cardsOf(after)).toEqual([]);
      expect(removed).toEqual(cardIdsOf(findSection(c, home)!));
      expect(removed).toHaveLength(1);
    });

    it('leaves the original untouched', () => {
      const root = emptyCustom();
      addSection(root, undefined, 'Home');
      expect(root.children ?? []).toEqual([]);
    });
  });

  describe('a card', () => {
    it('is added to its section with a fresh id', () => {
      const [a, home] = addSection(emptyCustom(), undefined, 'Home');
      const [b, id] = addCard(a, home, { ...word, tr: 'хёйс', xb: 'Het huis is groot.', xf: 'The house is big.' });
      expect(findSection(b, home)!.cards).toEqual([{ id, ...word, tr: 'хёйс', xb: 'Het huis is groot.', xf: 'The house is big.' }]);
    });

    it('drops empty optional fields', () => {
      const [a, home] = addSection(emptyCustom(), undefined, 'Home');
      const [b] = addCard(a, home, { ...word, tr: ' ', xb: '' });
      expect(Object.keys(findSection(b, home)!.cards![0]!).sort()).toEqual(['b', 'f', 'id']);
    });

    it('is edited in place', () => {
      const [a, home] = addSection(emptyCustom(), undefined, 'Home');
      const [b, id] = addCard(a, home, word);
      const after = updateCard(b, id, { f: 'home', b: 'het thuis', tr: 'тхёйс' });
      expect(cardsOf(after)).toEqual([{ id, f: 'home', b: 'het thuis', tr: 'тхёйс' }]);
    });

    it('is removed', () => {
      const [a, home] = addSection(emptyCustom(), undefined, 'Home');
      const [b, id] = addCard(a, home, word);
      const [c] = addCard(b, home, { f: 'door', b: 'de deur' });
      expect(cardsOf(removeCard(c, id)).map(x => x.b)).toEqual(['de deur']);
    });
  });
});
