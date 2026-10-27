// What the 3-player search plays for (S62, decision D59). The search is paranoid: the seat it
// searches for maximizes its own score and the other two seats are taken to play together to
// minimize it, so the tree is a 2-sided one and alpha-beta still prunes (search.ts). This file is
// the score: a seat's own material less the other seats' (S23's piece values) and its win
// conditions in decision 0016, the Kings for the Kinged players, the Kings and the Tail's safety
// for the Dragon. A finished game, or the seat being out, is a win or a loss for it.
//
// The weights are playing heuristics, not rules, and provisional until S59 reports how the seats
// fare (hundredths of a value unit, like `pieceValues`). The greedy player (S58) uses them too.
import type { GameState } from '../game/game';
import { activeKinged, attackersOn, three, TAIL, type Three } from '../game/three';

/** A Kinged seat is out: the Dragon captured (or checkmated) its King. */
export const KING_CAPTURE = 20_000;
/** The mover's own King is lost to the Dragon's capture (the greedy player's view of it). */
export const KING_LOST = 40_000;
/** The Tail is in stone; the Dragon out counts twice. */
export const TAIL_STONE = 1_500;
/** A King that a Dragon piece attacks (the Dragon may take it next turn), or a Tail under attack. */
export const KING_EXPOSED = 6_000;
/** For the Dragon: per King its pieces attack. */
export const KING_ATTACKED = 600;
/** A Kinged player's piece gives check to the other King, or to the Tail. */
export const CHECK = 150;
/** Per square the Tail could go to that a Kinged player attacks, taken from the Dragon's score. */
export const TAIL_SQUARE = 40;

const roles = new WeakMap<GameState['rules'], Map<string, Three>>();

/** The roles of a 3-player game, worked out once per ruleset and turn order. */
export function threeOf(state: Pick<GameState, 'rules' | 'order'>): Three {
  let byOrder = roles.get(state.rules);
  if (!byOrder) roles.set(state.rules, (byOrder = new Map()));
  const key = state.order.join(',');
  let g = byOrder.get(key);
  if (!g) byOrder.set(key, (g = three(state.rules, state.order)));
  return g;
}

/** A won game's score, less one per ply it takes to reach, so a faster win scores higher. */
export const MATE = 1_000_000;

/**
 * Whether the game is over for `seat`: it has ended, or the seat is out (its King captured, or
 * the Dragon out). The search stops there.
 */
export const overFor = (state: GameState, seat: string): boolean =>
  state.result.status !== 'ongoing' || state.seats[seat] === 'out';

/**
 * The score of a game over for `seat`, `ply` moves from the root: a win, a loss (including being
 * out while the others play on), or a draw it shares (0). A draw between the other two is a loss.
 */
export function terminalFor(state: GameState, seat: string, ply: number): number {
  const { result } = state;
  if (result.status === 'win') return result.winner === seat ? MATE - ply : -(MATE - ply);
  if (result.status === 'draw') {
    return result.between === undefined || result.between.includes(seat) ? 0 : -(MATE - ply);
  }
  return -(MATE - ply);
}

/** How `seat` rates a 3-player position that is still going for it; higher is better. */
export function evaluateFor(
  state: GameState,
  seat: string,
  values: Record<string, number>,
): number {
  const g = threeOf(state);
  const { position, seats } = state;
  let score = 0;
  for (const p of Object.values(position)) {
    if (p.stone === true || p.piece === TAIL) continue;
    score += (p.side === seat ? 1 : seats[p.side] === 'out' ? 0 : -1) * (values[p.piece] ?? 0);
  }
  const kinged = activeKinged(g, seats);
  if (seat === g.dragon) {
    score += KING_CAPTURE * (g.kinged.length - kinged.length);
    for (const k of kinged) {
      if (attackersOn(g, position, seats, k, [g.dragon]).length > 0) score += KING_ATTACKED;
    }
    if (seats[seat] === 'tail-stone') score -= TAIL_STONE;
    else if (attackersOn(g, position, seats, seat).length > 0) score -= KING_EXPOSED;
    return score;
  }
  if (seats[g.dragon] === 'tail-stone') score += TAIL_STONE;
  else if (seats[g.dragon] === 'out') score += 2 * TAIL_STONE;
  if (attackersOn(g, position, seats, seat, [g.dragon]).length > 0) score -= KING_EXPOSED;
  return score;
}
