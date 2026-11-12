/** A list told as stretches of another list, `[start, length]`, and items that list lacks. */
export type Runs<T> = Array<[number, number] | T>;

/** `list` as runs over `base`; nearly equal lists come out a few entries long. */
export function diff<T>(list: readonly T[], base: readonly T[], keyOf: (item: T) => string): Runs<T> {
  const baseKeys = base.map(keyOf);
  const firstAt = new Map<string, number>();
  baseKeys.forEach((key, i) => firstAt.has(key) || firstAt.set(key, i));
  const runs: Runs<T> = [];
  for (let i = 0; i < list.length; ) {
    const start = firstAt.get(keyOf(list[i]!));
    if (start === undefined) {
      runs.push(list[i++]!);
      continue;
    }
    let length = 1;
    while (i + length < list.length && start + length < base.length && keyOf(list[i + length]!) === baseKeys[start + length]) length++;
    runs.push([start, length]);
    i += length;
  }
  return runs;
}

/** The list `diff` described, rebuilt over the same `base`. */
export function patch<T>(runs: Runs<T>, base: readonly T[]): T[] {
  return runs.flatMap(run => (Array.isArray(run) ? base.slice(run[0], run[0] + run[1]) : [run]));
}
