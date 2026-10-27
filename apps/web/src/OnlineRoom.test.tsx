// The online screens (S53) in every state a room can be in, drawn from a controller that a fake
// server has driven there: looking, no such room, full, offline, out of date, the preview before
// taking a seat, waiting for an opponent, playing as either side, a draw offer, a drop, a refused
// move, a finished game. Then the create screen and joining by code.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@chess9s/online/protocol';
import { CreateRoom } from './CreateRoom';
import { JoinByCode, parseRoomCode } from './JoinByCode';
import { OnlineRoom } from './OnlineRoom';
import { findRuleset } from './game/rules';
import { RoomController } from './game/roomController';
import { CODE, DRAFT, FakeSocket, MOVES, TOKEN, info, memory, snap } from './game/roomFakes';
import { saveSeat } from './game/onlineStore';
import hotSeatMate from '../../../packages/engine/test/fixtures/games/hot-seat-mate.json';

const ORIGIN = 'https://chess9s.com';

function setup(peek: () => Promise<Response> = async () => new Response(JSON.stringify(info()))) {
  const store = memory();
  const sockets: FakeSocket[] = [];
  const controller = new RoomController({
    code: CODE,
    store,
    fetch: async () => peek(),
    open: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
  });
  return {
    store,
    controller,
    get socket() {
      return sockets.at(-1)!;
    },
    /** In the room as `seat`, the first snapshot in. */
    async play(seat: 'light' | 'dark', over: Partial<Snapshot> = {}) {
      saveSeat(store, CODE, { seat, token: TOKEN });
      await controller.start();
      this.socket.open();
      this.socket.say(snap({ seat, ...over }));
    },
    html: () =>
      renderToStaticMarkup(<OnlineRoom code={CODE} controller={controller} origin={ORIGIN} />),
  };
}

describe('a room that cannot be played yet', () => {
  it('says it is looking', () => {
    expect(setup().html()).toContain('Looking for the room');
  });

  it('an unknown or expired room says so plainly', async () => {
    const s = setup(async () => new Response('', { status: 404 }));
    await s.controller.start();
    const html = s.html();
    expect(html).toContain('Room not found');
    expect(html).toContain('no longer exists');
    expect(html).toContain('href="/"');
  });

  it('a full room says so', async () => {
    const s = setup(
      async () => new Response(JSON.stringify(info({ seats: { light: 'present', dark: 'away' } }))),
    );
    await s.controller.start();
    expect(s.html()).toContain('This room is full');
  });

  it('a failed look offers to try again', async () => {
    const s = setup(async () => {
      throw new TypeError('network');
    });
    await s.controller.start();
    const html = s.html();
    expect(html).toContain('Could not reach the room');
    expect(html).toContain('Try again');
  });

  it('an app older than the server says to reload', async () => {
    const s = setup(
      async () => new Response(JSON.stringify(info({ ruleset: { ...DRAFT, version: '9.9.9' } }))),
    );
    await s.controller.start();
    const html = s.html();
    expect(html).toContain('Reload to update');
    expect(html).toContain('>Reload<');
    expect(html).not.toContain('Take the');
  });
});

describe('the preview before taking a seat', () => {
  it('shows the ruleset’s name, version and badge, and the side the player gets', async () => {
    const s = setup();
    await s.controller.start();
    const html = s.html();
    expect(html).toContain('Good Practice');
    expect(html).toContain('draft-2p v0.2.0');
    expect(html).toMatch(/class="badge" data-status="candidate"/);
    expect(html).toMatch(/You will play[\s\S]*Dark/);
    expect(html).toContain('Take the Dark seat');
    expect(html).toContain('href="/rules/draft-2p"');
    expect(html).not.toContain('Unofficial');
    // Looking at a room opens no connection and takes no seat.
    expect(s.store.data.size).toBe(0);
  });

  it('a ruleset the creator built says Unofficial and what differs from Standard', async () => {
    const s = setup(
      async () =>
        new Response(
          JSON.stringify(
            info({
              ruleset: {
                id: 'custom',
                version: '1.0.0',
                name: 'My own rules',
                overrides: { 'king.range': 3 },
              },
              seats: { light: 'open', dark: 'present' },
            }),
          ),
        ),
    );
    await s.controller.start();
    const html = s.html();
    expect(html).toContain('My own rules');
    expect(html).toContain('Unofficial');
    expect(html).toContain('not fairness-checked');
    expect(html).toContain('King range');
    expect(html).toContain('Take the Light seat');
    expect(html).toMatch(/data-status="proposed"/);
  });
});

