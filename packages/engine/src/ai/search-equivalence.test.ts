// The faster search (S35, decision 0009) against the S23 search it replaced: wherever the S23
// search finishes within its node budget, the move, score and depth must be the same, including
// which of several equal moves a tie-break picks. Positions are data
// (test/fixtures/positions/search.json) plus seeded random games from the start.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixtures from '../../test/fixtures/positions/search.json';
import { newGame, playMove, type GameState } from '../game/game';
import { toNotation, type MoveRules, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry } from '../rules/loader';
import { bestMove, rulesKey } from './search';
import { referenceBestMove } from './search-reference';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = read('rules/parameters.json') as Registry;
const set = validateBoardAndPieces(
  read('rules/boards/standard-9x9.json'),
  readdirSync(root + 'rules/pieces')
    .filter((f) => f.endsWith('.json'))
    .map((f) => read(`rules/pieces/${f}`)),
  registry,
);
const base = read('rules/rulesets/draft-2p.json') as Record<string, unknown>;
const ID = { id: 'draft-2p', version: '0.2.0' };

function rulesWith(overrides: Record<string, unknown> = {}): MoveRules {
  const { values } = resolveRuleset(registry, { ...base, overrides });
  return { ...set, values, players: 2 };
}

const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** The game after `plies` random moves from the start. */
function randomGame(seed: number, plies: number): GameState {
  const random = seeded(seed);
  let game = newGame(rulesWith(), ID);
  for (let i = 0; i < plies && game.result.status === 'ongoing'; i++) {
    game = playMove(game, game.legal[Math.floor(random() * game.legal.length)]!);
  }
  return game;
}

interface Case {
  name: string;
  overrides: Record<string, unknown>;
  turn: string;
  pieces: Position;
}

const positions: [string, GameState][] = [
  ...(fixtures.cases as Case[]).map(
    (c) =>
      [
        c.name,
        newGame(rulesWith(c.overrides), ID, { position: c.pieces, turn: c.turn, coastOpen: true }),
      ] as [string, GameState],
  ),
  ['the start position', randomGame(1, 0)],
  ['6 random plies', randomGame(2, 6)],
  ['20 random plies', randomGame(3, 20)],
  ['40 random plies', randomGame(4, 40)],
];

/** Tie-breaks at both ends and the middle, so a different tie order shows. */
const PICKS = [0, 0.5, 0.999];

const result = (r: ReturnType<typeof bestMove>) => ({
  move: r.move ? toNotation(r.move) : null,
  score: r.score,
  depth: r.depth,
});

describe('the same result as the S23 search wherever it finishes', () => {
  const runs: [string, GameState, number, number][] = positions.flatMap(([name, game]) => [
    [name, game, 1, 20_000] as [string, GameState, number, number],
    [name, game, 2, 20_000] as [string, GameState, number, number],
  ]);
  // Depth 3 near the start, where it finishes within a small budget.
  runs.push(
    ...positions
      .filter(([n]) => n === 'the start position' || n === '6 random plies')
      .map(([n, g]) => [n, g, 3, 4_000] as [string, GameState, number, number]),
  );

  it.each(runs.map(([n, g, d, nodes]) => [`${n}, depth ${d}`, g, d, nodes] as const))(
    '%s',
    (_, game, depth, nodes) => {
      for (const p of PICKS) {
        const reference = referenceBestMove(game, { depth, nodes, random: () => p });
        if (reference.capped) return;
        const current = bestMove(game, { depth, nodes, random: () => p });
        expect(current.capped).toBe(false);
        expect(result(current)).toEqual(result(reference));
      }
    },
    30_000,
  );

  it('compares at least one depth-2 search of a full position', () => {
    const game = randomGame(3, 20);
    expect(referenceBestMove(game, { depth: 2, nodes: 20_000 }).capped).toBe(false);
  });
});

describe('transposition-table keys', () => {
  const game = newGame(rulesWith(), ID);

  it('include the ruleset id and version', () => {
    expect(rulesKey(game)).not.toBe(rulesKey({ ...game, ruleset: { ...ID, version: '0.2.1' } }));
    expect(rulesKey(game)).not.toBe(rulesKey({ ...game, ruleset: { ...ID, id: 'other' } }));
  });

  it('include every parameter value', () => {
    const keys = new Set<string>([rulesKey(game)]);
    let changed = 0;
    for (const p of registry.parameters) {
      if (!(p.id in game.rules.values)) continue;
      for (const option of p.options ?? []) {
        if (JSON.stringify(option) === JSON.stringify(game.rules.values[p.id])) continue;
        const rules = { ...game.rules, values: { ...game.rules.values, [p.id]: option } };
        const key = rulesKey({ ...game, rules } as GameState);
        expect(keys.has(key)).toBe(false);
        keys.add(key);
        changed++;
      }
    }
    expect(changed).toBeGreaterThan(20);
  });
});
