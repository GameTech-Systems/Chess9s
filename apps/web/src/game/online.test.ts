// The online session (S53): what the browser does with a room's snapshot and messages, and with
// the player's own clicks. The server's answers are given by hand here, as a fake socket would.
import { describe, expect, it } from 'vitest';
import { newGame, toNotation } from '@chess9s/engine';
import type { ServerMessage, Snapshot } from '@chess9s/online/protocol';
import hotSeatMate from '../../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import { createRules } from './rules';
import { fromGame } from './session';
import {
  applyServer,
  canPlay,
  cancelPromotion,
  choosePromotion,
  joinProblem,
  onlineHighlights,
  onlineStatus,
  opponentOf,
  pressSquare,
  setConnection,
  startOnline,
  type Online,
} from './online';

const CODE = 'K7RX2M';
const DRAFT = { id: 'draft-2p', version: '0.2.0', name: 'Good Practice' };
const MOVES: string[] = hotSeatMate.moves;

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'dark',
  ruleset: DRAFT,
  moves: [],
  result: { status: 'ongoing' },
  seats: { light: 'present', dark: 'present' },
  drawOffer: null,
  ...over,
});
const start = (over: Partial<Snapshot> = {}): Online => {
  const online = startOnline(snap(over));
  if (!online) throw new Error('the snapshot did not replay');
  return setConnection(online, 'open');
};
const say = (online: Online, ...ms: ServerMessage[]) => ms.reduce(applyServer, online);
const moveMsg = (move: string, side: string): ServerMessage => ({ v: 1, type: 'move', move, side });

/** A plain move the side to move can make by clicking two squares. */
const plain = (o: Online) => {
  const m = o.model.game.legal.find((l) => !l.promotion && !l.castle)!;
  return { from: m.from, to: m.to, notation: toNotation(m) };
};

describe('joining: the snapshot', () => {
  it('starts a new game from a snapshot: the seat, whose turn, who is there', () => {
    const o = start();
    expect(o.seat).toBe('dark');
    expect(o.model.game.turn).toBe('dark');
    expect(o.model.game.moves).toHaveLength(0);
    expect(opponentOf(o)).toBe('light');
    expect(o.seats).toEqual({ light: 'present', dark: 'present' });
  });

  it('replays a game in progress through the engine', () => {
    const o = start({ moves: MOVES.slice(0, 6), seat: 'light' });
    expect(o.model.game.moves.map((m) => m.notation)).toEqual(MOVES.slice(0, 6));
    expect(o.model.game.turn).toBe('dark');
  });

  it('replays a finished game to its result', () => {
    const o = start({ moves: MOVES, result: hotSeatMate.result as Snapshot['result'] });
    expect(o.model.game.result).toEqual(hotSeatMate.result);
  });

  it('replays a resignation, which no move gives', () => {
    const result = {
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'resignation',
    } as const;
    const o = start({ moves: MOVES.slice(0, 4), result });
    expect(o.model.game.result).toEqual(result);
  });

  it('plays a custom ruleset from its overrides', () => {
    const ruleset = {
      id: 'custom',
      version: '1.0.0',
      name: 'Mine',
      overrides: { 'king.range': 3 },
    };
    const o = start({ ruleset });
    expect(o.model.game.ruleset.overrides).toEqual({ 'king.range': 3 });
    expect(o.model.game.rules.pieces['king']).toBeDefined();
  });

  it.each([
    ['a move that is not legal', { moves: ['a1-a9'] }],
    ['a result the moves do not give', { moves: MOVES.slice(0, 4), result: hotSeatMate.result }],
    ['a ruleset this app does not have', { ruleset: { ...DRAFT, version: '9.9.9' } }],
    ['an unknown ruleset', { ruleset: { ...DRAFT, id: 'not-a-ruleset' } }],
    [
      'overrides that are not valid',
      { ruleset: { id: 'custom', version: '1.0.0', name: 'x', overrides: { 'no.such': 1 } } },
    ],
  ])('does not start from %s: the app is out of date', (_, over) => {
    expect(startOnline(snap(over as Partial<Snapshot>))).toBeNull();
  });

  it('a new snapshot (after a reconnect) replaces the game and drops an unconfirmed move', () => {
    let o = start();
    const { from, to } = plain(o);
    o = pressSquare(pressSquare(o, from).online, to).online;
    expect(o.pending).not.toBeNull();
    const again = applyServer(o, snap({ moves: [] }));
    expect(again.pending).toBeNull();
    expect(again.model.game.moves).toHaveLength(0);
    expect(again.notice).toBeNull();
  });

  it('keeps the player’s play aids across a new snapshot', () => {
    const o = start();
    const aids = { ...o, model: { ...o.model, showMoves: false, showDanger: true } };
    const again = applyServer(aids, snap());
    expect(again.model.showMoves).toBe(false);
    expect(again.model.showDanger).toBe(true);
  });
});

