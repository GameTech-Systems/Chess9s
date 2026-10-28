// A seat the computer plays in an online room (S63, D61). The creator's browser holds the seat's
// token, joins it on a socket of its own, keeps its own copy of the room as any seat does (online.ts)
// and, when it is that seat's turn, finds a move with the S58 or S62 player and sends it. The server
// checks that move exactly as it checks a person's: a bad one is refused and the seat waits.
// If this browser is away, the seat is away, and the room waits for it as for a person (D51).
import { toNotation } from '@chess9s/engine';
import { searchMove, type BotSearch } from './botClient';
import { levelOf } from './bots';
import { RoomConnection, type ClosedWhy, type SocketLike, type Status } from './connection';
import { applyServer, canPlay, setConnection, startOnline, type Online } from './online';
import type { ServerMessage } from '@chess9s/online/protocol';

/** A pause before the computer moves, so its replies can be followed (as against the computer in hot-seat play). */
export const BOT_DELAY_MS = 500;

export interface ComputerSeatDeps {
  code: string;
  seat: string;
  token: string;
  open: () => SocketLike;
  probe: () => Promise<'gone' | 'ok'>;
  /** The seat's connection ended for good: another window holds it, the room is gone, or the app is out of date. */
  onClosed: (why: ClosedWhy) => void;
}

export class ComputerSeat {
  private conn: RoomConnection | null = null;
  private online: Online | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private search: BotSearch | null = null;
  /** The position a move was last sent for (moves and resignations so far), so it is sent once. */
  private sentFor = -1;

  constructor(private readonly deps: ComputerSeatDeps) {}

  start(): void {
    const { code, token } = this.deps;
    const conn = new RoomConnection({
      open: this.deps.open,
      hello: () => JSON.stringify({ v: 1, type: 'join', code, token }),
      onMessage: (m) => this.onMessage(m),
      onStatus: (s, why) => this.onStatus(s, why),
      probe: this.deps.probe,
    });
    this.conn = conn;
    conn.start();
  }

  stop(): void {
    this.cancel();
    this.conn?.stop();
    this.conn = null;
  }

  nudge(): void {
    this.conn?.nudge();
  }

  private cancel(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.search?.cancel();
    this.search = null;
  }

  private onStatus(status: Status, why?: ClosedWhy): void {
    if (status === 'closed') {
      this.stop();
      if (why) this.deps.onClosed(why);
      return;
    }
    if (this.online) {
      this.online = setConnection(this.online, status);
      this.think();
    }
  }

  private onMessage(message: ServerMessage): void {
    if (message.type === 'snapshot') {
      this.online = startOnline(message, undefined, 'open');
      if (!this.online) return this.deps.onClosed('outdated');
    } else if (this.online) {
      this.online = applyServer(this.online, message);
    }
    const o = this.online;
    if (o && (o.closed !== null || o.model.game.result.status !== 'ongoing')) return this.stop();
    this.think();
  }

  /** Move, if it is this seat's turn and nothing stands in the way. */
  private think(): void {
    this.cancel();
    const o = this.online;
    if (!o || !canPlay(o)) return;
    const game = o.model.game;
    const position = game.moves.length + game.resignations.length;
    if (position === this.sentFor) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.search = searchMove(
        game,
        (move) => {
          this.search = null;
          // Play the move only on the game it was found for.
          if (!move || this.online?.model.game !== game) return;
          if (this.conn?.send({ v: 1, type: 'move', move: toNotation(move) })) {
            this.sentFor = position;
          }
        },
        levelOf(game, {}, this.deps.seat),
      );
    }, BOT_DELAY_MS);
  }
}
