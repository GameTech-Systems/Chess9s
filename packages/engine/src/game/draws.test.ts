// S22a: the 2-player draws besides stalemate: insufficient material (draw.insufficientMaterial),
// the fifty-move rule (draw.fiftyMove) and threefold repetition (draw.threefoldRepetition), each
// at its default and every option. Tail moves count as moves (docs/RULES.md). Positions are data.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../../test/fixtures/positions/special-rules.json';
import { toNotation, type MoveRules, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry } from '../rules/loader';
import { newGame, playMove, type GameState } from './game';

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
function game(name: Name, overrides: Record<string, unknown> = {}): GameState {
  const f = fixture.positions[name] as { turn: string; coastOpen?: boolean; pieces: Position };
  return newGame(rulesFor(overrides), ID, {
    position: f.pieces,
    turn: f.turn,
    coastOpen: f.coastOpen ?? false,
  });
}

function play(g: GameState, notation: string): GameState {
  const move = g.legal.find((m) => toNotation(m) === notation);
  if (!move)
    throw new Error(
      `${notation} is not legal for ${g.turn} after ${g.moves.length} (${JSON.stringify(g.result)})`,
    );
  return playMove(g, move);
}
const playAll = (g: GameState, moves: string[]) => moves.reduce(play, g);
const repeat = (moves: string[], times: number) =>
  Array.from({ length: times }, () => moves).flat();

const ongoing = { status: 'ongoing' };
const draw = (reason: string) => ({ status: 'draw', reason });

describe('insufficient material (draw.insufficientMaterial)', () => {
  it('true (default): bare Kings are a draw at once; the Tail never gives check', () => {
    const g = game('bare-kings');
    expect(g.result).toEqual(draw('insufficient-material'));
    expect(g.legal).toEqual([]);
  });

  it('false: bare Kings play on', () => {
    expect(game('bare-kings', { 'draw.insufficientMaterial': false }).result).toEqual(ongoing);
  });

  it('a piece that can give check is enough material', () => {
    expect(game('kings-and-head').result).toEqual(ongoing);
  });

  it('a piece that cannot give check is not (coastPieces.2p.giveCheck off)', () => {
    const g = game('kings-and-head', { 'coastPieces.2p.giveCheck': false });
    expect(g.result).toEqual(draw('insufficient-material'));
  });

  it('a capture that leaves bare Kings ends the game', () => {
    expect(play(game('last-capture'), 'f1xf2').result).toEqual(draw('insufficient-material'));
    const on = play(game('last-capture', { 'draw.insufficientMaterial': false }), 'f1xf2');
    expect(on.result).toEqual(ongoing);
  });
});

describe('the fifty-move rule (draw.fiftyMove)', () => {
  const shuffle = ['i9-i8', 'b1-b2', 'i8-i9', 'b2-b1'];
  const noRepetition = { 'draw.threefoldRepetition': false };

  it('true (default): 50 moves by each side with no capture or pawn move is a draw', () => {
    const g = playAll(game('rooks', noRepetition), repeat(shuffle, 25).slice(0, 99));
    expect(g.result).toEqual(ongoing);
    expect(g.quiet).toBe(99);
    expect(play(g, 'b2-b1').result).toEqual(draw('fifty-move'));
  });

  it('false: play goes on', () => {
    const off = { ...noRepetition, 'draw.fiftyMove': false };
    expect(playAll(game('rooks', off), repeat(shuffle, 30)).result).toEqual(ongoing);
  });

  it('a pawn move starts the count again', () => {
    const after = ['i8-i9', 'b1-b2', 'i9-i8', 'b2-b1'];
    const moves = [...repeat(shuffle, 10), 'i9-i8', 'c2-c3', ...repeat(after, 15)];
    const g = playAll(game('rooks', noRepetition), moves);
    expect(g.quiet).toBe(60);
    expect(g.result).toEqual(ongoing);
  });

  it('a capture starts the count again', () => {
    const g = play(game('last-capture', { 'draw.insufficientMaterial': false }), 'f1xf2');
    expect(g.quiet).toBe(0);
  });

  it('a Tail move counts as a move and does not start the count again', () => {
    const g = play(newGame(rulesFor(), ID), 'a5-e5');
    expect(g.quiet).toBe(1);
    expect(play(g, 'b2-b4').quiet).toBe(0);
  });
});

describe('threefold repetition (draw.threefoldRepetition)', () => {
  const knights = ['c9-b7', 'c1-b3', 'b7-c9', 'b3-c1'];

  it('true (default): the same position a third time, same side to move, is a draw', () => {
    const g = playAll(newGame(rulesFor(), ID), repeat(knights, 2).slice(0, 7));
    expect(g.result).toEqual(ongoing);
    expect(play(g, 'b3-c1').result).toEqual(draw('repetition'));
  });

  it('false: play goes on', () => {
    const g = playAll(
      newGame(rulesFor({ 'draw.threefoldRepetition': false }), ID),
      repeat(knights, 3),
    );
    expect(g.result).toEqual(ongoing);
  });

  it('a lost castling right makes the start a different position', () => {
    const kings = ['f1-g1', 'f9-g9', 'g1-f1', 'g9-f9'];
    const turn = { turn: 'light' } as const;
    const position = fixture.positions.castling.pieces as Position;
    const off = playAll(newGame(rulesFor(), ID, { position, ...turn }), repeat(kings, 2));
    expect(off.result).toEqual(draw('repetition'));
    const on = newGame(rulesFor({ 'castling.enabled': true }), ID, { position, ...turn });
    // The start does not come back; the position after f1-g1, f9-g9 does, a third time at ply 10.
    expect(playAll(on, repeat(kings, 2)).result).toEqual(ongoing);
    expect(playAll(on, [...repeat(kings, 2), 'f1-g1', 'f9-g9']).result).toEqual(draw('repetition'));
  });
});