describe('playing: the player’s moves', () => {
  it('a move is played on the board at once and sent; the server’s echo confirms it', () => {
    let o = start();
    const { from, to, notation } = plain(o);
    const first = pressSquare(o, from);
    expect(first.send).toBeUndefined();
    const second = pressSquare(first.online, to);
    expect(second.send).toEqual({ v: 1, type: 'move', move: notation });
    o = second.online;
    expect(o.model.game.moves.at(-1)?.notation).toBe(notation);
    expect(o.pending).not.toBeNull();
    // While it is unconfirmed, nothing else is sent.
    expect(canPlay(o)).toBe(false);
    o = say(o, moveMsg(notation, 'dark'));
    expect(o.pending).toBeNull();
    expect(o.model.game.moves).toHaveLength(1);
  });

  it('a refused move is taken back, with the reason', () => {
    let o = start();
    const { from, to } = plain(o);
    o = pressSquare(pressSquare(o, from).online, to).online;
    o = say(o, { v: 1, type: 'refused', reason: 'not-your-turn', message: 'It is not your turn.' });
    expect(o.model.game.moves).toHaveLength(0);
    expect(o.model.game.turn).toBe('dark');
    expect(o.pending).toBeNull();
    expect(o.notice).toBe('It is not your turn.');
    expect(o.model.selected).toBeNull();
  });

  it('other refusals only show their reason', () => {
    const o = say(start(), {
      v: 1,
      type: 'refused',
      reason: 'offer-again-later',
      message: 'Move first.',
    });
    expect(o.notice).toBe('Move first.');
    expect(o.model.game.moves).toHaveLength(0);
  });

  it('a promotion waits for the piece, then sends the move with it', () => {
    const rules = createRules(DRAFT.id, DRAFT.version);
    const king = (side: string) => ({ piece: 'king', side });
    const game = newGame(rules, DRAFT, {
      position: { f9: king('dark'), f1: king('light'), b8: { piece: 'pawn', side: 'light' } },
      turn: 'light',
    });
    const o = { ...start({ seat: 'light' }), model: fromGame(game) };
    const picking = pressSquare(pressSquare(o, 'b8').online, 'b9');
    expect(picking.send).toBeUndefined();
    expect(picking.online.model.promoting?.choices).toContain('queen');
    const done = choosePromotion(picking.online, 'queen');
    expect(done.send).toEqual({ v: 1, type: 'move', move: 'b8-b9=queen' });
    expect(done.online.model.game.moves.at(-1)?.notation).toBe('b8-b9=queen');
    expect(done.online.pending).not.toBeNull();
    // A piece that is not a choice changes nothing; so does picking when nothing is waiting.
    expect(choosePromotion(picking.online, 'king')).toEqual({ online: picking.online });
    expect(choosePromotion(start(), 'queen').send).toBeUndefined();
    // Cancelling puts the pawn back to choose again.
    expect(cancelPromotion(picking.online).model.promoting).toBeNull();
  });

  it('squares do nothing on the opponent’s turn', () => {
    const o = start({ seat: 'light' });
    const { from } = plain(o);
    const r = pressSquare(o, from);
    expect(r.online).toBe(o);
    expect(r.send).toBeUndefined();
    expect(o.model.selected).toBeNull();
  });

  it('squares do nothing while the other seat is open or the connection is down', () => {
    const waiting = start({ seats: { light: 'open', dark: 'present' } });
    expect(canPlay(waiting)).toBe(false);
    expect(pressSquare(waiting, plain(waiting).from).online).toBe(waiting);
    const down = setConnection(start(), 'reconnecting');
    expect(canPlay(down)).toBe(false);
    expect(pressSquare(down, plain(down).from).online).toBe(down);
  });

  it('squares do nothing once the game is over', () => {
    const o = start({ moves: MOVES, result: hotSeatMate.result as Snapshot['result'] });
    expect(canPlay(o)).toBe(false);
    expect(pressSquare(o, 'a1').online).toBe(o);
  });
});

