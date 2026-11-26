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

  it('shows a picture saved under its old hex name by the letter name the picture has now', () => {
    const edits = { ...noEdits(), cards: { huis: { ...HUIS, f: 'дом, здание', img: '989197070454.jpg' } } };
    expect(shownBy(edits)).toBe('jijbjhahaefe.jpg');
  });

  it('keeps the name of a picture already spelled in letters', () => {
    const edits = { ...noEdits(), cards: { huis: { ...HUIS, f: 'дом, здание', img: 'jijbjhahaefe.jpg' } } };
    expect(shownBy(edits)).toBe('jijbjhahaefe.jpg');
  });
});

// declarative helpers

function editedCard(edits: ReturnType<typeof noEdits>) {
  return cardsOf(applyEdits({ id: 'root', name: 'Course', cards: [HUIS] }, edits))[0]!;
}

function playedBy(edits: ReturnType<typeof noEdits>) {
  const { au, axb } = editedCard(edits);
  return { au, axb };
}

function shownBy(edits: ReturnType<typeof noEdits>) {
  return editedCard(edits).img;
}
