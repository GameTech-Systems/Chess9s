// The search computer opponent (S23): negamax with alpha-beta over the engine's own legal moves,
// so it plays whichever ruleset is selected. Positions are data
// (test/fixtures/positions/search.json); piece values come from the pieces' movement data.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixtures from '../../test/fixtures/positions/search.json';
import { newGame, playMove, type GameState } from '../game/game';
import { toNotation, type MoveRules, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry } from '../rules/loader';
import { bestMove, evaluate, pieceValues } from './search';

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

interface Case {
  name: string;
  overrides: Record<string, unknown>;
  turn: string;
  pieces: Position;
  expect: { mates?: boolean; plays?: string; avoids?: string };
}

describe('positions', () => {
  it.each((fixtures.cases as Case[]).map((c) => [c.name, c] as const))('%s', (_, c) => {
    const game = newGame(rulesWith(c.overrides), ID, {
      position: c.pieces,
      turn: c.turn,
      coastOpen: true,
    });
    const { move } = bestMove(game, { nodes: 3000 });
    expect(move).toBeDefined();
    const played = toNotation(move!);
    if (c.expect.mates) {
      const after = playMove(game, move!);
      expect(after.result).toMatchObject({ status: 'win', winner: c.turn, reason: 'checkmate' });
    }
    if (c.expect.plays) expect(played).toBe(c.expect.plays);
    if (c.expect.avoids) {
      expect(played).not.toBe(c.expect.avoids);
      expect(game.legal.map(toNotation)).not.toContain(c.expect.avoids);
    }
  });
});

describe('piece values from movement data', () => {
  it('gives royal and neutral pieces no value, and the others a positive one', () => {
    const values = pieceValues(rulesWith());
    expect(values['king']).toBe(0);
    expect(values['dragon-tail']).toBe(0);
    for (const id of ['queen', 'rook', 'bishop', 'knight', 'pawn', 'sun', 'moon']) {
      expect(values[id]).toBeGreaterThan(0);
    }
    expect(values['queen']).toBeGreaterThan(values['rook']!);
    expect(values['rook']).toBeGreaterThan(values['pawn']!);
  });

  it('follows the ruleset: every dragonHead.range option, a longer range never worth less', () => {
    const p = registry.parameters.find((x) => x.id === 'dragonHead.range')!;
    const ranges = (p.options as number[]).slice().sort((a, b) => a - b);
    const values = ranges.map(
      (r) => pieceValues(rulesWith({ 'dragonHead.range': r }))['light-dragon-head']!,
    );
    for (let i = 1; i < values.length; i++)
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]!);
    expect(values.at(-1)).toBeGreaterThan(values[0]!);
  });

  it('follows the ruleset: sunMoon.range 2 makes the Sun worth more than range 1', () => {
    const one = pieceValues(rulesWith({ 'sunMoon.range': 1 }))['sun']!;
    const two = pieceValues(rulesWith({ 'sunMoon.range': 2 }))['sun']!;
    expect(two).toBeGreaterThan(one);
  });
});

describe('evaluation', () => {
  const noMoves = (g: GameState): GameState => ({ ...g, legal: [] });

  it('scores the start position level in material, from either side', () => {
    const game = newGame(rulesWith(), ID);
    expect(evaluate(noMoves(game))).toBe(0);
    expect(evaluate(noMoves({ ...game, turn: 'light' }))).toBe(0);
  });

  it('scores material from the side to move', () => {
    const game = newGame(rulesWith(), ID);
    const { e9: _, ...withoutDarkQueen } = game.position;
    void _;
    const light = newGame(rulesWith(), ID, { position: withoutDarkQueen, turn: 'light' });
    const dark = newGame(rulesWith(), ID, { position: withoutDarkQueen, turn: 'dark' });
    expect(evaluate(noMoves(light))).toBe(pieceValues(rulesWith())['queen']);
    expect(evaluate(noMoves(dark))).toBe(-evaluate(noMoves(light)));
  });

  it('adds a little for each legal move of the side to move', () => {
    const game = newGame(rulesWith(), ID);
    expect(evaluate(game)).toBeGreaterThan(evaluate(noMoves(game)));
    // The start position's whole mobility bonus is worth less than a minor piece.
    expect(evaluate(game) - evaluate(noMoves(game))).toBeLessThan(
      pieceValues(rulesWith())['knight']!,
    );
  });
});

describe('the search', () => {
  it('has no move once the game is over', () => {
    const game = newGame(rulesWith(), ID);
    expect(bestMove({ ...game, legal: [] }).move).toBeUndefined();
  });

  it('is deterministic: the same seed picks the same move', () => {
    const game = newGame(rulesWith(), ID);
    const a = bestMove(game, { nodes: 400, random: seeded(5) });
    const b = bestMove(game, { nodes: 400, random: seeded(5) });
    expect(toNotation(a.move!)).toBe(toNotation(b.move!));
  });

  it('stops near its node budget and still returns a legal move', () => {
    const game = newGame(rulesWith(), ID);
    const result = bestMove(game, { nodes: 50 });
    expect(result.nodes).toBeLessThanOrEqual(60);
    expect(game.legal).toContain(result.move);
  });

  it('plays legal moves from both sides through a capped game', () => {
    let game: GameState = newGame(rulesWith(), ID);
    for (let i = 0; i < 12 && game.result.status === 'ongoing'; i++) {
      game = playMove(game, bestMove(game, { nodes: 150, random: seeded(i + 1) }).move!);
    }
    expect(game.moves.length).toBeGreaterThan(0);
  });
});
