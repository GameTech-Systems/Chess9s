// The online session in a room with three seats (S63): the snapshot with a resignation in it, the
// resigned and presence messages that name a seat, an out seat that still watches, and the lines
// that say whose move it is.
import { describe, expect, it } from 'vitest';
import { three, toNotation } from '@chess9s/engine';
import type { ServerMessage, Snapshot } from '@chess9s/online/protocol';
import threeEnds from '../../../../packages/engine/test/fixtures/games/three-player-ends.json';
import {
  applyServer,
  canAct,
  canPlay,
  mySeatOut,
  onlineStatus,
  setConnection,
  startOnline,
  type Online,
} from './online';
import { createRules } from './rules';

const CODE = 'K7RX2M';
const STANDARD = { id: 'standard-3p', version: '0.3.0', name: 'Standard 3-player' };
const ALL_PRESENT = { dark: 'present', light: 'present', dragon: 'present' } as const;

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'dark',
  ruleset: STANDARD,
  moves: [],
  result: { status: 'ongoing' },
  seats: ALL_PRESENT,
  drawOffer: null,
  ...over,
});
const start = (over: Partial<Snapshot> = {}): Online => {
  const online = startOnline(snap(over));
  if (!online) throw new Error('the snapshot did not replay');
  return setConnection(online, 'open');
};
const say = (online: Online, ...ms: ServerMessage[]) =>
  ms.reduce((o, m) => applyServer(o, m), online);
const order = three(createRules('standard-3p', '0.3.0'), ['dark', 'light', 'dragon']);
const recorded = (row: string) =>
  threeEnds.games.find((g) => g.ruleset === 'standard-3p' && g.rows.includes(row))!;

describe('joining a 3-seat room', () => {
  it('starts from the first mover and keeps the computer seats the snapshot names', () => {
    const o = start({ computer: ['dragon'] });
    expect(o.model.game.order).toHaveLength(3);
    expect(o.model.game.turn).toBe(o.model.game.order[0]);
    expect(o.computer).toEqual(['dragon']);
    expect(start().computer).toEqual([]);
  });

  it('replays a game in progress and its resignations, each where it was made', () => {
    const moves = recorded('kinged-checkmates-king').moves.slice(0, 5);
    const kinged = start().model.game.order.filter((s) => s !== order.dragon);
    const o = start({ moves, resignations: [{ side: kinged[0]!, after: 5 }] });
    expect(o.model.game.moves.map((m) => m.notation)).toEqual(moves);
    expect(o.model.game.seats[kinged[0]!]).toBe('out');
    expect(o.model.game.resignations).toEqual([{ side: kinged[0], after: 5 }]);
  });

  it('cannot replay resignations that do not hold: the app is older than the server', () => {
    expect(startOnline(snap({ resignations: [{ side: 'gold', after: 0 }] }))).toBeNull();
    expect(startOnline(snap({ resignations: [{ side: 'dark', after: 9 }] }))).toBeNull();
  });

  it('replays a finished game to its result', () => {
    const game = recorded('dragon-captures-king');
    const o = start({ moves: game.moves, result: game.result as Snapshot['result'] });
    expect(o.model.game.result).toEqual(game.result);
  });
});

