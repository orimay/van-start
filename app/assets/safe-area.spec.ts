import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** 1rem in from the side and up from the bottom clears a screen corner rounded up to about 54px. */
const CORNER_CLEARANCE = 1;

const sources = () =>
  readdirSync('app', { recursive: true, encoding: 'utf8' })
    .filter(f => /\.(vue|ts|css)$/.test(f) && !f.endsWith('.spec.ts'))
    .map(file => ({ file, text: readFileSync(join('app', file), 'utf8') }));

/** Every clearance kept off a screen edge: `max(Xrem, env(safe-area-inset-…))` or `calc(env(safe-area-inset-…) + Xrem)`. */
function clearances() {
  return sources().flatMap(({ file, text }) =>
    [...text.matchAll(/max\(\s*([\d.]+)rem\s*,\s*env\(safe-area-inset-(\w+)\)\s*\)|calc\(\s*env\(safe-area-inset-(\w+)\)\s*\+\s*([\d.]+)rem\s*\)/g)].map(m => ({
      where: `${file}: ${m[0]}`,
      edge: m[2] ?? m[3]!,
      rem: Number(m[1] ?? m[4]),
    })),
  );
}

describe('the screen edges', () => {
  it('are kept clear somewhere, so the check below checks something', () => {
    expect(clearances().length).toBeGreaterThan(0);
  });

  it('are kept clear of the rounded corners everywhere', () => {
    expect(clearances().filter(c => c.rem < CORNER_CLEARANCE).map(c => c.where)).toEqual([]);
  });

  it('are all kept clear by the app frame, so every page respects them', () => {
    const frame = readFileSync('app/app.vue', 'utf8').match(/<main class="([^"]*)"/)![1]!;
    for (const edge of ['top', 'right', 'bottom', 'left']) expect(frame).toMatch(new RegExp(`max\\(${CORNER_CLEARANCE}rem,env\\(safe-area-inset-${edge}\\)\\)`));
  });
});
