import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastOf } from '../../tests/contrast';

const theme = readFileSync('node_modules/tailwindcss/theme.css', 'utf8');
const shade = (name: string) => theme.match(new RegExp(`--color-${name}: (oklch\\([^)]+\\));`))![1]!;

/** Every class list in the app's sources (a quoted string or an `@apply`) setting white text on an orange background. */
function whiteOnOrange() {
  const files = readdirSync('app', { recursive: true, encoding: 'utf8' }).filter(f => /\.(vue|ts|css)$/.test(f) && !f.endsWith('.spec.ts'));
  return files.flatMap(file =>
    readFileSync(join('app', file), 'utf8')
      .split('\n')
      .flatMap(line => [...line.matchAll(/'[^']*'|"[^"]*"|`[^`]*`|@apply [^;]*/g)].map(m => m[0]))
      .filter(list => /(^|[\s'"`])text-white\b/.test(list))
      .flatMap(list => [...list.matchAll(/(?:^|[\s'"`])bg-(orange-\d+)\b/g)].map(m => ({ where: `${file}: ${list}`, orange: m[1]! }))),
  );
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
