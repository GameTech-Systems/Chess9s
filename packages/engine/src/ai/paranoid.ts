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
import { squareTypes, type MoveRules, type Position } from '../moves/generate';

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
/**
 * For the Dragon, while its pieces must leave the Coast through A5 (decision 0019): per Dragon
 * Head, Sun or Moon that has left the Coast, and per square from A5 that one still to go out
 * through it stands. Neither search depth sees far enough to walk a piece out on its own (S68).
 */
export const DEVELOPED = 150;
export const COAST_STEP = 20;

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

const COAST = 'coast';
const GATE = 'coast-gate';
const gates = new WeakMap<MoveRules, string[]>();

/**
 * How far out the Dragon's pieces are, for its own score (S68): DEVELOPED for each Head, Sun or
 * Moon that has left the Coast, less COAST_STEP per square between A5 and each one that must still
 * go out through it, and COAST_STEP if the Tail stands on A5 while one must. Nothing when Coast
 * pieces may leave with any legal move, so those games play as before S68.
 */
export function development(rules: MoveRules, position: Position, dragon: string): number {
  const exit = rules.values['coast.3p.exit'];
  if (exit !== 'a5-first-then-any' && exit !== 'a5-always') return 0;
  const types = squareTypes(rules.board);
  let gate = gates.get(rules);
  if (!gate)
    gates.set(rules, (gate = [...types].filter(([, t]) => t.includes(GATE)).map(([at]) => at)));
  const steps = (at: string) =>
    Math.min(
      ...gate!.map((g) =>
        Math.max(
          Math.abs(at.charCodeAt(0) - g.charCodeAt(0)),
          Math.abs(Number(at.slice(1)) - Number(g.slice(1))),
        ),
      ),
    );
  let score = 0;
  let waiting = false;
  let tailOnGate = false;
  for (const [at, p] of Object.entries(position)) {
    if (p.side !== dragon || p.stone === true) continue;
    const here = types.get(at) ?? [];
    if (p.piece === TAIL) {
      tailOnGate ||= here.includes(GATE);
      continue;
    }
    const left = p.left?.includes(COAST) === true;
    if (left || !here.includes(COAST)) score += DEVELOPED;
    if (here.includes(COAST) && !here.includes(GATE) && (exit === 'a5-always' || !left)) {
      score -= COAST_STEP * steps(at);
      waiting = true;
    }
  }
  return tailOnGate && waiting ? score - COAST_STEP : score;
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
    return score + development(state.rules, position, seat);
  }
  if (seats[g.dragon] === 'tail-stone') score += TAIL_STONE;
  else if (seats[g.dragon] === 'out') score += 2 * TAIL_STONE;
  if (attackersOn(g, position, seats, seat, [g.dragon]).length > 0) score -= KING_EXPOSED;
  return score;
}
