// S67: resigning in a 3-player game (decision 0018): each row of its table, the turn passing on,
// the draw seats following, Easy Start, and the record of a game with a resignation in it.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toNotation, type MoveRules } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { RulesError, resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import {
  agreeDraw,
  endedBy,
  gameRecord,
  newGame,
  playMove,
  replayResignations,
  resign,
  type GameState,
} from './game';
import type { Seats } from './three';

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

function start(id = 'standard-3p', seats?: Seats): GameState {
  const base = read(`rules/rulesets/${id}.json`) as Ruleset;
  const rules: MoveRules = { ...set, values: resolveRuleset(registry, base).values, players: 3 };
  return newGame(rules, { id, version: base.version }, seats ? { seats } : {});
}

const play = (g: GameState, notation: string): GameState => {
  const move = g.legal.find((m) => toNotation(m) === notation);
  if (!move) throw new Error(`${notation} is not legal for ${g.turn}: ${g.legal.map(toNotation)}`);
  return playMove(g, move);
};

const piecesOf = (g: GameState, side: string) =>
  Object.values(g.position).filter((p) => p.side === side);

describe('a Kinged player resigns with both Kings on the board', () => {
  const g0 = start();
  const g = resign(g0, 'light');

  it('is out: its King leaves the board and its other pieces turn to stone; no result yet', () => {
    expect(g.seats).toEqual({ dark: 'active', light: 'out', dragon: 'active' });
    expect(g.result).toEqual({ status: 'ongoing' });
    const left = piecesOf(g, 'light');
    expect(left.length).toBeGreaterThan(0);
    expect(left.every((p) => p.stone === true)).toBe(true);
    expect(left.some((p) => p.piece === 'king')).toBe(false);
    expect(g.legal.length).toBeGreaterThan(0);
  });

  it('keeps the turn when the resigning seat is not the one to move', () => {
    expect(g0.turn).toBe('dark');
    expect(g.turn).toBe('dark');
  });

  it('passes the turn on when the resigning seat is the one to move', () => {
    const r = resign(g0, 'dark');
    expect(r.seats.dark).toBe('out');
    expect(r.turn).toBe('light');
  });

  it('skips the seat from then on: the duel is between the other Kinged player and the Dragon', () => {
    let h = g;
    const turns: string[] = [];
    for (let i = 0; i < 4; i++) {
      turns.push(h.turn);
      h = playMove(h, h.legal[0]!);
    }
    expect(turns).toEqual(['dark', 'dragon', 'dark', 'dragon']);
  });

  it('remembers the resignation for the record, with the number of moves played before it', () => {
    expect(g.resignations).toEqual([{ side: 'light', after: 0 }]);
    const later = resign(play(g0, g0.legal.map(toNotation)[0]!), 'dragon');
    expect(later.resignations).toEqual([{ side: 'dragon', after: 1 }]);
  });
});

describe('the last Kinged player resigns in the duel', () => {
  it('the Dragon wins', () => {
    const r = resign(resign(start(), 'light'), 'dark');
    expect(r.result).toEqual({
      status: 'win',
      winner: 'dragon',
      loser: 'dark',
      reason: 'resignation',
    });
    expect(r.legal).toEqual([]);
    expect(() => playMove(r, start().legal[0]!)).toThrow(RulesError);
  });
});

describe('the Dragon resigns', () => {
  it('in the duel, the last Kinged player wins', () => {
    const r = resign(resign(start(), 'light'), 'dragon');
    expect(r.result).toEqual({
      status: 'win',
      winner: 'dark',
      loser: 'dragon',
      reason: 'resignation',
    });
  });

  it('with both Kings on the board, it is out: all its pieces, the Tail included, turn to stone', () => {
    const r = resign(start(), 'dragon');
    expect(r.seats).toEqual({ dark: 'active', light: 'active', dragon: 'out' });
    expect(r.result).toEqual({ status: 'ongoing' });
    const left = piecesOf(r, 'dragon');
    expect(left.some((p) => p.piece === 'dragon-tail')).toBe(true);
    expect(left.every((p) => p.stone === true)).toBe(true);
    expect(r.turn).toBe('dark');
  });

  it('passes the turn on when the Dragon was to move, and the Kinged players play on', () => {
    let g = start();
    for (let i = 0; i < 2; i++) g = playMove(g, g.legal[0]!);
    expect(g.turn).toBe('dragon');
    const r = resign(g, 'dragon');
    expect(r.turn).toBe('dark');
    const next = playMove(r, r.legal[0]!);
    expect(next.turn).toBe('light');
    expect(playMove(next, next.legal[0]!).turn).toBe('dark');
  });

  it('with the Tail already in stone, it is out the same way', () => {
    const r = resign(
      start('standard-3p', { dark: 'active', light: 'active', dragon: 'tail-stone' }),
      'dragon',
    );
    expect(r.seats.dragon).toBe('out');
    expect(r.result).toEqual({ status: 'ongoing' });
  });

  it('once out, a Kinged player who resigns loses to the other Kinged player (2-player end rules)', () => {
    const r = resign(resign(start(), 'dragon'), 'dark');
    expect(r.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'resignation',
    });
  });
});