describe('the opponent', () => {
  it('their move is played on the board', () => {
    let o = start({ seat: 'light' });
    const { notation } = plain(o);
    o = say(o, moveMsg(notation, 'dark'));
    expect(o.model.game.moves.at(-1)?.notation).toBe(notation);
    expect(o.model.game.turn).toBe('light');
    expect(canPlay(o)).toBe(true);
  });

  it('a move that is not legal here means the game and the server disagree', () => {
    const o = say(start({ seat: 'light' }), moveMsg('a1-a9', 'dark'));
    expect(o.closed).toBe('desync');
    expect(o.model.game.moves).toHaveLength(0);
  });

  it('a move from my own seat that I did not make also means they disagree', () => {
    const o = say(start(), moveMsg('a1-a9', 'dark'));
    expect(o.closed).toBe('desync');
  });

  it('shows when they are there, away or have not come yet', () => {
    let o = start({ seats: { light: 'open', dark: 'present' } });
    expect(onlineStatus(o)).toBe('Waiting for an opponent to join');
    o = say(o, { v: 1, type: 'opponent', status: 'present' });
    expect(o.seats.light).toBe('present');
    o = say(o, { v: 1, type: 'opponent', status: 'away' });
    expect(o.seats.light).toBe('away');
  });

  it('plays a whole game to checkmate on both screens', () => {
    let light = start({ seat: 'light' });
    let dark = start({ seat: 'dark' });
    for (const [i, move] of MOVES.entries()) {
      const side = i % 2 === 0 ? 'dark' : 'light';
      const m = moveMsg(move, side);
      light = say(light, m);
      dark = say(dark, m);
    }
    expect(light.model.game.result).toEqual(hotSeatMate.result);
    expect(dark.model.game.result).toEqual(hotSeatMate.result);
    expect(onlineStatus(light)).toBe('Checkmate · Light wins · you win');
    expect(onlineStatus(dark)).toBe('Checkmate · Light wins · you lose');
  });
});

describe('resigning and drawing', () => {
  it('the opponent resigns: game over by the server’s result', () => {
    const result = {
      status: 'win',
      winner: 'dark',
      loser: 'light',
      reason: 'resignation',
    } as const;
    const o = say(start(), { v: 1, type: 'game-over', result });
    expect(o.model.game.result).toEqual(result);
    expect(onlineStatus(o)).toBe('Resignation · Dark wins · you win');
  });

  it('a draw by agreement ends the game, and the offer is gone', () => {
    let o = start();
    o = say(o, { v: 1, type: 'offer-draw', side: 'light' });
    expect(o.drawOffer).toBe('light');
    o = say(o, { v: 1, type: 'game-over', result: { status: 'draw', reason: 'agreement' } });
    expect(o.model.game.result).toEqual({ status: 'draw', reason: 'agreement' });
    expect(o.drawOffer).toBeNull();
    expect(onlineStatus(o)).toBe('By agreement · draw');
  });

  it('shows an offer and clears it when it is declined', () => {
    let o = start();
    o = say(o, { v: 1, type: 'offer-draw', side: 'light' });
    expect(o.drawOffer).toBe('light');
    o = say(o, { v: 1, type: 'decline-draw', side: 'dark' });
    expect(o.drawOffer).toBeNull();
  });

  it('a snapshot brings the standing offer back after a reload', () => {
    expect(start({ drawOffer: 'light' }).drawOffer).toBe('light');
  });

  it('game over from a checkmate move changes nothing more', () => {
    let o = start({ seat: 'light', moves: MOVES.slice(0, -1) });
    o = say(o, moveMsg(MOVES.at(-1)!, 'light'));
    const over = say(o, { v: 1, type: 'game-over', result: hotSeatMate.result as never });
    expect(over.model.game.result).toEqual(hotSeatMate.result);
  });
});

describe('the status line', () => {
  it('says whose move it is, in check, and that the connection is down', () => {
    expect(onlineStatus(start())).toBe('Your move');
    expect(onlineStatus(start({ seat: 'light' }))).toBe('Waiting for Dark to move');
    expect(onlineStatus(setConnection(start(), 'reconnecting'))).toBe('Reconnecting…');
    expect(onlineStatus(setConnection(start(), 'connecting'))).toBe('Connecting…');
  });
});

describe('when joining fails', () => {
  it.each([
    ['no-room', 'gone', 'no longer exists'],
    ['room-full', 'full', 'full'],
    ['bad-token', 'lost', 'no longer valid'],
    ['version', 'outdated', 'Reload to update'],
    ['already-seated', 'other', undefined],
  ] as const)('%s is %s', (reason, kind, text) => {
    const p = joinProblem(reason, 'The server says so.');
    expect(p.kind).toBe(kind);
    if (text) expect(p.text).toContain(text);
    else expect(p.text).toBe('The server says so.');
  });
});

describe('what the board shows', () => {
  it('marks the player’s movable pieces and moves only on their own turn', () => {
    const mine = onlineHighlights(start());
    expect(mine.movable.length).toBeGreaterThan(0);
    const theirs = onlineHighlights(start({ seat: 'light' }));
    expect(theirs.movable).toEqual([]);
    expect(theirs.targets).toEqual([]);
  });

  it('shows the opponent’s last move and a check, whoever’s turn it is', () => {
    const o = start({ seat: 'light', moves: MOVES.slice(0, 1) });
    expect(onlineHighlights(o).lastMove).toEqual(['c9', 'b7']);
  });
});
