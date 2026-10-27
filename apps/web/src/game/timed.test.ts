// S65: time controls in a hot-seat game (decision 0017): the clock on the session model, the
// flag fall (D66) in 2 and 3 players, Show only, pause, undo off while a clock is on, and the
// saved form the guest game and the game record keep. Time is passed in, never read.
import { describe, expect, it } from 'vitest';
import { newGame, timeLeft, type Position } from '@chess9s/engine';
import fixture from '../../../../packages/engine/test/fixtures/positions/special-rules.json';
import {
  canUndo,
  clockLines,
  click,
  fromGame,
  isPaused,
  newModel,
  pauseTimed,
  playFor,
  resignFor,
  resumeTimed,
  startTimed,
  tick,
  undo,
  type Model,
} from './session';
import { timedFromSaved, timedToSaved } from './timed';
import { createRules, listRulesets } from './rules';
import { hotSeatControls, timeControls, controlById } from './timeControls';

const S = 1000;
const control = (id: string) => controlById(id)!;
const info = (id: string) => listRulesets().find((r) => r.id === id)!;
const start2 = () => newModel(createRules('standard-2p'), info('standard-2p'));
const start3 = (id = 'standard-3p') => newModel(createRules(id), info(id));
const move = (m: Model, now: number): Model => playFor(m, m.game.legal[0]!, now);
const left = (m: Model, side: string, now: number) => timeLeft(m.timed!.clock, side, now);

describe('the time controls the game offers', () => {
  it('are the hot-seat ones, with untimed the default', () => {
    expect(timeControls.default).toBe('untimed');
    const ids = hotSeatControls(timeControls).map((c) => c.id);
    expect(ids[0]).toBe('untimed');
    expect(ids).toContain('3+2');
    expect(ids).toContain('move30s');
    expect(ids).not.toContain('move1d');
  });
});

describe('untimed games are unchanged', () => {
  it('have no clock, and undo works', () => {
    let m = start2();
    expect(m.timed).toBeNull();
    m = move(m, 1);
    expect(m.timed).toBeNull();
    expect(canUndo(m)).toBe(true);
    expect(undo(m).game.moves).toHaveLength(0);
  });

  it('starting the untimed control leaves no clock', () => {
    expect(startTimed(start2(), control('untimed'), false, 0).timed).toBeNull();
  });
});

describe('a 2-player game at 3+2', () => {
  const t0 = 1_000_000;
  const begin = () => startTimed(start2(), control('3+2'), false, t0);

  it('gives each seat 3 minutes and runs the seat to move from the start', () => {
    const m = begin();
    const first = m.game.turn;
    const other = m.game.order.find((s) => s !== first)!;
    expect(left(m, first, t0)).toBe(180 * S);
    expect(left(m, first, t0 + 20 * S)).toBe(160 * S);
    expect(left(m, other, t0 + 20 * S)).toBe(180 * S);
    expect(clockLines(m, t0 + 20 * S).map((l) => [l.side, l.running])).toEqual(
      m.game.order.map((s) => [s, s === first]),
    );
  });

  it('charges the mover, adds 2 seconds, and keeps each seat time left after the move', () => {
    let m = begin();
    const first = m.game.turn;
    m = move(m, t0 + 10 * S);
    expect(left(m, first, t0 + 10 * S)).toBe(172 * S);
    expect(m.timed!.lefts).toEqual([{ [first]: 172 * S, [m.game.turn]: 180 * S }]);
    m = move(m, t0 + 14 * S);
    expect(m.timed!.lefts).toHaveLength(2);
    // The second seat started its clock at 10 s and moved at 14 s: 180 - 4 + 2.
    expect(m.timed!.lefts[1]).toEqual({
      [first]: 172 * S,
      [m.game.order.find((s) => s !== first)!]: 178 * S,
    });
  });

  it('turns undo off while the clock is on', () => {
    const m = move(begin(), t0 + S);
    expect(canUndo(m)).toBe(false);
    expect(undo(m)).toBe(m);
  });

  it('lets the seat that runs out lose: a flag fall is a result (D66)', () => {
    const m0 = begin();
    const first = m0.game.turn;
    const m = tick(m0, t0 + 180 * S);
    expect(m.game.result).toEqual({
      status: 'win',
      winner: m0.game.order.find((s) => s !== first),
      loser: first,
      reason: 'timeout',
    });
    // The clock stops with the game.
    expect(clockLines(m, t0 + 999 * S).every((l) => !l.running)).toBe(true);
    expect(left(m, first, t0 + 999 * S)).toBe(0);
  });

  it('does nothing before the time is up', () => {
    const m = begin();
    expect(tick(m, t0 + 179 * S)).toBe(m);
  });

  it('counts a move made after the time ran out as a flag fall, not a move', () => {
    const m0 = begin();
    const m = move(m0, t0 + 181 * S);
    expect(m.game.moves).toHaveLength(0);
    expect(m.game.result).toMatchObject({ status: 'win', reason: 'timeout', loser: m0.game.turn });
  });

  it('through a click, too', () => {
    const m0 = begin();
    const mv = m0.game.legal[0]!;
    const m = click(click(m0, mv.from, t0 + 5 * S), mv.to, t0 + 6 * S);
    expect(m.game.moves).toHaveLength(1);
    expect(
      left(
        m,
        m0.game.order.find((s) => s !== m0.game.turn)!,
        t0 + 6 * S,
      ),
    ).toBeLessThan(180 * S + 1);
  });

  it('is a draw when the other player could not checkmate', () => {
    const f = fixture.positions['kings-and-head'] as { turn: string; pieces: Position };
    const game = newGame(createRules('draft-2p'), info('draft-2p'), {
      position: f.pieces,
      turn: 'light',
      coastOpen: false,
    });
    const m = tick(startTimed(fromGame(game), control('1+0'), false, 0), 60 * S);
    expect(m.game.result).toEqual({ status: 'draw', reason: 'timeout-insufficient-material' });
  });
});