describe('refusals', () => {
  it('a seat that is already out cannot resign', () => {
    const g = resign(start(), 'light');
    expect(() => resign(g, 'light')).toThrow(RulesError);
    expect(() => resign(resign(start(), 'dragon'), 'dragon')).toThrow(RulesError);
  });

  it('a seat the game lacks, and a game that is over', () => {
    expect(() => resign(start(), 'nobody')).toThrow(RulesError);
    expect(() => resign(resign(resign(start(), 'light'), 'dark'), 'dragon')).toThrow(RulesError);
  });

  it('agreed draws stay refused with three seats', () => {
    expect(() => agreeDraw(start())).toThrow(RulesError);
  });
});

describe('the draw seats follow the seats still in the game', () => {
  /** A quiet game: no captures and no pawn moves, so the fifty-move rule or repetition ends it. */
  function quiet(g: GameState): GameState {
    let x = 12345;
    const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647;
    while (g.result.status === 'ongoing' && g.moves.length < 1200) {
      const calm = g.legal.filter(
        (m) => m.capture === undefined && g.rules.pieces[m.piece]?.irreversible !== true,
      );
      const pool = calm.length > 0 ? calm : g.legal;
      g = playMove(g, pool[Math.floor(rnd() * pool.length)]!);
    }
    return g;
  }

  it('after a Kinged player resigns, a draw is between the Dragon and the other Kinged player', () => {
    const g = quiet(resign(start(), 'light'));
    expect(g.result).toMatchObject({ status: 'draw', between: ['dark', 'dragon'] });
  });

  it('after the Dragon resigns, a draw is between the Kinged players', () => {
    const g = quiet(resign(start(), 'dragon'));
    expect(g.result).toMatchObject({ status: 'draw', between: ['dark', 'light'] });
  });
});

describe('Easy Start (provisional, decision 0018)', () => {
  it('a resigning Kinged player turns to stone, the only place stones appear in that preset', () => {
    const g = start('easy-3p');
    expect(Object.values(g.position).some((p) => p.stone === true)).toBe(false);
    const r = resign(g, 'light');
    expect(r.seats.light).toBe('out');
    expect(piecesOf(r, 'light').every((p) => p.stone === true)).toBe(true);
    expect(r.result).toEqual({ status: 'ongoing' });
  });

  it('the last Kinged player resigning gives the Dragon the win; the Dragon resigning gives the last one', () => {
    expect(resign(resign(start('easy-3p'), 'light'), 'dark').result).toMatchObject({
      winner: 'dragon',
      loser: 'dark',
      reason: 'resignation',
    });
    expect(resign(resign(start('easy-3p'), 'light'), 'dragon').result).toMatchObject({
      winner: 'dark',
      loser: 'dragon',
      reason: 'resignation',
    });
  });

  it('the Dragon resigning with both Kings in: its pieces and Tail turn to stone, the Kinged players play on', () => {
    const r = resign(start('easy-3p'), 'dragon');
    expect(r.seats.dragon).toBe('out');
    expect(piecesOf(r, 'dragon').every((p) => p.stone === true)).toBe(true);
    expect(r.legal.length).toBeGreaterThan(0);
  });
});

describe('the record of a game with a resignation', () => {
  const ID = start().ruleset;

  /** Replays a record the way a screen loads it. */
  function replay(record: ReturnType<typeof gameRecord>): GameState | null {
    let g = start();
    const list = record.resignations ?? [];
    g = replayResignations(g, list);
    for (const notation of record.moves) {
      const move = g.legal.find((m) => toNotation(m) === notation);
      if (!move) return null;
      g = replayResignations(playMove(g, move), list);
    }
    return endedBy(g, record.result) ?? g;
  }

  it('keeps who resigned and when, and a replay gives the same game', () => {
    let g = start();
    g = playMove(g, g.legal[0]!);
    g = resign(g, 'light');
    g = playMove(g, g.legal[0]!);
    g = playMove(g, g.legal[0]!);
    g = resign(g, 'dark');
    const record = gameRecord(g);
    expect(record.ruleset).toEqual(ID);
    expect(record.resignations).toEqual([
      { side: 'light', after: 1 },
      { side: 'dark', after: 3 },
    ]);
    expect(record.result).toMatchObject({ winner: 'dragon', loser: 'dark', reason: 'resignation' });
    const back = replay(JSON.parse(JSON.stringify(record)));
    expect(back?.result).toEqual(g.result);
    expect(back?.resignations).toEqual(g.resignations);
    expect(back?.position).toEqual(g.position);
  });

  it('a game without a resignation has no resignations in its record', () => {
    expect('resignations' in gameRecord(start())).toBe(false);
  });

  it('endedBy applies a final resignation, and refuses one that is not the recorded winner', () => {
    const resigned = {
      status: 'win',
      winner: 'dragon',
      loser: 'dark',
      reason: 'resignation',
    } as const;
    const g = resign(start(), 'light');
    expect(endedBy(g, resigned)?.result).toEqual(resigned);
    expect(endedBy(g, { ...resigned, winner: 'light' })).toBeNull();
    expect(endedBy(start(), { ...resigned, loser: 'light' })).toBeNull();
    expect(endedBy(g, { status: 'draw', reason: 'agreement' })).toBeNull();
  });

  it('replayResignations refuses a resignation by a seat that is out', () => {
    const g = resign(start(), 'light');
    expect(() =>
      replayResignations(g, [
        { side: 'light', after: 0 },
        { side: 'light', after: 0 },
      ]),
    ).toThrow(RulesError);
  });
});
