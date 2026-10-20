// Self-play (S24): the same search plays both seats; a game's outcome is scored from the first
// mover's seat in the turn order (decision 0008). Positions are data (test/fixtures/positions.json).
import { describe, expect, it } from 'vitest';
import fixtures from '../test/fixtures/positions.json';
import type { Position } from '@chess9s/engine';
import { loadSource, rulesFor } from './load';
import { playGame, seeded } from './play';

const source = loadSource(new URL('../../../', import.meta.url).pathname);

interface Case {
  name: string;
  overrides: Record<string, unknown>;
  turn: string;
  pieces: Position;
  expect: { outcome: string; reason: string; winner: string | null; plies: number };
}

const quick = { depth: 1, nodes: 2000, openingPlies: 0, maxPlies: 2000 };

describe('positions', () => {
  it.each((fixtures.cases as Case[]).map((c) => [c.name, c] as const))('%s', (_, c) => {
    const { rules, ruleset } = rulesFor(source, 'draft-2p', c.overrides);
    const game = playGame(rules, ruleset, {
      ...quick,
      seed: 1,
      init: { position: c.pieces, turn: c.turn, coastOpen: true },
    });
    expect(game).toMatchObject({ seed: 1, ...c.expect });
  });
});

describe('from the start position', () => {
  const { rules, ruleset } = rulesFor(source, 'draft-2p');

  it('stops at the safety cap and calls the game unfinished', () => {
    const game = playGame(rules, ruleset, { ...quick, nodes: 50, maxPlies: 6, seed: 3 });
    expect(game).toMatchObject({ outcome: 'draw', reason: 'unfinished', plies: 6, first: 'dark' });
  });

  it('is the same game for the same seed and a different one for another seed', () => {
    const play = (seed: number) =>
      playGame(rules, ruleset, { ...quick, nodes: 50, openingPlies: 4, maxPlies: 8, seed });
    expect(play(5)).toEqual(play(5));
    expect(play(5).key).not.toBe(play(6).key);
  });

  it('plays the opening plies at random and then searches to the depth asked', () => {
    const game = playGame(rules, ruleset, { ...quick, openingPlies: 2, maxPlies: 4, seed: 9 });
    expect(game.plies).toBe(4);
    expect(game.minDepth).toBe(1);
  });

  it('reports the shallowest depth the search finished when the node budget runs out', () => {
    const game = playGame(rules, ruleset, { ...quick, depth: 3, nodes: 40, maxPlies: 2, seed: 9 });
    expect(game.minDepth).toBeLessThan(3);
    expect(game.capped).toBe(2);
  });

  it('counts no move cut short when the budget is enough', () => {
    const game = playGame(rules, ruleset, { ...quick, openingPlies: 2, maxPlies: 4, seed: 9 });
    expect(game.capped).toBe(0);
  });
});

describe('seeded', () => {
  it('gives the same numbers in [0, 1) for the same seed', () => {
    const a = seeded(42);
    const b = seeded(42);
    const xs = Array.from({ length: 100 }, a);
    expect(xs).toEqual(Array.from({ length: 100 }, b));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBe(100);
  });
});
