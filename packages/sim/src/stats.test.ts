// Run summaries against the D12 measures (decision 0008): first-player score, the band, the game
// count, draw reasons and game length.
import { describe, expect, it } from 'vitest';
import { MEASURES } from './measures';
import type { GameSummary } from './play';
import { summarize, wilson } from './stats';

const game = (over: Partial<GameSummary>): GameSummary => ({
  seed: 0,
  first: 'dark',
  second: 'light',
  outcome: 'draw',
  reason: 'repetition',
  winner: null,
  plies: 100,
  minDepth: 1,
  capped: 0,
  key: 'k',
  ...over,
});

const games = (n: number, over: Partial<GameSummary>, from = 0) =>
  Array.from({ length: n }, (_, i) => game({ seed: from + i, key: `g${from + i}`, ...over }));

const win = (side: 'first' | 'second'): Partial<GameSummary> => ({
  outcome: side,
  reason: 'checkmate',
  winner: side === 'first' ? 'dark' : 'light',
});

describe('wilson', () => {
  it('brackets the score and narrows with more games', () => {
    const [lo, hi] = wilson(0.5, 100);
    expect(lo).toBeCloseTo(0.4038, 3);
    expect(hi).toBeCloseTo(0.5962, 3);
    const [lo2, hi2] = wilson(0.5, 2000);
    expect(hi2 - lo2).toBeLessThan(hi - lo);
  });

  it('is empty-handed for no games', () => {
    expect(wilson(0, 0)).toEqual([0, 1]);
  });
});

describe('summarize', () => {
  it('scores a draw as half a point to the first mover', () => {
    const s = summarize([...games(2, win('first')), ...games(1, win('second')), ...games(1, {})]);
    expect(s).toMatchObject({ games: 4, firstWins: 2, secondWins: 1, draws: 1 });
    expect(s.score).toBeCloseTo(2.5 / 4);
    expect(s.drawRate).toBeCloseTo(0.25);
    expect(s.winsBySide).toEqual({ dark: 2, light: 1 });
    expect(s.results).toEqual({ checkmate: 3, repetition: 1 });
  });

  it('passes a balanced run of at least 2,000 games', () => {
    const s = summarize([...games(1000, win('first')), ...games(1000, win('second'), 1000)]);
    expect(s.score).toBe(0.5);
    expect(s.flags).toEqual([]);
    expect(s.pass).toBe(true);
  });

  it.each([
    [0.47, true],
    [0.53, true],
    [0.4695, false],
    [0.5305, false],
  ])('at score %s the band check passes: %s', (score, inside) => {
    const n = 2000;
    const firsts = Math.round(score * n * 2); // half points
    const s = summarize([
      ...games(Math.floor(firsts / 2), win('first')),
      ...games(firsts % 2, {}, 5000),
      ...games(n - Math.floor(firsts / 2) - (firsts % 2), win('second'), 10000),
    ]);
    expect(s.games).toBe(n);
    expect(s.pass).toBe(inside);
    expect(s.flags.includes('score outside 47–53%')).toBe(!inside);
  });

  it('flags too few games even when the score is in the band', () => {
    const s = summarize([...games(10, win('first')), ...games(10, win('second'), 10)]);
    expect(s.flags).toEqual(['too few games']);
    expect(s.pass).toBe(false);
  });

  it('has no score to flag before any game is played', () => {
    expect(summarize([]).flags).toEqual(['too few games']);
  });

  it('flags games that hit the safety cap', () => {
    const s = summarize([...games(1, { reason: 'unfinished' }), ...games(1, win('first'), 1)]);
    expect(s.unfinished).toBe(1);
    expect(s.flags).toContain('unfinished games');
  });

  it('reports game length and distinct games', () => {
    const s = summarize([
      game({ plies: 10, key: 'a' }),
      game({ plies: 20, key: 'a' }),
      game({ plies: 60, key: 'b' }),
      game({ plies: 30, key: 'c', minDepth: 2 }),
    ]);
    expect(s.plies).toEqual({ mean: 30, median: 25, min: 10, max: 60 });
    expect(s.distinct).toBe(3);
    expect(s.minDepth).toBe(1);
  });

  it('counts the moves the node budget cut short', () => {
    const s = summarize([game({ capped: 2 }), game({ capped: 0 }), game({ capped: 1 })]);
    expect(s.capped).toBe(3);
  });

  it('uses the thresholds from decision 0008', () => {
    expect(MEASURES).toMatchObject({
      decision: '0008',
      band: { min: 0.47, max: 0.53 },
      minGames: 2000,
      depths: [1, 2],
    });
  });
});