describe('Show only', () => {
  const begin = () => startTimed(start2(), control('1+0'), true, 0);

  it('shows the seat out of time and plays on', () => {
    const m0 = begin();
    const first = m0.game.turn;
    const m = tick(m0, 61 * S);
    expect(m.game.result).toEqual({ status: 'ongoing' });
    expect(m.game.turn).toBe(first);
    expect(clockLines(m, 61 * S).find((l) => l.side === first)).toMatchObject({
      ms: 0,
      flagged: true,
      running: false,
    });
    // The move is accepted, with no increment, and the other seat's clock runs.
    const after = move(m, 70 * S);
    expect(after.game.moves).toHaveLength(1);
    expect(left(after, first, 70 * S)).toBe(0);
    expect(left(after, after.game.turn, 80 * S)).toBe(50 * S);
    expect(tick(after, 200 * S).game.turn).toBe(after.game.turn);
  });

  it('still shows the other seat out of time when it runs out, and plays on', () => {
    let m = tick(begin(), 61 * S);
    m = move(m, 62 * S);
    m = tick(m, 200 * S);
    expect(m.game.result).toEqual({ status: 'ongoing' });
    expect(clockLines(m, 200 * S).every((l) => l.flagged)).toBe(true);
  });
});

describe('pause', () => {
  const begin = () => startTimed(start2(), control('3+2'), false, 0);

  it('stops the clock, and refuses moves and clicks until resumed', () => {
    let m = pauseTimed(begin(), 10 * S);
    expect(isPaused(m)).toBe(true);
    expect(left(m, m.game.turn, 500 * S)).toBe(170 * S);
    expect(tick(m, 500 * S)).toBe(m);
    const mv = m.game.legal[0]!;
    expect(click(m, mv.from, 20 * S)).toBe(m);
    m = resumeTimed(m, 100 * S);
    expect(isPaused(m)).toBe(false);
    expect(left(m, m.game.turn, 110 * S)).toBe(160 * S);
    expect(click(m, mv.from, 111 * S).selected).toBe(mv.from);
  });

  it('is not offered for an untimed game or a finished one', () => {
    const m = start2();
    expect(isPaused(m)).toBe(false);
    expect(pauseTimed(m, 5)).toBe(m);
    const over = tick(begin(), 180 * S);
    expect(pauseTimed(over, 181 * S)).toBe(over);
  });
});

describe('a clock can only be chosen before the first move', () => {
  it('is refused once a move is played, and a new choice restarts the clock', () => {
    const played = move(start2(), 1);
    expect(startTimed(played, control('3+2'), false, 2)).toBe(played);
    const a = startTimed(start2(), control('3+2'), false, 0);
    const b = startTimed(a, control('5+3'), false, 50 * S);
    expect(left(b, b.game.turn, 50 * S)).toBe(300 * S);
    expect(startTimed(a, control('untimed'), false, 1).timed).toBeNull();
  });
});

