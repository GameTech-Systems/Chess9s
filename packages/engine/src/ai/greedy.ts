// 3-player computer, greedy first (S58, decision D59): one move of look-ahead at most. The seat to
// move takes a winning move first, then a King capture, then the move whose position rates best for
// that seat's goals in decision 0016: the Kings for the Kinged players, the Kings and the Tail's
// safety for the Dragon. Pieces are worth what S23's `pieceValues` says. No search: each legal move
// is rated by the position it leads to (the engine's own `outcomes`, so a checkmate, a King capture
// or a Tail in stone is seen as the rules play it). Ties are broken by the random source passed in
// (decision 0008), so the same seed gives the same game.
//
// The weights below are playing heuristics, not rules, and provisional until S59 reports how the
// seats fare (hundredths of a value unit, like `pieceValues`).
import { attackMap } from '../moves/check';
import { attacksFrom, toNotation, type GeneratedMove } from '../moves/generate';
import type { GameState } from '../game/game';
import {
  activeKinged,
  checkersOn,
  outcomes,
  three,
  TAIL,
  type Outcome,
  type Three,
} from '../game/three';
import { pieceValues } from './search';

/** A move that wins the game outright. */
const WIN = 1_000_000;
/** The Dragon's move takes a King (captures or checkmates it): worth more than any capture. */
const KING_CAPTURE = 20_000;
/** The mover's own King is lost to the Dragon's capture. */
const KING_LOST = 40_000;
/** A Kinged player's move turns the Tail to stone. */
const TAIL_STONE = 1_500;
/** Per King of a Kinged player that a Dragon piece attacks (the Dragon may take it next turn). */
const KING_EXPOSED = 6_000;
/** The Dragon's pieces attack a King: it must answer or may be taken. */
const KING_ATTACKED = 600;
/** A Kinged player's piece gives check to the other King, or to the Tail. */
const CHECK = 150;
/** Per square the Tail could go to that a Kinged player attacks, taken from the Dragon's score. */
const TAIL_SQUARE = 40;

/** What a position is worth to `seat`, in hundredths: its material less the other seats'. */
function material(g: Three, o: Outcome, seat: string, values: Record<string, number>): number {
  let score = 0;
  for (const p of Object.values(o.position)) {
    if (p.stone === true || p.piece === TAIL) continue;
    score += (p.side === seat ? 1 : o.seats[p.side] === 'out' ? 0 : -1) * (values[p.piece] ?? 0);
  }
  return g.order.includes(seat) ? score : 0;
}

/** Squares of the royal pieces of `side`: its King, or the Dragon's active Tail. */
function royalSquares(g: Three, o: Outcome, side: string): string[] {
  if (o.seats[side] !== 'active') return [];
  return Object.keys(o.position).filter((at) => {
    const p = o.position[at]!;
    if (p.side !== side || p.stone === true) return false;
    return side === g.dragon ? p.piece === TAIL : g.rules.pieces[p.piece]?.royal === true;
  });
}

/** How `seat` rates the position a move leads to; higher is better. */
function rate(g: Three, o: Outcome, seat: string, values: Record<string, number>): number {
  const { result } = o;
  if (result !== null) {
    if (result.status === 'win') return result.winner === seat ? WIN : -WIN;
    return 0;
  }
  let score = material(g, o, seat, values);

  for (const e of o.events) {
    if (e.kind === 'king-captured') score += e.side === seat ? -KING_LOST : KING_CAPTURE;
    else if (e.kind === 'tail-stone') {
      score += seat === g.dragon ? -TAIL_STONE : e.by === seat ? TAIL_STONE : TAIL_STONE / 3;
    } else if (e.kind === 'dragon-out' && seat !== g.dragon) score += TAIL_STONE;
  }

  // A piece that ends its move where an opponent attacks it is worth less to keep: half if the
  // mover's own side guards the square, all of it if not.
  const to = o.move.castle ? o.move.castle.to : o.move.to;
  const moved = o.position[to];
  const worth = moved ? (values[moved.piece] ?? 0) : 0;
  if (moved && worth > 0 && moved.stone !== true) {
    const rivals = g.order.filter((s) => s !== seat && o.seats[s] !== 'out');
    const attacked = rivals.some((s) => attackMap(g.rules, o.position, s).includes(to));
    if (attacked) {
      const guarded = attackMap(g.rules, o.position, seat).includes(to);
      score -= guarded ? worth / 2 : worth;
    }
  }

  const dragonAttacks = attackMap(g.rules, o.position, g.dragon);
  if (seat === g.dragon) {
    for (const k of activeKinged(g, o.seats)) {
      for (const at of royalSquares(g, o, k))
        if (dragonAttacks.includes(at)) score += KING_ATTACKED;
    }
    const kingedAttacks = new Set(
      activeKinged(g, o.seats).flatMap((k) => attackMap(g.rules, o.position, k)),
    );
    for (const at of royalSquares(g, o, g.dragon)) {
      for (const to of attacksFrom(g.rules, o.position, at)) {
        if (kingedAttacks.has(to)) score -= TAIL_SQUARE;
      }
    }
    // The rules keep the Tail out of attack unless it can't be helped.
    if (checkersOn(g, o.position, o.seats, seat).length > 0) score -= KING_EXPOSED;
    return score;
  }

  for (const at of royalSquares(g, o, seat)) if (dragonAttacks.includes(at)) score -= KING_EXPOSED;
  for (const other of activeKinged(g, o.seats).filter((k) => k !== seat)) {
    if (checkersOn(g, o.position, o.seats, other, [seat]).length > 0) score += CHECK;
  }
  if (checkersOn(g, o.position, o.seats, g.dragon, [seat]).length > 0) score += CHECK;
  return score;
}

export interface GreedyOptions {
  /** Picks among equally rated moves, returning [0, 1). Without it the first in notation order. */
  random?: () => number;
}

/**
 * The move the greedy player picks for the seat to move in a 3-player game, or none when the game
 * is over or the seat has no move.
 */
export function greedyMove(
  state: GameState,
  options: GreedyOptions = {},
): GeneratedMove | undefined {
  if (state.rules.players !== 3) throw new Error('The greedy player plays 3-player games');
  if (state.result.status !== 'ongoing' || state.legal.length === 0) return undefined;
  const g = three(state.rules, state.order);
  const values = pieceValues(state.rules);
  const found = outcomes(
    g,
    { position: state.position, seats: state.seats, lost: state.lost, passing: state.passing },
    state.turn,
  );
  if (found.length === 0) return undefined;
  let best = -Infinity;
  let ties: Outcome[] = [];
  for (const o of found) {
    const score = rate(g, o, state.turn, values);
    if (score > best) {
      best = score;
      ties = [o];
    } else if (score === best) ties.push(o);
  }
  const { random } = options;
  const pick = random
    ? ties[Math.min(ties.length - 1, Math.floor(random() * ties.length))]
    : ties[0];
  // The same move object the game lists as legal, as `bestMove` returns.
  const notation = toNotation(pick!.move);
  return state.legal.find((m) => toNotation(m) === notation) ?? pick!.move;
}
