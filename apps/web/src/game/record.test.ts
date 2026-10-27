// The game record (S46): a game saved as JSON loads back and replays to the same result.
import { describe, expect, it } from 'vitest';
import {
  agreeDraw,
  playMove,
  resign,
  stateKey,
  timeLeft,
  toNotation,
  type GameState,
} from '@chess9s/engine';
import hotSeatMate from '../../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import { fromGame, isPaused, newModel, playFor, startTimed, tick } from './session';
import { controlById } from './timeControls';
import { createRulesFor, customInfo, findRuleset } from './rules';
import { openRecord, recordFile, recordJson } from './record';

const standard = findRuleset('standard-2p')!;

/** Play the first legal move `n` times. */
function played(game: GameState, n: number): GameState {
  for (let i = 0; i < n && game.result.status === 'ongoing'; i++) {
    game = playMove(game, game.legal[0]!);
  }
  return game;
}

const fresh = () => newModel(createRulesFor(standard), standard).game;

describe('game record', () => {
  it('holds the ruleset, turn order, moves, result and date, and no names', () => {
    const game = played(fresh(), 6);
    const saved = JSON.parse(recordJson(game, '2026-10-25'));
    expect(saved.ruleset).toEqual({ id: 'standard-2p', version: standard.version });
    expect(saved.turnOrder).toEqual(game.order);
    expect(saved.moves).toEqual(game.moves.map((m) => m.notation));
    expect(saved.result).toEqual({ status: 'ongoing' });
    expect(saved.date).toBe('2026-10-25');
    expect(Object.keys(saved).sort()).toEqual(
      ['date', 'format', 'moves', 'players', 'result', 'ruleset', 'turnOrder', 'v'].sort(),
    );
  });

  it('loads back and replays move for move to the same position and result', () => {
    const game = played(fresh(), 40);
    const opened = openRecord(recordJson(game, '2026-10-25'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.info.id).toBe('standard-2p');
    expect(opened.date).toBe('2026-10-25');
    expect(opened.game.moves.map((m) => m.notation)).toEqual(game.moves.map((m) => m.notation));
    expect(opened.game.position).toEqual(game.position);
    expect(opened.game.result).toEqual(game.result);
    expect(opened.game.turn).toBe(game.turn);
  });

  it('replays a game that ended', () => {
    // Fool's-mate style: play random-ish legal moves until the game ends or a cap.
    let game = fresh();
    for (let i = 0; i < 600 && game.result.status === 'ongoing'; i++) {
      game = playMove(game, game.legal[(i * 7) % game.legal.length]!);
    }
    const opened = openRecord(recordJson(game, '2026-10-25'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.game.result).toEqual(game.result);
  });

  it('keeps a custom ruleset’s overrides and replays on them', () => {
    const custom = customInfo({ id: 'mine', name: 'Mine', overrides: { 'king.range': 2 } });
    const game = played(newModel(createRulesFor(custom), custom).game, 4);
    const saved = JSON.parse(recordJson(game, '2026-10-25'));
    expect(saved.ruleset.overrides).toEqual({ 'king.range': 2 });
    const opened = openRecord(recordJson(game, '2026-10-25'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.info.custom).toBe(true);
    expect(opened.info.overrides).toEqual({ 'king.range': 2 });
    expect(opened.game.position).toEqual(game.position);
  });

  it('refuses what is not a record, with a reason', () => {
    const good = JSON.parse(recordJson(played(fresh(), 4), '2026-10-25'));
    const bad = (patch: object | string) =>
      openRecord(typeof patch === 'string' ? patch : JSON.stringify({ ...good, ...patch }));
    for (const input of [
      bad('not json'),
      bad('[]'),
      bad({ format: 'other' }),
      bad({ v: 2 }),
      bad({ moves: 'e2-e4' }),
      bad({ moves: ['a1-a9'] }),
      bad({ ruleset: { id: 'nope-2p', version: '1.0.0' } }),
      bad({ ruleset: { id: 'standard-2p', version: '0.0.1' } }),
      bad({ turnOrder: ['black', 'white'] }),
      bad({ result: { status: 'draw', reason: 'repetition' } }),
      bad({ date: 'yesterday' }),
    ]) {
      expect(input.ok).toBe(false);
      if (!input.ok) expect(input.problem.length).toBeGreaterThan(5);
    }
  });

  it('keeps a resignation and a draw by agreement (S51), and replays them', () => {
    for (const game of [resign(played(fresh(), 7), 'light'), agreeDraw(played(fresh(), 10))]) {
      const text = recordJson(game, '2026-10-27');
      expect(JSON.parse(text).v).toBe(1);
      const opened = openRecord(text);
      if (!opened.ok) throw new Error(opened.problem);
      expect(opened.game.result).toEqual(game.result);
      expect(stateKey(opened.game)).toBe(stateKey(game));
    }
  });

  it('refuses a resignation or agreement that the moves do not allow', () => {
    const resigned = JSON.parse(recordJson(resign(played(fresh(), 3), 'dark'), '2026-10-27'));
    const bad = (patch: object) => openRecord(JSON.stringify({ ...resigned, ...patch }));
    // A seat the game does not have.
    expect(
      bad({ result: { status: 'win', winner: 'light', loser: 'dragon', reason: 'resignation' } })
        .ok,
    ).toBe(false);
    // The winner must be the other seat.
    expect(
      bad({ result: { status: 'win', winner: 'dark', loser: 'dark', reason: 'resignation' } }).ok,
    ).toBe(false);
    // A game that ended on the board cannot also have been resigned or agreed.
    const draft = findRuleset('draft-2p', hotSeatMate.ruleset.version)!;
    let ended = newModel(createRulesFor(draft), draft).game;
    for (const n of hotSeatMate.moves) {
      ended = playMove(
        ended,
        ended.legal.find((m) => toNotation(m) === n)!,
      );
    }
    expect(ended.result.status).toBe('win');
    const over = JSON.parse(recordJson(ended, '2026-10-27'));
    expect(openRecord(JSON.stringify(over)).ok).toBe(true);
    const agreed = { ...over, result: { status: 'draw', reason: 'agreement' } };
    expect(openRecord(JSON.stringify(agreed)).ok).toBe(false);
    const result = { status: 'win', winner: 'dark', loser: 'light', reason: 'resignation' };
    expect(openRecord(JSON.stringify({ ...over, result })).ok).toBe(false);
  });

  it('names the file after the ruleset and the date', () => {
    expect(recordFile(standard, '2026-10-25')).toBe('chess9s-standard-2p-2026-10-25.json');
  });
});

describe('a 3-player record with resignations (S67)', () => {
  const three = findRuleset('standard-3p')!;
  const start = () => newModel(createRulesFor(three), three).game;

  it('opens and replays to the same game, resignations in their place', () => {
    let game = played(start(), 2);
    game = resign(game, 'light');
    game = played(game, 3);
    game = resign(game, 'dark');
    const text = recordJson(game, '2026-10-27');
    expect(JSON.parse(text).resignations).toEqual([
      { side: 'light', after: 2 },
      { side: 'dark', after: 5 },
    ]);
    const opened = openRecord(text);
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.game.result).toEqual(game.result);
    expect(stateKey(opened.game)).toBe(stateKey(game));
    expect(opened.game.resignations).toEqual(game.resignations);
  });

  it('opens a game that is still going after a resignation', () => {
    const game = played(resign(played(start(), 1), 'dragon'), 4);
    const opened = openRecord(recordJson(game, '2026-10-27'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.game.result).toEqual({ status: 'ongoing' });
    expect(opened.game.seats.dragon).toBe('out');
    expect(stateKey(opened.game)).toBe(stateKey(game));
  });

  it('refuses resignations the record cannot replay, or that its result does not match', () => {
    const game = played(resign(played(start(), 1), 'light'), 2);
    const saved = JSON.parse(recordJson(game, '2026-10-27'));
    const bad = (patch: object) => openRecord(JSON.stringify({ ...saved, ...patch })).ok;
    expect(bad({})).toBe(true);
    expect(bad({ resignations: [] })).toBe(false);
    expect(
      bad({
        resignations: [
          { side: 'light', after: 1 },
          { side: 'light', after: 2 },
        ],
      }),
    ).toBe(false);
    expect(bad({ resignations: [{ side: 'nobody', after: 1 }] })).toBe(false);
    expect(bad({ resignations: [{ side: 'light', after: 99 }] })).toBe(false);
    expect(bad({ resignations: 'light' })).toBe(false);
  });
});

describe('a record with a clock (S65)', () => {
  const S = 1000;
  const timedModel = (control = '3+2', showOnly = false) => {
    let m = startTimed(
      newModel(createRulesFor(standard), standard),
      controlById(control)!,
      showOnly,
      0,
    );
    m = playFor(m, m.game.legal[0]!, 10 * S);
    m = playFor(m, m.game.legal[0]!, 14 * S);
    return m;
  };

  it('carries the time control, Show only and each seat’s time left after each move', () => {
    const m = timedModel('3+2', true);
    const saved = JSON.parse(recordJson(m.game, '2026-10-27', m.timed));
    expect(saved.v).toBe(1);
    expect(saved.timeControl).toBe('3+2');
    expect(saved.showOnly).toBe(true);
    expect(saved.timeLeft).toEqual(m.timed!.lefts);
    expect(saved.timeLeft).toHaveLength(2);
  });

  it('leaves the fields out for an untimed game, so old records and new ones look alike', () => {
    const game = played(fresh(), 3);
    const saved = JSON.parse(recordJson(game, '2026-10-27', null));
    expect(Object.keys(saved)).not.toContain('timeControl');
    expect(Object.keys(saved)).not.toContain('showOnly');
    expect(Object.keys(saved)).not.toContain('timeLeft');
    expect(recordJson(game, '2026-10-27')).toBe(recordJson(game, '2026-10-27', null));
  });

  it('opens with the clock back, paused, at the last time left', () => {
    const m = timedModel();
    const opened = openRecord(recordJson(m.game, '2026-10-27', m.timed));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.game.moves).toHaveLength(2);
    const timed = opened.timed!;
    expect(timed.control.id).toBe('3+2');
    expect(timed.lefts).toEqual(m.timed!.lefts);
    expect(isPaused(fromGame(opened.game, timed))).toBe(true);
    const last = m.timed!.lefts.at(-1)!;
    for (const side of m.game.order) expect(timeLeft(timed.clock, side, 999 * S)).toBe(last[side]);
  });

  it('opens a record with no clock, as before', () => {
    const opened = openRecord(recordJson(played(fresh(), 4), '2026-10-27'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.timed).toBeNull();
  });

  it('opens a game with no moves yet at the full time', () => {
    const m = startTimed(
      newModel(createRulesFor(standard), standard),
      controlById('5+3')!,
      false,
      0,
    );
    const opened = openRecord(recordJson(m.game, '2026-10-27', m.timed));
    if (!opened.ok) throw new Error(opened.problem);
    expect(timeLeft(opened.timed!.clock, m.game.turn, 999 * S)).toBe(300 * S);
  });

  it('replays a game that ended on time, with the seat out of time at zero', () => {
    const m = tick(timedModel('1+0'), 100 * S);
    expect(m.game.result).toMatchObject({ reason: 'timeout' });
    const opened = openRecord(recordJson(m.game, '2026-10-27', m.timed));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.game.result).toEqual(m.game.result);
    const result = m.game.result;
    if (result.status !== 'win') throw new Error('expected a win');
    expect(timeLeft(opened.timed!.clock, result.loser, 999 * S)).toBe(0);
  });

  it('replays a 3-player game with a seat out of time, in its place', () => {
    const info = findRuleset('standard-3p')!;
    let m = startTimed(newModel(createRulesFor(info), info), controlById('move30s')!, false, 0);
    m = tick(m, 30 * S);
    m = playFor(m, m.game.legal[0]!, 35 * S);
    const text = recordJson(m.game, '2026-10-27', m.timed);
    expect(JSON.parse(text).resignations).toEqual([{ side: 'dark', after: 0, timeout: true }]);
    const opened = openRecord(text);
    if (!opened.ok) throw new Error(opened.problem);
    expect(stateKey(opened.game)).toBe(stateKey(m.game));
    expect(opened.timed!.clock.out).toEqual(['dark']);
  });

  it('refuses a clock that does not fit the game, and a time out the moves do not allow', () => {
    const m = timedModel();
    const good = JSON.parse(recordJson(m.game, '2026-10-27', m.timed));
    const bad = (patch: object) => openRecord(JSON.stringify({ ...good, ...patch }));
    expect(bad({}).ok).toBe(true);
    expect(bad({ timeLeft: [] }).ok).toBe(false);
    expect(bad({ timeLeft: 'lots' }).ok).toBe(false);
    expect(bad({ showOnly: 'yes' }).ok).toBe(false);
    expect(bad({ timeControl: 7 }).ok).toBe(false);
    // An unknown control opens as an untimed game.
    const unknown = bad({ timeControl: 'move9y' });
    expect(unknown.ok).toBe(true);
    if (unknown.ok) expect(unknown.timed).toBeNull();
    const timeout = { status: 'win', winner: 'dark', loser: 'light', reason: 'timeout' };
    const ended = timedModel();
    const flagged = JSON.parse(recordJson(tick(ended, 999 * S).game, '2026-10-27', null));
    expect(openRecord(JSON.stringify(flagged)).ok).toBe(true);
    expect(
      openRecord(
        JSON.stringify({ ...flagged, result: { ...timeout, winner: 'light', loser: 'light' } }),
      ).ok,
    ).toBe(false);
    expect(
      openRecord(
        JSON.stringify({
          ...flagged,
          result: { status: 'draw', reason: 'timeout-insufficient-material' },
        }),
      ).ok,
    ).toBe(false);
  });
});
