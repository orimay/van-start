// Builders of minimal Lexilize backups for specs.
export function varint(n: number): number[] {
  const out: number[] = [];
  for (; n >= 128; n = Math.floor(n / 128)) out.push((n % 128) | 128);
  out.push(n);
  return out;
}

export const bytes = (field: number, data: number[]) => [...varint(field * 8 + 2), ...varint(data.length), ...data];
export const number = (field: number, n: number) => [...varint(field * 8), ...varint(n)];

export function card(uuid: string, { state, due, since }: { state: number; due: number; since: number }) {
  const progress = [...number(9, state), ...number(2, due), ...number(10, since)];
  return bytes(15, [...bytes(11, [...new TextEncoder().encode(uuid)]), ...bytes(6, progress)]);
}

export const sub = (...items: number[][]) => bytes(19, items.flat());
export const deck = (...items: number[][]) => bytes(1, items.flat());
export const lxb = (...decks: number[][]) => new Uint8Array(decks.flat()).buffer;
