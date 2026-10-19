// S22a: en passant, castling (castling.enabled), pawn-safe zones (pawn.safeZones), and the
// Coast's exit (coast.2p.exit) and capture (coast.2p.capturable) rules, on the real board,
// pieces and draft-2p ruleset, at each parameter's default and every option. Positions are data.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../../test/fixtures/positions/special-rules.json';
import { newGame, playMove, type GameState } from '../game/game';
import { toNotation, type MoveRules, type Position } from '../moves/generate';
import { validateBoardAndPieces } from './formats';
import { resolveRuleset, type Registry } from './loader';

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

function rulesFor(overrides: Record<string, unknown> = {}): MoveRules {
  const { values } = resolveRuleset(registry, { ...base, overrides });
  return { ...set, values, players: 2 };
}

type Name = keyof typeof fixture.positions;
interface Fixture {
  turn: string;
  coastOpen?: boolean;
  pieces: Position;
}
const at = (name: Name) => fixture.positions[name] as Fixture;

/** A game from a fixture position; `change` adds, moves or removes pieces first. */
function game(
  name: Name,
  overrides: Record<string, unknown> = {},
  change: Record<string, Position[string] | null> = {},
): GameState {
  const f = at(name);
  const position: Position = { ...f.pieces };
  for (const [sq, p] of Object.entries(change)) {
    if (p) position[sq] = p;
    else delete position[sq];
  }
  return newGame(rulesFor(overrides), ID, {
    position,
    turn: f.turn,
    coastOpen: f.coastOpen ?? false,
  });
}

const notations = (g: GameState) => g.legal.map(toNotation);
function play(g: GameState, notation: string): GameState {
  const move = g.legal.find((m) => toNotation(m) === notation);
  if (!move) throw new Error(`${notation} is not legal for ${g.turn}: ${notations(g).join(' ')}`);
  return playMove(g, move);
}
const playAll = (g: GameState, ...moves: string[]) => moves.reduce(play, g);

describe('en passant', () => {
  it('takes a pawn that has just passed the capturing square with its double step', () => {
    const g = play(game('en-passant'), 'c2-c4');
    expect(notations(g)).toContain('b4xc3');
    const after = play(g, 'b4xc3');
    expect(after.position.c3).toMatchObject({ piece: 'pawn', side: 'dark' });
    expect(after.position.c4).toBeUndefined();
    expect(after.position.b4).toBeUndefined();
    expect(after.lost).toEqual({ light: ['pawn'] });
    expect(after.moves.at(-1)!.notation).toBe('b4xc3');
  });

  it('is open on the very next turn only', () => {
    const g = playAll(game('en-passant'), 'c2-c4', 'f9-f8', 'f1-f2');
    expect(notations(g)).not.toContain('b4xc3');
  });

  it('needs a double step: a single step past the square gives no capture in passing', () => {
    const g = playAll(game('en-passant'), 'c2-c3', 'f9-f8', 'c3-c4');
    expect(notations(g)).not.toContain('b4xc3');
  });

  it('never leaves its own King in check, though it empties two squares', () => {
    const g = play(game('en-passant-pinned'), 'c2-c4');
    expect(notations(g)).not.toContain('d4xc3');
    expect(notations(g)).toContain('d4-d3');
  });

  it('does not happen when pawn.initialDoubleStep is off (no double step to take)', () => {
    const g = game('en-passant', { 'pawn.initialDoubleStep': false });
    expect(notations(g)).not.toContain('c2-c4');
  });
});

describe('castling (castling.enabled)', () => {
  const castles = (g: GameState) => notations(g).filter((n) => n.includes('/'));

  it('is off by default: the King moves 2 squares, but no Rook goes with it', () => {
    const g = game('castling');
    expect(castles(g)).toEqual([]);
    expect(notations(g)).toContain('f1-h1');
  });

  it('when on: short f1-h1 with the Rook i1-g1, long f1-d1 with the Rook b1-e1', () => {
    const g = game('castling', { 'castling.enabled': true });
    expect(castles(g)).toEqual(['f1-d1/b1-e1', 'f1-h1/i1-g1']);
    // The plain King move to the same square is still a different move.
    expect(notations(g)).toContain('f1-h1');
    const short = play(g, 'f1-h1/i1-g1');
    expect(short.position.h1).toMatchObject({ piece: 'king', side: 'light', moved: true });
    expect(short.position.g1).toMatchObject({ piece: 'rook', side: 'light', moved: true });
    expect(short.position.i1).toBeUndefined();
    expect(short.position.f1).toBeUndefined();
    const long = play(g, 'f1-d1/b1-e1');
    expect(long.position.d1).toMatchObject({ piece: 'king' });
    expect(long.position.e1).toMatchObject({ piece: 'rook' });
    expect(long.position.b1).toBeUndefined();
  });

  it('works the same for dark (f9-h9 with i9-g9, f9-d9 with b9-e9)', () => {
    const f = at('castling');
    const g = newGame(rulesFor({ 'castling.enabled': true }), ID, {
      position: f.pieces,
      turn: 'dark',
    });
    expect(castles(g)).toEqual(['f9-d9/b9-e9', 'f9-h9/i9-g9']);
  });

  it('keeps the 2-square King move at every king.range option', () => {
    for (const range of [1, 2, 3, 4]) {
      const g = game('castling', { 'castling.enabled': true, 'king.range': range });
      expect(castles(g)).toEqual(['f1-d1/b1-e1', 'f1-h1/i1-g1']);
    }
  });

  const on = { 'castling.enabled': true };
  it('needs an unmoved Rook and an unmoved King', () => {
    expect(castles(game('castling', on, { i1: { piece: 'rook', side: 'light', moved: true } }))).toEqual([
      'f1-d1/b1-e1',
    ]);
    expect(castles(game('castling', on, { f1: { piece: 'king', side: 'light', moved: true } }))).toEqual(
      [],
    );
  });

  it('needs every square between King and Rook empty, even one the King does not cross', () => {
    expect(castles(game('castling', on, { c1: { piece: 'knight', side: 'light' } }))).toEqual([
      'f1-h1/i1-g1',
    ]);
  });

  it('is not allowed out of check, through an attacked square, or into check', () => {
    const rook = { piece: 'rook', side: 'dark', moved: true };
    expect(castles(game('castling', on, { f5: rook }))).toEqual([]);
    expect(castles(game('castling', on, { g5: rook }))).toEqual(['f1-d1/b1-e1']);
    expect(castles(game('castling', on, { h5: rook }))).toEqual(['f1-d1/b1-e1']);
    // Only the King's squares count: a Rook on c5 attacks c1, which the King never crosses.
    expect(castles(game('castling', on, { c5: rook }))).toEqual(['f1-d1/b1-e1', 'f1-h1/i1-g1']);
  });
});

