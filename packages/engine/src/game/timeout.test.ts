// S65: running out of time (D66, decision 0017): the seat is out. In 2-player games it loses, or
// draws when the other player could not checkmate with what it has left; in 3-player games the
// seat's side turns to stone and the others play on, and in the duel it loses; Easy Start
// (first checkmate) plays on with the seats left. Positions are data.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../../test/fixtures/positions/special-rules.json';
import { toNotation, type MoveRules, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { RulesError, resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import {
  endedBy,
  gameRecord,
  newGame,
  playMove,
  replayResignations,
  resign,
  timeOut,
  type GameState,
} from './game';

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

const two = (name: keyof typeof fixture.positions): GameState => {
  const base = read('rules/rulesets/draft-2p.json') as Ruleset;
  const rules: MoveRules = { ...set, values: resolveRuleset(registry, base).values, players: 2 };
  const f = fixture.positions[name] as { turn: string; coastOpen?: boolean; pieces: Position };
  return newGame(
    rules,
    { id: 'draft-2p', version: base.version },
    { position: f.pieces, turn: f.turn, coastOpen: f.coastOpen ?? false },
  );
};

const three = (id = 'standard-3p'): GameState => {
  const base = read(`rules/rulesets/${id}.json`) as Ruleset;
  const rules: MoveRules = { ...set, values: resolveRuleset(registry, base).values, players: 3 };
  return newGame(rules, { id, version: base.version });
};

const stones = (g: GameState, side: string) =>
  Object.values(g.position).filter((p) => p.side === side);

describe('2 players', () => {
  it('the seat out of time loses', () => {
    const g = timeOut(two('rooks'), 'dark');
    expect(g.result).toEqual({ status: 'win', winner: 'light', loser: 'dark', reason: 'timeout' });
    expect(g.legal).toEqual([]);
  });

  it('loses for either seat', () => {
    expect(timeOut(two('rooks'), 'light').result).toEqual({
      status: 'win',
      winner: 'dark',
      loser: 'light',
      reason: 'timeout',
    });
  });

  it('is a draw when the other player could not checkmate with what it has left', () => {
    // Light has a Dragon Head, dark only its King: dark cannot give check, so dark's flag is a
    // win for light but light's flag is a draw.
    expect(timeOut(two('kings-and-head'), 'dark').result).toMatchObject({
      status: 'win',
      winner: 'light',
      reason: 'timeout',
    });
    expect(timeOut(two('kings-and-head'), 'light').result).toEqual({
      status: 'draw',
      reason: 'timeout-insufficient-material',
    });
  });

  it('ignores what the out-of-time player has left', () => {
    // Only the winner's pieces count: dark has a rook, so light's flag loses.
    expect(timeOut(two('last-capture'), 'light').result).toMatchObject({
      status: 'win',
      winner: 'dark',
    });
  });

  it('refuses a game that is over and a seat that has none', () => {
    const over = timeOut(two('rooks'), 'dark');
    expect(() => timeOut(over, 'light')).toThrow(RulesError);
    expect(() => timeOut(two('rooks'), 'dragon')).toThrow(RulesError);
  });

  it('is recorded as a result a record can replay', () => {
    const g = two('rooks');
    const ended = timeOut(g, 'dark');
    const replayed = endedBy(g, ended.result);
    expect(replayed?.result).toEqual(ended.result);
    const drawn = timeOut(two('kings-and-head'), 'light');
    expect(endedBy(two('kings-and-head'), drawn.result)?.result).toEqual(drawn.result);
    expect(gameRecord(ended).result).toEqual(ended.result);
  });

  it('a record cannot claim a time out the position does not give', () => {
    const g = two('kings-and-head');
    expect(
      endedBy(g, { status: 'win', winner: 'dark', loser: 'light', reason: 'timeout' }),
    ).toBeNull();
    expect(endedBy(g, { status: 'draw', reason: 'timeout-insufficient-material' })).not.toBeNull();
    expect(
      endedBy(two('rooks'), { status: 'draw', reason: 'timeout-insufficient-material' }),
    ).toBeNull();
  });
});

describe('3 players, full rules (Standard)', () => {
  it('a Kinged player out of time is out: its King leaves and its other pieces turn to stone', () => {
    const g = timeOut(three(), 'light');
    expect(g.seats).toEqual({ dark: 'active', light: 'out', dragon: 'active' });
    expect(g.result).toEqual({ status: 'ongoing' });
    const left = stones(g, 'light');
    expect(left.length).toBeGreaterThan(0);
    expect(left.every((p) => p.stone === true)).toBe(true);
    expect(left.some((p) => p.piece === 'king')).toBe(false);
  });

  it('gives the same position as a resignation, and passes the turn on if it was the seat to move', () => {
    const g0 = three();
    const t = timeOut(g0, 'dark');
    const r = resign(g0, 'dark');
    expect(t.position).toEqual(r.position);
    expect(t.seats).toEqual(r.seats);
    expect(t.turn).toBe('light');
  });

  it('the Dragon out of time is out: all its pieces, the Tail too, turn to stone', () => {
    const g = timeOut(three(), 'dragon');
    expect(g.seats).toEqual({ dark: 'active', light: 'active', dragon: 'out' });
    expect(g.result).toEqual({ status: 'ongoing' });
    expect(stones(g, 'dragon').every((p) => p.stone === true)).toBe(true);
    expect(g.turn).toBe('dark');
  });

  it('in the duel, the Kinged player out of time loses to the Dragon', () => {
    const g = timeOut(timeOut(three(), 'light'), 'dark');
    expect(g.result).toEqual({
      status: 'win',
      winner: 'dragon',
      loser: 'dark',
      reason: 'timeout',
    });
    expect(g.legal).toEqual([]);
  });

  it('in the duel, the Dragon out of time loses to the Kinged player', () => {
    const g = timeOut(timeOut(three(), 'light'), 'dragon');
    expect(g.result).toEqual({
      status: 'win',
      winner: 'dark',
      loser: 'dragon',
      reason: 'timeout',
    });
  });

  it('with the Dragon already out, a Kinged player out of time loses to the other', () => {
    const g = timeOut(timeOut(three(), 'dragon'), 'dark');
    expect(g.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'timeout',
    });
  });

  it('is told apart from a resignation in the record, with the moves played before it', () => {
    let g = three();
    g = playMove(g, g.legal[0]!);
    g = timeOut(g, 'light');
    g = resign(g, 'dragon');
    expect(g.resignations).toEqual([
      { side: 'light', after: 1, timeout: true },
      { side: 'dragon', after: 1 },
    ]);
    expect(gameRecord(g).resignations).toEqual(g.resignations);
  });

  it('replays from a record', () => {
    let g = timeOut(three(), 'light');
    g = playMove(g, g.legal[0]!);
    g = timeOut(g, 'dragon');
    const replayed = replayResignations(
      replayResignations(three(), g.resignations.slice(0, 1)),
      g.resignations,
    );
    expect(replayed.resignations).toEqual(g.resignations.slice(0, 1));
    let h = replayResignations(three(), g.resignations);
    h = playMove(
      h,
      h.legal.find((m) => toNotation(m) === g.moves[0]!.notation)!,
    );
    h = replayResignations(h, g.resignations);
    expect(h.resignations).toEqual(g.resignations);
    expect(h.seats).toEqual(g.seats);
  });

  it('refuses a seat that is already out', () => {
    expect(() => timeOut(timeOut(three(), 'light'), 'light')).toThrow(RulesError);
  });
});

describe('3 players, first checkmate (Easy Start)', () => {
  it('the seat out of time is out and the other two play on', () => {
    const g = timeOut(three('easy-3p'), 'light');
    expect(g.seats.light).toBe('out');
    expect(g.result).toEqual({ status: 'ongoing' });
    expect(g.legal.length).toBeGreaterThan(0);
    expect(stones(g, 'light').every((p) => p.stone === true)).toBe(true);
  });

  it('the Dragon out of time is out and the Kinged players play on', () => {
    const g = timeOut(three('easy-3p'), 'dragon');
    expect(g.seats.dragon).toBe('out');
    expect(g.result).toEqual({ status: 'ongoing' });
  });

  it('when only one player is left, that player wins', () => {
    const g = timeOut(timeOut(three('easy-3p'), 'light'), 'dark');
    expect(g.result).toMatchObject({ status: 'win', winner: 'dragon', reason: 'timeout' });
    const h = timeOut(timeOut(three('easy-3p'), 'dragon'), 'dark');
    expect(h.result).toMatchObject({ status: 'win', winner: 'light', reason: 'timeout' });
  });
});