describe('playing', () => {
  it('turns the board to the player’s side (D34): dark sees rank 9 at the bottom', async () => {
    const dark = setup();
    await dark.play('dark');
    expect(dark.html()).toContain('Chess Nines board, dark seat');
    const light = setup();
    await light.play('light');
    expect(light.html()).toContain('Chess Nines board, light seat');
  });

  it('shows whose turn it is, who the player is, and whether the opponent is connected', async () => {
    const s = setup();
    await s.play('dark');
    const html = s.html();
    expect(html).toContain('Your move');
    expect(html).toMatch(/You play[\s\S]*Dark/);
    expect(html).toMatch(/Opponent[\s\S]*connected/);
    const other = setup();
    await other.play('light');
    expect(other.html()).toContain('Waiting for Dark to move');
  });

  it('shows an opponent who has dropped as away, and the player’s own drop as reconnecting', async () => {
    const s = setup();
    await s.play('dark', { seats: { light: 'away', dark: 'present' } });
    expect(s.html()).toMatch(/Opponent[\s\S]*away/);
    s.socket.drop(1006);
    const html = s.html();
    expect(html).toContain('Reconnecting…');
  });

  it('offers resign and draw, and no undo and no computer opponent', async () => {
    const s = setup();
    await s.play('dark', { moves: MOVES.slice(0, 4) });
    const html = s.html();
    expect(html).toContain('>Resign<');
    expect(html).toContain('>Offer draw<');
    expect(html).not.toContain('Undo');
    expect(html).not.toContain('Computer');
    expect(html).not.toContain('Hot-seat');
  });

  it('keeps the local play aids, and Save game record once there is a move', async () => {
    const s = setup();
    await s.play('dark');
    expect(s.html()).toContain('Show legal moves');
    expect(s.html()).toContain('Show danger');
    expect(s.html()).toMatch(/<button[^>]*disabled[^>]*>Save game record/);
    const later = setup();
    await later.play('dark', { moves: MOVES.slice(0, 4) });
    expect(later.html()).not.toMatch(/<button[^>]*disabled[^>]*>Save game record/);
    expect(later.html()).toContain('Save game record');
  });

  it('lists the moves played', async () => {
    const s = setup();
    await s.play('dark', { moves: MOVES.slice(0, 4) });
    const html = s.html();
    for (const m of MOVES.slice(0, 4)) expect(html).toContain(`<span>${m}</span>`);
  });

  it('shows a draw offer to the player who must answer it, and to the one who made it', async () => {
    const s = setup();
    await s.play('dark', { drawOffer: 'light' });
    let html = s.html();
    expect(html).toContain('offers a draw');
    expect(html).toContain('>Accept draw<');
    expect(html).toContain('>Decline<');
    expect(html).not.toContain('>Offer draw<');
    const mine = setup();
    await mine.play('dark', { drawOffer: 'dark' });
    html = mine.html();
    expect(html).toContain('Draw offered');
    expect(html).not.toContain('>Accept draw<');
  });

  it('shows what the server refused', async () => {
    const s = setup();
    await s.play('dark');
    s.socket.say({ v: 1, type: 'refused', reason: 'offer-again-later', message: 'Move first.' });
    expect(s.html()).toMatch(/role="alert"[^>]*>[^<]*Move first\./);
  });

  it('ends with the result for the player and nothing left to resign', async () => {
    const s = setup();
    await s.play('light', { moves: MOVES, result: hotSeatMate.result as Snapshot['result'] });
    const html = s.html();
    expect(html).toContain('Checkmate · Light wins · you win');
    expect(html).not.toContain('>Resign<');
    expect(html).not.toContain('>Offer draw<');
  });

  it('says to reload when the server speaks something this app cannot read', async () => {
    const s = setup();
    await s.play('dark');
    s.socket.onmessage?.({ data: JSON.stringify({ v: 2, type: 'snapshot' }) });
    expect(s.html()).toContain('Reload to update');
  });

  it('says when the seat is being played from another window', async () => {
    const s = setup();
    await s.play('dark');
    s.socket.drop(4001);
    expect(s.html()).toContain('another window');
  });

  it('every piece of text is plain: no names, no accounts', async () => {
    const s = setup();
    await s.play('dark');
    expect(s.html()).not.toMatch(/sign in|log in|username|account/i);
  });
});