describe('a 3-player game at 30 seconds per move', () => {
  const begin = (id = 'standard-3p') => startTimed(start3(id), control('move30s'), false, 0);

  it('gives each move 30 seconds, and keeps none of what was unused', () => {
    let m = begin();
    const [a, b] = m.game.order as [string, string, string];
    expect(left(m, a, 10 * S)).toBe(20 * S);
    m = move(m, 10 * S);
    expect(m.game.turn).toBe(b);
    expect(left(m, b, 10 * S)).toBe(30 * S);
    expect(m.timed!.lefts[0]![a]).toBe(20 * S);
  });

  it('turns the side to stone when the Kinged seat to move runs out, and the others play on', () => {
    const m0 = begin();
    const [first, second, third] = m0.game.order as [string, string, string];
    const m = tick(m0, 30 * S);
    expect(m.game.seats[first]).toBe('out');
    expect(m.game.result).toEqual({ status: 'ongoing' });
    expect(m.game.turn).toBe(second);
    // The seat that is out stops its clock; the next seat starts fresh.
    const lines = clockLines(m, 30 * S);
    expect(lines.find((l) => l.side === first)).toMatchObject({ out: true, running: false });
    expect(left(m, second, 40 * S)).toBe(20 * S);
    expect(left(m, third, 40 * S)).toBe(30 * S);
    // The clock goes on with the seats left: the second seat runs out in turn, and the duel is decided.
    const done = tick(m, 60 * S);
    expect(done.game.result).toMatchObject({ status: 'win', reason: 'timeout', loser: second });
  });

  it('plays on in turn after a flag fall', () => {
    let m = tick(begin(), 30 * S);
    m = move(m, 35 * S);
    expect(m.game.turn).toBe(
      m.game.order.find((s) => s !== m.game.order[0] && s !== m.game.order[1]),
    );
    expect(m.timed!.lefts).toHaveLength(1);
  });

  it('first checkmate: the seat out of time is out and the other two play on', () => {
    const m = tick(begin('easy-3p'), 30 * S);
    expect(m.game.seats[m.game.order[0]!]).toBe('out');
    expect(m.game.result).toEqual({ status: 'ongoing' });
  });

  it('Show only changes nothing in the game', () => {
    const m = tick(startTimed(start3(), control('move30s'), true, 0), 31 * S);
    expect(m.game.seats).toEqual(start3().game.seats);
    expect(m.game.turn).toBe(m.game.order[0]);
    expect(clockLines(m, 31 * S)[0]).toMatchObject({ flagged: true });
  });

  it('a resignation stops that seat’s clock and hands over the move', () => {
    const m0 = begin();
    const [first, second] = m0.game.order as [string, string, string];
    const m = resignFor(m0, first, 12 * S);
    expect(m.game.turn).toBe(second);
    expect(left(m, second, 15 * S)).toBe(27 * S);
    expect(clockLines(m, 15 * S).find((l) => l.side === first)).toMatchObject({ out: true });
    // The resigning seat that is not to move leaves the running clock alone.
    const n = resignFor(m0, m0.game.order[2]!, 12 * S);
    expect(n.game.turn).toBe(first);
    expect(left(n, first, 15 * S)).toBe(15 * S);
  });

  it('the computer’s thinking time counts: moves come in with the time they were made', () => {
    const m = playFor(begin(), begin().game.legal[0]!, 29 * S);
    expect(m.game.moves).toHaveLength(1);
    expect(playFor(begin(), begin().game.legal[0]!, 31 * S).game.moves).toHaveLength(0);
  });
});

describe('the saved form', () => {
  it('round-trips the clock, paused, with the time left after each move', () => {
    let m = startTimed(start2(), control('5+3'), true, 0);
    m = move(m, 10 * S);
    m = move(m, 14 * S);
    const saved = timedToSaved(m.timed!, 20 * S);
    expect(saved).toMatchObject({ control: '5+3', showOnly: true });
    expect(saved.lefts).toHaveLength(2);
    const back = timedFromSaved(JSON.parse(JSON.stringify(saved)), m.game)!;
    expect(back.showOnly).toBe(true);
    expect(back.control.id).toBe('5+3');
    expect(back.lefts).toEqual(m.timed!.lefts);
    const model: Model = { ...m, timed: back };
    expect(isPaused(model)).toBe(true);
    expect(left(model, m.game.turn, 999 * S)).toBe(saved.left[m.game.turn]);
    expect(left(resumeTimed(model, 100 * S), m.game.turn, 110 * S)).toBe(
      saved.left[m.game.turn]! - 10 * S,
    );
  });

  it('keeps a 3-player seat that is out stopped', () => {
    const m = tick(startTimed(start3(), control('move30s'), false, 0), 30 * S);
    const back = timedFromSaved(timedToSaved(m.timed!, 31 * S), m.game)!;
    expect(back.clock.out).toEqual([m.game.order[0]]);
  });

  it('reads nothing from damaged or foreign data', () => {
    const m = move(startTimed(start2(), control('3+2'), false, 0), S);
    const good = timedToSaved(m.timed!, 2 * S);
    for (const bad of [
      null,
      {},
      { ...good, control: 'nope' },
      { ...good, control: 'untimed' },
      { ...good, control: 'away5m' },
      { ...good, left: { light: 'x' } },
      { ...good, left: {} },
      { ...good, lefts: [] },
      { ...good, showOnly: 'yes' },
    ]) {
      expect(timedFromSaved(bad, m.game)).toBeNull();
    }
  });
});
