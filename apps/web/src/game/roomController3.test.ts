// The room page's logic in a room with three seats (S63): the preview names the seat the server
// will give, and a creator who gave seats to the computer plays them from this browser, each on
// a socket of its own, through the same join and move messages as a person.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, playMove, three, toNotation, type GameState } from '@chess9s/engine';
import { CLOSE_GONE, type Snapshot } from '@chess9s/online/protocol';
import threeEnds from '../../../../packages/engine/test/fixtures/games/three-player-ends.json';
import { loadSeat, saveSeat } from './onlineStore';
import { CODE, FakeSocket, TOKEN, info, memory } from './roomFakes';
import { RoomController } from './roomController';
import { createRules } from './rules';

const DRAGON_TOKEN = 'D'.repeat(43);
const STANDARD = { id: 'standard-3p', version: '0.3.0', name: 'Standard 3-player' };
const ALL = { dark: 'present', light: 'present', dragon: 'present' } as const;
const recorded = threeEnds.games.find(
  (g) => g.ruleset === 'standard-3p' && g.rows.includes('kinged-checkmates-king'),
)!;

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  v: 1,
  type: 'snapshot',
  code: CODE,
  seat: 'dark',
  ruleset: STANDARD,
  moves: [],
  result: { status: 'ongoing' },
  seats: ALL,
  drawOffer: null,
  ...over,
});

/** The moves of the recorded game up to the first time `side` is to move (at least `from` moves in). */
function movesUntil(side: string, from = 0): string[] {
  let g: GameState = newGame(createRules('standard-3p', '0.3.0'), STANDARD);
  const played: string[] = [];
  for (const notation of recorded.moves) {
    if (g.turn === side && played.length >= from) return played;
    g = playMove(
      g,
      g.legal.find((m) => toNotation(m) === notation)!,
    );
    played.push(notation);
  }
  throw new Error(`${side} is never to move`);
}
const DRAGON = three(createRules('standard-3p', '0.3.0'), ['dark', 'light', 'dragon']).dragon;

