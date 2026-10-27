// S58: 3-player self-play with the greedy player: bots finish games in every preset, the same seed
// gives the same game, and each seat's results are counted (the full report is S59).
import { describe, expect, it } from 'vitest';
import { loadSource, rulesFor } from './load';
import { playGame3, summarize3, toMarkdown3, type Summary3 } from './play3';

const source = loadSource(new URL('../../../', import.meta.url).pathname);
const options = { openingPlies: 0, maxPlies: 1500 };

describe('playGame3', () => {
  it.each(['standard-3p', 'draft-3p', 'easy-3p'])(
    'finishes a greedy game in %s',
    (id) => {
      const { rules, ruleset } = rulesFor(source, id);
      const game = playGame3(rules, ruleset, { ...options, seed: 1 });
      expect(game.order).toEqual(['dark', 'light', 'dragon']);
      expect(game.outcome).not.toBe('unfinished');
      expect(game.plies).toBeGreaterThan(0);
    },
    60_000,
  );

  it('is the same game for the same seed and a different one for another seed', () => {
    const { rules, ruleset } = rulesFor(source, 'standard-3p');
    const play = (seed: number) =>
      playGame3(rules, ruleset, { openingPlies: 4, maxPlies: 30, seed });
    expect(play(5)).toEqual(play(5));
    expect(play(5).key).not.toBe(play(6).key);
  });

  it('stops at the safety cap and calls the game unfinished', () => {
    const { rules, ruleset } = rulesFor(source, 'standard-3p');
    const game = playGame3(rules, ruleset, { openingPlies: 0, maxPlies: 6, seed: 3 });
    expect(game).toMatchObject({ outcome: 'unfinished', plies: 6, winner: null });
  });

  it('refuses a 2-player ruleset', () => {
    const { rules, ruleset } = rulesFor(source, 'draft-2p');
    expect(() => playGame3(rules, ruleset, { ...options, seed: 1 })).toThrow(/3-player/);
  });
});

describe('summarize3', () => {
  const game = (over: Partial<Summary3>): Summary3 => ({
    seed: 1,
    order: ['dark', 'light', 'dragon'],
    outcome: 'win',
    winner: 'dragon',
    loser: 'light',
    reason: 'checkmate',
    plies: 10,
    key: 'k',
    ...over,
  });
  const games = [
    game({ seed: 1 }),
    game({ seed: 2, winner: 'dark', loser: 'light', plies: 20, key: 'a' }),
    game({
      seed: 3,
      outcome: 'draw',
      winner: null,
      loser: null,
      reason: 'fifty-move',
      plies: 30,
      key: 'b',
    }),
    game({
      seed: 4,
      outcome: 'unfinished',
      winner: null,
      loser: null,
      reason: 'unfinished',
      key: 'c',
    }),
  ];

  it("counts each seat's wins, losses and the draws", () => {
    const s = summarize3(games);
    expect(s.games).toBe(4);
    expect(s.draws).toBe(1);
    expect(s.unfinished).toBe(1);
    expect(s.seats['dragon']).toMatchObject({ wins: 1, losses: 0, winRate: 0.25 });
    expect(s.seats['dark']).toMatchObject({ wins: 1, losses: 0 });
    expect(s.seats['light']).toMatchObject({ wins: 0, losses: 2 });
    expect(s.results).toEqual({ checkmate: 2, 'fifty-move': 1, unfinished: 1 });
    expect(s.plies).toEqual({ mean: 17.5, median: 15, min: 10, max: 30 });
  });

  it('writes a table with a row per seat', () => {
    const md = toMarkdown3({
      ruleset: { id: 'standard-3p', version: '0.1.0' },
      date: '2026-10-27',
      ...summarize3(games),
    });
    expect(md).toContain('standard-3p');
    for (const seat of ['dark', 'light', 'dragon']) expect(md).toContain(`| ${seat} |`);
  });
});
