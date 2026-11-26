import { describe, expect, it } from 'vitest';
import { cardsOf, type DeckCard } from './deck';
import { applyEdits, editCourseCard, noEdits } from './edits';

const HUIS: DeckCard = { id: 'huis', f: 'дом', b: 'het huis', au: 'hcjfiekbaljlmnop', xb: 'Mijn huis is groot.', axb: 'abcdefghijklmnop' };

describe('an edited course card', () => {
  it('keeps the clips of a Dutch side it left alone', () => {
    const edits = editCourseCard(noEdits(), HUIS, { ...HUIS, f: 'дом, здание' });
    expect(playedBy(edits)).toEqual({ au: 'hcjfiekbaljlmnop', axb: 'abcdefghijklmnop' });
  });

  it('plays a clip saved under its old hex name by the letter name the clip has now', () => {
    const edits = { ...noEdits(), cards: { huis: { ...HUIS, f: 'дом, здание', au: '7295841b0939cdef', axb: '0123456789abcdef' } } };
    expect(playedBy(edits)).toEqual({ au: 'hcjfieblajdjmnop', axb: 'abcdefghijklmnop' });
  });
});

// declarative helpers

function playedBy(edits: ReturnType<typeof noEdits>) {
  const [card] = cardsOf(applyEdits({ id: 'root', name: 'Course', cards: [HUIS] }, edits));
  return { au: card!.au, axb: card!.axb };
}