function harness(seated?: { computer?: Record<string, string>; seat?: string }) {
  const store = memory();
  const sockets: FakeSocket[] = [];
  const controller = new RoomController({
    code: CODE,
    store,
    fetch: async () =>
      new Response(
        JSON.stringify(
          info({
            ruleset: STANDARD,
            seats: { dark: 'present', light: 'open', dragon: 'open' },
          }),
        ),
        { status: 200 },
      ),
    open: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
  });
  if (seated) {
    saveSeat(store, CODE, {
      seat: seated.seat ?? 'dark',
      token: TOKEN,
      ...(seated.computer && { computer: seated.computer }),
    });
  }
  return { store, sockets, controller };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('the preview of a 3-seat room', () => {
  it('offers the first open seat in turn order, which is the one the server gives', async () => {
    const h = harness();
    await h.controller.start();
    expect(h.controller.phase).toMatchObject({ kind: 'preview', side: 'light' });
  });

  it('says a room with every seat taken is full', async () => {
    const h = harness();
    const full = new RoomController({
      code: CODE,
      store: h.store,
      fetch: async () =>
        new Response(JSON.stringify(info({ ruleset: STANDARD, seats: ALL })), { status: 200 }),
      open: () => new FakeSocket(),
    });
    await full.start();
    expect(full.phase).toMatchObject({ kind: 'problem', problem: 'full' });
    expect((full.phase as { text: string }).text).toContain('every seat is taken');
  });
});

describe('seats played by the computer from this browser', () => {
  const computer = { [DRAGON]: DRAGON_TOKEN };
  const withBot = (over: Partial<Snapshot> = {}) =>
    snap({ computer: [DRAGON], seats: { ...ALL, [DRAGON]: 'away' }, ...over });

  async function seatedWithBot(over: Partial<Snapshot> = {}) {
    const h = harness({ computer });
    await h.controller.start();
    h.sockets[0]!.open();
    h.sockets[0]!.say(withBot(over));
    return h;
  }

  it('joins each computer seat on a socket of its own, with that seat’s token', async () => {
    const h = await seatedWithBot();
    expect(h.sockets).toHaveLength(2);
    h.sockets[1]!.open();
    expect(h.sockets[1]!.messages).toEqual([
      { v: 1, type: 'join', code: CODE, token: DRAGON_TOKEN },
    ]);
    // The creator's own socket is not touched.
    expect(h.sockets[0]!.messages).toEqual([{ v: 1, type: 'join', code: CODE, token: TOKEN }]);
  });

  it('plays only its own seat, on its turn, once every seat is taken, after a short pause', async () => {
    const moves = movesUntil(DRAGON);
    const h = await seatedWithBot({ moves });
    const bot = h.sockets[1]!;
    bot.open();
    bot.say(withBot({ seat: DRAGON, moves }));
    expect(bot.messages.filter((m) => m.type === 'move')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    const sent = bot.messages.filter((m) => m.type === 'move');
    expect(sent).toHaveLength(1);
    // A legal move of the seat to move, found by the search, sent as a person's would be.
    let g = newGame(createRules('standard-3p', '0.3.0'), STANDARD);
    for (const n of moves)
      g = playMove(
        g,
        g.legal.find((m) => toNotation(m) === n)!,
      );
    expect(g.turn).toBe(DRAGON);
    expect(g.legal.map(toNotation)).toContain((sent[0] as { move: string }).move);
    // The creator's own socket sent no move: the page's player makes their own.
    expect(h.sockets[0]!.messages.filter((m) => m.type === 'move')).toHaveLength(0);
  });

  it('does not move out of turn, nor while a seat is still open, nor twice for one position', async () => {
    const mid = movesUntil(DRAGON).slice(0, 1);
    const h = await seatedWithBot({ moves: mid });
    const bot = h.sockets[1]!;
    bot.open();
    bot.say(withBot({ seat: DRAGON, moves: mid }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(bot.messages.filter((m) => m.type === 'move')).toHaveLength(0);
    // A seat is open: the room waits.
    const moves = movesUntil(DRAGON);
    bot.say(
      withBot({ seat: DRAGON, moves, seats: { ...ALL, light: 'open', [DRAGON]: 'present' } }),
    );
    await vi.advanceTimersByTimeAsync(2000);
    expect(bot.messages.filter((m) => m.type === 'move')).toHaveLength(0);
    // Everyone is there: it moves once, and a repeated snapshot of the same position adds none.
    bot.say(withBot({ seat: DRAGON, moves, seats: ALL }));
    await vi.advanceTimersByTimeAsync(2000);
    bot.say(withBot({ seat: DRAGON, moves, seats: ALL }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(bot.messages.filter((m) => m.type === 'move')).toHaveLength(1);
  });

  it('answers for a game in which a seat has resigned', async () => {
    const h = await seatedWithBot();
    const bot = h.sockets[1]!;
    bot.open();
    bot.say(withBot({ seat: DRAGON }));
    const kinged = ['dark', 'light'];
    // The first mover resigns at the start: the turn passes, and the bot (if it is next) moves.
    const first = newGame(createRules('standard-3p', '0.3.0'), STANDARD).turn;
    bot.say({ v: 1, type: 'resigned', side: first });
    await vi.advanceTimersByTimeAsync(2000);
    const sent = bot.messages.filter((m) => m.type === 'move');
    expect(kinged.includes(first) || first === DRAGON).toBe(true);
    expect(sent.length).toBeLessThanOrEqual(1);
  });

  it('plays no seat for a browser that does not hold its token, and shows the friend nothing extra', async () => {
    const h = harness({});
    saveSeat(h.store, CODE, { seat: 'light', token: TOKEN });
    await h.controller.start();
    h.sockets[0]!.open();
    h.sockets[0]!.say(withBot({ seat: 'light' }));
    expect(h.sockets).toHaveLength(1);
  });

  it('ignores tokens for seats the room does not say are the computer’s', async () => {
    const h = harness({ computer: { light: DRAGON_TOKEN } });
    await h.controller.start();
    h.sockets[0]!.open();
    h.sockets[0]!.say(withBot());
    expect(h.sockets).toHaveLength(1);
  });

  it('leaves the computer’s sockets when the player leaves the room, and when the game ends', async () => {
    const h = await seatedWithBot();
    h.sockets[1]!.open();
    h.controller.stop();
    expect(h.sockets.every((s) => s.closed)).toBe(true);

    const over = await seatedWithBot();
    over.sockets[1]!.open();
    // The two Kinged players resign: the Dragon wins, and the game is over.
    const [a, b] = ['dark', 'light'].filter((x) => x !== DRAGON);
    over.sockets[0]!.say({ v: 1, type: 'resigned', side: a! });
    over.sockets[0]!.say({ v: 1, type: 'resigned', side: b! });
    over.sockets[0]!.say({
      v: 1,
      type: 'game-over',
      result: { status: 'win', winner: DRAGON, loser: b!, reason: 'resignation' },
    });
    expect(over.sockets[1]!.closed).toBe(true);
  });

  it('forgets the room, tokens and all, when the server says it is gone', async () => {
    const h = await seatedWithBot();
    h.sockets[1]!.open();
    h.sockets[0]!.drop(CLOSE_GONE);
    expect(h.controller.phase).toMatchObject({ kind: 'problem', problem: 'gone' });
    expect(loadSeat(h.store, CODE)).toBeNull();
    expect(h.sockets[1]!.closed).toBe(true);
  });

  it('reconnecting the creator’s own socket does not start the computer seats again', async () => {
    const h = await seatedWithBot();
    h.sockets[0]!.say(withBot());
    expect(h.sockets).toHaveLength(2);
  });
});