describe('waiting for an opponent', () => {
  it('shows the room code, the link, and an invitation by email', async () => {
    const s = setup();
    await s.play('dark', { seats: { light: 'open', dark: 'present' } });
    const html = s.html();
    expect(html).toContain('Waiting for an opponent to join');
    expect(html).toContain(CODE);
    expect(html).toContain(`${ORIGIN}/room/${CODE}`);
    expect(html).toMatch(/href="mailto:\?subject=[^"]*"[^>]*>Invite by email/);
    expect(html).toContain('>Copy link<');
  });

  it('the invitation names the link and the ruleset', async () => {
    const s = setup();
    await s.play('dark', { seats: { light: 'open', dark: 'present' } });
    const href = /href="(mailto:[^"]+)"/.exec(s.html())![1]!.replace(/&amp;/g, '&');
    const body = new URLSearchParams(href.slice('mailto:?'.length)).get('body')!;
    expect(body).toContain(`${ORIGIN}/room/${CODE}`);
    expect(body).toContain('Good Practice');
  });

  it('no moves can be made until the opponent has joined', async () => {
    const s = setup();
    await s.play('dark', { seats: { light: 'open', dark: 'present' } });
    expect(s.html()).not.toContain('>Resign<');
  });
});

describe('making a room', () => {
  const standard = findRuleset('standard-2p')!;
  const html = (ruleset = standard) =>
    renderToStaticMarkup(
      <CreateRoom ruleset={ruleset} store={memory()} onCancel={() => {}} onCreated={() => {}} />,
    );

  it('asks for the creator’s side, with random preselected (D52)', () => {
    const out = html();
    expect(out).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Random</);
    expect(out).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Light</);
    expect(out).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Dark</);
    expect(out).toContain('>Create room<');
  });

  it('names the ruleset and its status, and says a custom one is unofficial', () => {
    expect(html()).toContain('Standard');
    expect(html()).toContain('data-status="candidate"');
    const custom = {
      ...standard,
      id: 'mine',
      name: 'Mine',
      custom: true as const,
      overrides: { 'king.range': 3 },
      status: 'proposed' as const,
    };
    const out = html(custom);
    expect(out).toContain('Mine');
    expect(out).toContain('Unofficial');
  });

  it('says what is sent, and that there are no names or accounts', () => {
    const out = html();
    expect(out).toMatch(/no names or accounts/i);
    expect(out).toContain('href="/privacy"');
  });
});

describe('joining by code', () => {
  it('reads a code typed any way: lowercase, with spaces, or pasted as a link', () => {
    expect(parseRoomCode('K7RX2M')).toBe('K7RX2M');
    expect(parseRoomCode(' k7rx 2m ')).toBe('K7RX2M');
    expect(parseRoomCode('https://chess9s.com/room/k7rx2m')).toBe('K7RX2M');
    expect(parseRoomCode('/room/K7RX2M/')).toBe('K7RX2M');
  });

  it('refuses what is not a code', () => {
    for (const bad of ['', 'K7RX', 'K7RX2MM', 'K7RX0M', 'hello!', 'https://chess9s.com/privacy'])
      expect(parseRoomCode(bad), bad).toBeNull();
  });

  it('draws a field and a button', () => {
    const out = renderToStaticMarkup(<JoinByCode onJoin={() => {}} />);
    expect(out).toContain('Join a room');
    expect(out).toMatch(/<input[^>]*aria-label="Room code"/);
    expect(out).toContain('>Join<');
  });
});
