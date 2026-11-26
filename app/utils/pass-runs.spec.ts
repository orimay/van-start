import { describe, expect, it } from 'vitest';
import { passRuns, type Run } from './pass-runs';

describe('pass runs', () => {
  it('line the words up the same way in every game, gaps as far left as they go', () => {
    expect(drawn([
      '##', '##', '##', '#_', '_#', '_#', '#_', '##',
    ])).toEqual([
      '__######',
      '##__####',
    ]);
  });

  it('put the words no game passed last', () => {
    expect(drawn(['__', '#_', '__', '_#'])).toEqual([
      '_#__',
      '#___',
    ]);
  });

  it('draw a stretch of passed words as one run', () => {
    expect(passRuns([[true, true], [true, false], [true, true]])[0]).toEqual([{ from: 0, to: 1 }]);
  });

  it('draw as many runs for a thousand words as for a handful', () => {
    const words = Array.from({ length: 1000 }, (_, i) => [i % 2 === 0, i % 3 === 0]);
    expect(passRuns(words).map(runs => runs.length)).toEqual([1, 2]);
  });

  it('draw nothing for an empty group', () => {
    expect(passRuns([], 2)).toEqual([[], []]);
  });
});

// declarative helpers

/** Each word as its passes, `#` for a game passed: the rows come back the same way, one character a word. */
function drawn(words: string[]) {
  const runs = passRuns(words.map(word => [...word].map(c => c === '#')));
  return runs.map(game => draw(game, words.length));
}

function draw(runs: Run[], size: number) {
  const cells = Array.from({ length: size }, () => '_');
  for (const { from, to } of runs) cells.fill('#', Math.round(from * size), Math.round(to * size));
  return cells.join('');
}
