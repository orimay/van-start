import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastOf } from '../../tests/contrast';

const theme = readFileSync('node_modules/tailwindcss/theme.css', 'utf8');
const shade = (name: string) => theme.match(new RegExp(`--color-${name}: (oklch\\([^)]+\\));`))![1]!;

/** Every class list in the app's sources: a quoted string or an `@apply`. */
const sources = () =>
  readdirSync('app', { recursive: true, encoding: 'utf8' })
    .filter(f => /\.(vue|ts|css)$/.test(f) && !f.endsWith('.spec.ts'))
    .flatMap(file =>
      readFileSync(join('app', file), 'utf8')
        .split('\n')
        .flatMap(line => [...line.matchAll(/'[^']*'|"[^"]*"|`[^`]*`|@apply [^;]*/g)].map(m => m[0]))
        // A bound `:class="a ? 'x' : 'y'"` holds its lists in the inner quotes.
        .flatMap(list => (/^".*'.*"$/.test(list) ? [...list.matchAll(/'[^']*'/g)].map(m => m[0]) : [list]))
        .map(list => ({ file, list })),
    );

/** Every class list setting white text on an orange background. */
function whiteOnOrange() {
  return sources()
    .filter(({ list }) => /(^|[\s'"`])text-white\b/.test(list))
    .flatMap(({ file, list }) => [...list.matchAll(/(?:^|[\s'"`])bg-(orange-\d+)\b/g)].map(m => ({ where: `${file}: ${list}`, orange: m[1]! })));
}

describe('white text on orange', () => {
  it('is used somewhere, so the check below checks something', () => {
    expect(whiteOnOrange().length).toBeGreaterThan(0);
  });

  it('reads at AA contrast everywhere', () => {
    const low = whiteOnOrange().filter(({ orange }) => contrastOf(shade(orange), '#ffffff') < 4.5);
    expect(low.map(l => l.where)).toEqual([]);
  });
});

/** Every class list in the app's sources setting a grey stone text, with the shade it shows in each theme and the background it sits on. */
function greyText() {
  return sources().flatMap(({ file, list }) => {
    const light = list.match(/(?:^|[\s'"`])text-(stone-\d+)\b/)?.[1];
    const dark = list.match(/(?:^|[\s'"`])dark:text-(stone-\d+)\b/)?.[1] ?? light;
    if (!dark) return [];
    // Unless the list paints its own, text sits on the page or on a card, whichever is closer to it.
    const lightBg = list.match(/(?:^|[\s'"`])bg-(stone-\d+)\b/)?.[1] ?? 'stone-50';
    const darkBg = list.match(/(?:^|[\s'"`])dark:bg-(stone-\d+)\b/)?.[1] ?? 'stone-900';
    return [{ where: `${file}: ${list}`, light, dark, lightBg, darkBg }];
  });
}

describe('grey text', () => {
  it('is used somewhere, so the check below checks something', () => {
    expect(greyText().length).toBeGreaterThan(0);
  });

  it('reads at AA contrast in the light theme everywhere', () => {
    const low = greyText().filter(({ light, lightBg }) => light && contrastOf(shade(light), shade(lightBg)) < 4.5);
    expect(low.map(l => l.where)).toEqual([]);
  });

  it('reads at AA contrast in the dark theme everywhere', () => {
    const low = greyText().filter(({ dark, darkBg }) => contrastOf(shade(dark), shade(darkBg)) < 4.5);
    expect(low.map(l => l.where)).toEqual([]);
  });
});
