/** Learning state of every card in a Lexilize backup (.lxb) or deck export (.lxf), by card uuid. */
export interface LexilizeCard {
  /** 1 new, 2 learning, 3 learned. */
  state: number;
  /** Next review (ms), Lexilize progress field 2. */
  due: number;
  /** When it was first studied (ms), field 10. */
  since: number;
}

type Field = [field: number, value: number | Uint8Array];

function* fields(buf: Uint8Array): Generator<Field> {
  for (const [field, { value }] of fieldsAt(buf, { i: 0 })) yield [field, value];
}

const text = new TextDecoder();

function readCategory(buf: Uint8Array, into: Map<string, LexilizeCard>) {
  for (const [field, value] of fields(buf)) {
    if (!(value instanceof Uint8Array)) continue;
    if (field === 19) readCategory(value, into);
    if (field !== 15) continue;
    const card = new Map(fields(value));
    const uuid = card.get(11);
    const progress = card.get(6);
    if (!(uuid instanceof Uint8Array) || !(progress instanceof Uint8Array)) continue;
    const p = new Map(fields(progress));
    into.set(text.decode(uuid), { state: Number(p.get(9)), due: Number(p.get(2)), since: Number(p.get(10)) });
  }
}

/** Cards of every deck in the file; a card in several decks keeps its most advanced copy. */
export function readLexilize(file: ArrayBuffer | Uint8Array): Map<string, LexilizeCard> {
  const cards = new Map<string, LexilizeCard>();
  for (const [field, value] of fields(file instanceof Uint8Array ? file : new Uint8Array(file))) {
    if (field !== 1 || !(value instanceof Uint8Array)) continue;
    const deck = new Map<string, LexilizeCard>();
    readCategory(value, deck);
    for (const [id, card] of deck) {
      const known = cards.get(id);
      if (!known || card.state > known.state || (card.state === known.state && card.due > known.due)) cards.set(id, card);
    }
  }
  return cards;
}
/** `fields`, also telling where each field starts. */
function* fieldsAt(buf: Uint8Array, at: { i: number }): Generator<[number, { from: number; value: number | Uint8Array }]> {
  const varint = () => {
    let n = 0;
    let scale = 1;
    for (;;) {
      const b = buf[at.i++]!;
      n += (b & 0x7f) * scale;
      scale *= 128;
      if (!(b & 0x80)) return n;
    }
  };
  while (at.i < buf.length) {
    const from = at.i;
    const key = varint();
    const wire = key & 7;
    const field = Math.floor(key / 8);
    if (wire === 0) yield [field, { from, value: varint() }];
    else if (wire === 2) {
      const length = varint();
      const value = buf.subarray(at.i, (at.i += length));
      yield [field, { from, value }];
    } else if (wire === 1) {
      at.i += 8;
      yield [field, { from, value: 0 }];
    } else if (wire === 5) {
      at.i += 4;
      yield [field, { from, value: 0 }];
    } else throw new Error(`Not a Lexilize file (wire type ${wire})`);
  }
}

