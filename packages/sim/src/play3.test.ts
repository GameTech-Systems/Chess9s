// S58: 3-player self-play with the greedy player: bots finish games in every preset and the same
// seed gives the same game. S62: the search on every seat. S59: what each game records for the
// balance report (stats3.ts), and the greedy Dragon against searching Kinged players. Whole search games in every preset at depths 1 and 2 take minutes each:
// `pnpm sim --players 3 --depths <d> --games 1` plays them (the S62 handoff has the runs).
import { describe, expect, it } from 'vitest';
import { loadSource, rulesFor } from './load';
import { playGame3 } from './play3';

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

  it('plays the paranoid search on every seat when asked, the same game for the same seed (S62)', () => {
    const { rules, ruleset } = rulesFor(source, 'standard-3p');
    const play = (depth: number) =>
      playGame3(rules, ruleset, {
        openingPlies: 4,
        maxPlies: 10,
        seed: 2,
        search: { depth, nodes: 3_000 },
      });
    const greedy = playGame3(rules, ruleset, { openingPlies: 4, maxPlies: 10, seed: 2 });
    for (const depth of [1, 2]) {
      const game = play(depth);
      expect(game.plies).toBe(10);
      expect(game).toEqual(play(depth));
      expect(game.key).not.toBe(greedy.key);
    }
  }, 120_000);

  it('finishes a depth-1 search game from the start in easy-3p', () => {
    const { rules, ruleset } = rulesFor(source, 'easy-3p');
    const game = playGame3(rules, ruleset, {
      ...options,
      seed: 1,
      search: { depth: 1, nodes: 100_000 },
    });
    expect(game.outcome).not.toBe('unfinished');
  }, 60_000);

  it('stops at the safety cap and calls the game unfinished', () => {
    const { rules, ruleset } = rulesFor(source, 'standard-3p');
    const game = playGame3(rules, ruleset, { openingPlies: 0, maxPlies: 6, seed: 3 });
    expect(game).toMatchObject({ outcome: 'unfinished', plies: 6, winner: null });
  });

  it('records the Dragon seat, the events and who shares a draw (S59)', () => {
    const { rules, ruleset } = rulesFor(source, 'standard-3p');
    const game = playGame3(rules, ruleset, { ...options, seed: 1 });
    expect(game.dragon).toBe('dragon');
    expect(Array.isArray(game.events)).toBe(true);
    if (game.outcome === 'draw') expect(game.between!.length).toBeGreaterThanOrEqual(2);
    else expect(game.between).toBeNull();
    for (const e of game.events)
      expect(e).toMatch(/^(king-captured:\w+|tail-stone:\w+|dragon-out)$/);
  }, 60_000);

  it('counts a King the Dragon captured among the events', () => {
    // Greedy games in draft-3p: some seed in the first few has the Dragon take a King.
    const { rules, ruleset } = rulesFor(source, 'draft-3p');
    const games = [1, 2, 3, 4, 5, 6].map((seed) =>
      playGame3(rules, ruleset, { openingPlies: 4, maxPlies: 1500, seed }),
    );
    const captured = games.filter((g) => g.events.some((e) => e.startsWith('king-captured:')));
    expect(captured.length).toBeGreaterThan(0);
  }, 120_000);

  it('plays the Dragon greedy against searching Kinged players when asked (S59)', () => {
    const { rules, ruleset } = rulesFor(source, 'standard-3p');
    // 30 plies: since S68 both Dragons spend their first moves walking out through A5 alike.
    const base = { openingPlies: 4, maxPlies: 30, seed: 2, search: { depth: 1, nodes: 3_000 } };
    const mixed = playGame3(rules, ruleset, { ...base, greedyDragon: true });
    expect(mixed).toEqual(playGame3(rules, ruleset, { ...base, greedyDragon: true }));
    expect(mixed.key).not.toBe(playGame3(rules, ruleset, base).key);
    const greedy = playGame3(rules, ruleset, { openingPlies: 4, maxPlies: 30, seed: 2 });
    expect(mixed.key).not.toBe(greedy.key);
  }, 120_000);

  it('refuses a 2-player ruleset', () => {
    const { rules, ruleset } = rulesFor(source, 'draft-2p');
    expect(() => playGame3(rules, ruleset, { ...options, seed: 1 })).toThrow(/3-player/);
  });
});