describe('messages that name a seat', () => {
  it('a presence message changes the seat it names, not "the opponent"', () => {
    const o = start();
    const gone = say(o, { v: 1, type: 'opponent', status: 'away', side: 'dragon' });
    expect(gone.seats).toEqual({ dark: 'present', light: 'present', dragon: 'away' });
    const back = say(gone, { v: 1, type: 'opponent', status: 'present', side: 'dragon' });
    expect(back.seats).toEqual(ALL_PRESENT);
  });

  it('a resigned message puts the seat out and the game goes on without it', () => {
    const o = start();
    const kinged = o.model.game.order.filter((s) => s !== order.dragon);
    const after = say(o, { v: 1, type: 'resigned', side: kinged[0]! });
    expect(after.model.game.seats[kinged[0]!]).toBe('out');
    expect(after.model.game.result.status).toBe('ongoing');
    expect(after.model.game.turn).not.toBe(kinged[0]);
  });

  it('the last resignation of a duel ends the game; the game-over that follows agrees', () => {
    const o = start();
    const [a, b] = o.model.game.order.filter((s) => s !== order.dragon) as [string, string];
    const result = {
      status: 'win',
      winner: order.dragon,
      loser: b,
      reason: 'resignation',
    } as const;
    const over = say(
      o,
      { v: 1, type: 'resigned', side: a },
      { v: 1, type: 'resigned', side: b },
      { v: 1, type: 'game-over', result },
    );
    expect(over.model.game.result).toEqual(result);
    expect(over.closed).toBeNull();
  });

  it('a resignation of a seat that is not in the game means the two have drifted apart', () => {
    expect(say(start(), { v: 1, type: 'resigned', side: 'gold' }).closed).toBe('desync');
  });

  it('keeps a move the player has sent when another seat resigns before the echo', () => {
    const o = start();
    const mover = o.model.game.turn;
    const kinged = o.model.game.order.filter((s) => s !== order.dragon && s !== mover);
    const mine = start({ seat: mover });
    const m = mine.model.game.legal.find((l) => !l.promotion && !l.castle)!;
    const sent = {
      ...mine,
      pending: mine.model.game,
      model: {
        ...mine.model,
        game: say(mine, { v: 1, type: 'move', move: toNotation(m), side: mover }).model.game,
      },
    };
    const after = say(sent, { v: 1, type: 'resigned', side: kinged[0]! });
    expect(after.closed).toBeNull();
    expect(after.model.game.moves.at(-1)?.notation).toBe(toNotation(m));
    expect(after.model.game.seats[kinged[0]!]).toBe('out');
    // The echo then confirms it.
    const echoed = say(after, { v: 1, type: 'move', move: toNotation(m), side: mover });
    expect(echoed.pending).toBeNull();
    expect(echoed.closed).toBeNull();
  });
});

describe('what the player may do', () => {
  it('plays only on their own turn, with every seat taken', () => {
    const o = start();
    expect(canPlay(o)).toBe(true);
    expect(canPlay(start({ seat: 'dragon' }))).toBe(false);
    expect(canPlay(start({ seats: { ...ALL_PRESENT, light: 'open' } }))).toBe(false);
  });

  it('an out seat cannot play or act, and says so', () => {
    const kinged = start().model.game.order.filter((s) => s !== order.dragon);
    const out = start({ seat: kinged[0]!, resignations: [{ side: kinged[0]!, after: 0 }] });
    expect(mySeatOut(out)).toBe(true);
    expect(canPlay(out)).toBe(false);
    expect(canAct(out)).toBe(false);
    expect(mySeatOut(start())).toBe(false);
  });
});

describe('the status line', () => {
  it('says whose move it is, and who is being waited for', () => {
    const o = start();
    expect(onlineStatus(o)).toBe('Your move');
    const watching = start({ seat: 'dragon' });
    expect(onlineStatus(watching)).toBe(`Waiting for ${cap(o.model.game.turn)} to move`);
  });

  it('counts the seats still open', () => {
    expect(onlineStatus(start({ seats: { ...ALL_PRESENT, light: 'open' } }))).toBe(
      'Waiting for 1 more player to join',
    );
    expect(onlineStatus(start({ seats: { dark: 'present', light: 'open', dragon: 'open' } }))).toBe(
      'Waiting for 2 more players to join',
    );
  });

  it('tells an out seat it is watching, and leaves the result to the result card', () => {
    const kinged = start().model.game.order.filter((s) => s !== order.dragon);
    const out = start({ seat: kinged[0]!, resignations: [{ side: kinged[0]!, after: 0 }] });
    expect(onlineStatus(out)).toMatch(/^You are out · /);
    const game = recorded('kinged-checkmates-king');
    const over = start({ moves: game.moves, result: game.result as Snapshot['result'] });
    expect(onlineStatus(over)).not.toMatch(/you (win|lose)/);
  });
});

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