describe('pawn-safe zones (pawn.safeZones)', () => {
  it('starting-file (default): safe on the opponent’s colored square of its own starting file', () => {
    const g = game('safe-zones');
    expect(notations(g)).not.toContain('b9xb8');
    expect(notations(g)).toContain('c9xc7');
    expect(notations(g)).toContain('d9xd4');
  });

  it('any-colored-square: safe on any colored square of the opponent’s half', () => {
    const g = game('safe-zones', { 'pawn.safeZones': 'any-colored-square' });
    expect(notations(g)).not.toContain('b9xb8');
    expect(notations(g)).not.toContain('c9xc7');
    expect(notations(g)).toContain('d9xd4');
  });

  it('off: every pawn can be captured', () => {
    const g = game('safe-zones', { 'pawn.safeZones': 'off' });
    expect(notations(g)).toEqual(expect.arrayContaining(['b9xb8', 'c9xc7', 'd9xd4']));
  });

  it('a safe pawn still gives check, and the King cannot take it', () => {
    for (const option of ['starting-file', 'any-colored-square']) {
      const g = game('safe-checker', { 'pawn.safeZones': option });
      expect(g.checkers).toEqual(['g7']);
      expect(notations(g)).not.toContain('f8xg7');
    }
    const off = game('safe-checker', { 'pawn.safeZones': 'off' });
    expect(off.checkers).toEqual(['g7']);
    expect(notations(off)).toContain('f8xg7');
  });

  it('a pawn from the start position knows its starting file', () => {
    const g = newGame(rulesFor(), ID);
    expect(g.position.b2).toMatchObject({ piece: 'pawn', side: 'light', home: 'b2' });
  });
});

describe('capture on the Coast (coast.2p.capturable)', () => {
  it('true (default): a Coast piece on the Coast can be captured', () => {
    expect(notations(game('coast-capture'))).toEqual(expect.arrayContaining(['a1xa4', 'c2xa4']));
  });

  it('false: a Coast piece on the Coast cannot be captured', () => {
    const g = game('coast-capture', { 'coast.2p.capturable': false });
    expect(notations(g)).not.toContain('a1xa4');
    expect(notations(g)).not.toContain('c2xa4');
    expect(notations(g)).toContain('a1-a3');
  });

  it('false still lets a Queen on the Coast be captured: she is not a Coast piece', () => {
    for (const option of [true, false]) {
      const g = game('coast-capture-queen', { 'coast.2p.capturable': option });
      expect(notations(g)).toContain('a9xa3');
    }
  });
});

describe('leaving the Coast (coast.2p.exit)', () => {
  it('any-legal-move (default): a Coast piece leaves from any Coast square', () => {
    const g = game('coast-exit');
    expect(notations(g)).toEqual(expect.arrayContaining(['a2-b3', 'a2-b1', 'a5-b4', 'a7-b7']));
  });

  it('a5-only: a Coast piece leaves only from A5, and still moves along the Coast', () => {
    const g = game('coast-exit', { 'coast.2p.exit': 'a5-only' });
    expect(notations(g).filter((n) => n.startsWith('a2-'))).toEqual([
      'a2-a1',
      'a2-a3',
      'a2-a4',
    ]);
    expect(notations(g)).toEqual(expect.arrayContaining(['a5-b4', 'a5-b6', 'a5-b5']));
    // A King on the Coast is not a Coast piece.
    expect(notations(g)).toContain('a7-b7');
  });

  it('a5-only: a Dragon Head on a1 attacks along the Coast only', () => {
    const g = game('coast-capture', { 'coast.2p.exit': 'a5-only' });
    expect(notations(g)).toContain('a1xa4');
    expect(notations(g)).not.toContain('a1-b2');
  });
});
