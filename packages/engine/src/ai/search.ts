// Computer opponent v1 (S23): negamax with alpha-beta, iterative deepening and a capture-only
// quiescence search, over the engine's own legal moves (playMove), so it plays whichever ruleset
// is selected. The evaluation is material, and a piece's value comes from its movement data
// under the resolved ruleset, so parameters that change how a piece moves change what it is
// worth. These are playing heuristics, not rules. Deterministic: the search stops on a node
// budget (no clock), and ties are broken only by the random source passed in.
import { playMove, stateKey, type GameState } from '../game/game';
import {
  attacksFrom,
  movesFrom,
  squareTypes,
  toNotation,
  type GeneratedMove,
  type MoveRules,
} from '../moves/generate';

/** A checkmate's score, less one per ply it takes to reach, so a faster mate scores higher. */
const MATE = 1_000_000;
/** Most captures in a row the quiescence search follows past the nominal depth. */
const QUIESCENCE_PLIES = 4;

export interface SearchOptions {
  /** Most moves the search plays out (positions it visits); it stops deepening when spent. */
  nodes?: number;
  /** Deepest full-width search, in plies. */
  depth?: number;
  /** Picks among equally good moves, returning [0, 1). Without it the first in notation order. */
  random?: () => number;
}

export interface SearchResult {
  move: GeneratedMove | undefined;
  /** In hundredths of a value unit, from the side to move; near ±MATE for a forced mate. */
  score: number;
  /** Deepest search completed. */
  depth: number;
  nodes: number;
  /** The node budget ran out before the search reached its depth (or a forced mate). */
  capped: boolean;
}

const valueCache = new WeakMap<MoveRules, Record<string, number>>();

/**
 * Each piece's value, in hundredths: the average number of squares it could move to or attack
 * from each square of an otherwise empty board, for each side that has a forward direction.
 * Royal pieces are worth nothing (the search scores mate instead), and so are pieces no seat
 * starts with (the neutral Tail).
 */
export function pieceValues(rules: MoveRules): Record<string, number> {
  const cached = valueCache.get(rules);
  if (cached) return cached;
  const setup = rules.board.setups.find((s) => s.players === rules.players);
  const seats = new Set(rules.board.sides.map((s) => s.id));
  const owned = new Set(
    Object.entries(setup?.pieces ?? {})
      .filter(([side]) => seats.has(side))
      .flatMap(([, placed]) => Object.values(placed)),
  );
  const sides = rules.board.sides.filter((s) => s.forward !== undefined).map((s) => s.id);
  const squares = [...squareTypes(rules.board).keys()];
  const values: Record<string, number> = {};
  for (const [id, piece] of Object.entries(rules.pieces)) {
    if (piece.royal || !owned.has(id) || sides.length === 0) {
      values[id] = 0;
      continue;
    }
    let total = 0;
    for (const side of sides) {
      for (const at of squares) {
        const position = { [at]: { piece: id, side, moved: true } };
        const reach = new Set(attacksFrom(rules, position, at));
        for (const m of movesFrom(rules, position, at, {})) reach.add(m.to);
        total += reach.size;
      }
    }
    values[id] = Math.round((100 * total) / (sides.length * squares.length));
  }
  valueCache.set(rules, values);
  return values;
}

/** Hundredths per legal move of the side to move: enough to hem in a lone king, less than a pawn. */
const MOBILITY = 5;

/**
 * Material of the side to move less that of the other seats, in hundredths, plus a little for
 * each of its legal moves (already worked out with the state), so a side well ahead drives the
 * other king into a corner rather than shuffling.
 */
export function evaluate(state: GameState, values = pieceValues(state.rules)): number {
  let score = MOBILITY * state.legal.length;
  for (const placed of Object.values(state.position)) {
    if (placed.side === state.turn) score += values[placed.piece] ?? 0;
    else if (state.order.includes(placed.side)) score -= values[placed.piece] ?? 0;
  }
  return score;
}

/** The score of a finished game from the side to move, `ply` moves from the root. */
function terminal(state: GameState, ply: number): number {
  const { result } = state;
  if (result.status !== 'win') return 0;
  return result.winner === state.turn ? MATE - ply : -(MATE - ply);
}

const OUT_OF_NODES = Symbol('out of nodes');

/** How a transposition-table score relates to the true one: equal, at least, or at most. */
const EXACT = 0;
const LOWER = 1;
const UPPER = 2;

interface Entry {
  score: number;
  bound: typeof EXACT | typeof LOWER | typeof UPPER;
  /** The move that scored best, tried first when the position comes back. */
  move?: string;
}

const moveId = (m: GeneratedMove) => `${m.piece}:${toNotation(m)}`;

const valuesKey = new WeakMap<MoveRules, string>();

/**
 * What a transposition-table key starts with: the ruleset's id and version and every resolved
 * parameter value (a superset of those that change how pieces move), so a key never matches a
 * position played under other rules.
 */
export function rulesKey(state: Pick<GameState, 'ruleset' | 'rules'>): string {
  let values = valuesKey.get(state.rules);
  if (values === undefined) {
    const v = state.rules.values;
    values = Object.keys(v)
      .sort()
      .map((id) => `${id}=${JSON.stringify(v[id])}`)
      .join(';');
    valuesKey.set(state.rules, values);
  }
  return `${state.ruleset.id}@${state.ruleset.version}|${state.rules.players}|${values}`;
}

/** The move the search rates best for the side to move, or none when the game is over. */
export function bestMove(state: GameState, options: SearchOptions = {}): SearchResult {
  const { nodes: budget = 2000, depth: maxDepth = 6, random } = options;
  if (state.result.status !== 'ongoing' || state.legal.length === 0) {
    return { move: undefined, score: 0, depth: 0, nodes: 0, capped: false };
  }
  const values = pieceValues(state.rules);
  let nodes = 0;
  const play = (s: GameState, m: GeneratedMove): GameState => {
    if (nodes >= budget) throw OUT_OF_NODES;
    nodes++;
    return playMove(s, m);
  };

  // Captures first, the most valuable victim by the least valuable attacker, then promotions.
  const gain = (m: GeneratedMove) =>
    (m.capture !== undefined ? 16 * (values[m.capture] ?? 0) - (values[m.piece] ?? 0) : 0) +
    (m.promotion !== undefined ? (values[m.promotion] ?? 0) : 0);
  const ordered = (moves: GeneratedMove[]) =>
    moves
      .map((m, i) => [m, gain(m), i] as const)
      .sort((a, b) => b[1] - a[1] || a[2] - b[2])
      .map(([m]) => m);

  // The last iteration searches faster (S35, decision 0009): a transposition table, killer moves
  // and a history table. They change only the order moves are tried in and which subtrees are
  // skipped, so the exact scores at the root don't change. Earlier iterations search as S23 did,
  // because their scores, bounds included, set the root order that ties are listed in.
  let last = false;
  const table = new Map<string, Entry>();
  const killers: string[][] = [];
  const history = new Map<string, number>();
  const prefix = rulesKey(state);
  // Only a state reached by a capture or an irreversible move has no earlier position that could
  // repeat and no quiet moves counted, so only its key says everything about how it plays out.
  const keyOf = (s: GameState, ply: number, left: string) =>
    last && s.quiet === 0 ? `${prefix}\n${stateKey(s)}\n${ply}:${left}` : undefined;
  const probe = (key: string | undefined, alpha: number, beta: number) => {
    const e = key === undefined ? undefined : table.get(key);
    if (!e) return { hint: undefined, score: undefined };
    const fits =
      e.bound === EXACT ||
      (e.bound === LOWER && e.score >= beta) ||
      (e.bound === UPPER && e.score <= alpha);
    return { hint: e.move, score: fits ? e.score : undefined };
  };
  const store = (
    key: string | undefined,
    score: number,
    alpha: number,
    beta: number,
    move?: string,
  ) => {
    if (key === undefined) return;
    const bound = score <= alpha ? UPPER : score >= beta ? LOWER : EXACT;
    table.set(key, { score, bound, ...(move !== undefined && { move }) });
  };
  // The table's move first, then captures and promotions by gain, then killer moves, then the
  // other moves by how often they cut the search off, then in notation order.
  const orderedLast = (moves: GeneratedMove[], hint: string | undefined, ply: number) => {
    const killing = killers[ply] ?? [];
    return moves
      .map((m, i) => {
        const id = moveId(m);
        const tactical = m.capture !== undefined || m.promotion !== undefined;
        const k = killing.indexOf(id);
        const [group, within] =
          id === hint
            ? [3, 0]
            : tactical
              ? [2, gain(m)]
              : k >= 0
                ? [1, -k]
                : [0, history.get(id) ?? 0];
        return [m, group, within, i] as const;
      })
      .sort((a, b) => b[1] - a[1] || b[2] - a[2] || a[3] - b[3])
      .map(([m]) => m);
  };

  function quiesce(s: GameState, alpha: number, beta: number, ply: number, left: number): number {
    if (s.result.status !== 'ongoing') return terminal(s, ply);
    const stand = evaluate(s, values);
    if (left === 0 || stand >= beta) return stand;
    const key = keyOf(s, ply, `q${left}`);
    const found = probe(key, alpha, beta);
    if (found.score !== undefined) return found.score;
    const from = alpha;
    let best = stand;
    let bestMove: string | undefined;
    if (best > alpha) alpha = best;
    const captures = s.legal.filter((x) => x.capture !== undefined);
    for (const m of last ? orderedLast(captures, found.hint, ply) : ordered(captures)) {
      const score = -quiesce(play(s, m), -beta, -alpha, ply + 1, left - 1);
      if (score > best) {
        best = score;
        bestMove = moveId(m);
      }
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    store(key, best, from, beta, bestMove);
    return best;
  }

  function negamax(s: GameState, depth: number, alpha: number, beta: number, ply: number): number {
    if (s.result.status !== 'ongoing') return terminal(s, ply);
    if (depth <= 0) return quiesce(s, alpha, beta, ply, QUIESCENCE_PLIES);
    const key = keyOf(s, ply, `d${depth}`);
    const found = probe(key, alpha, beta);
    if (found.score !== undefined) return found.score;
    const from = alpha;
    let best = -Infinity;
    let bestMove: string | undefined;
    for (const m of last ? orderedLast(s.legal, found.hint, ply) : ordered(s.legal)) {
      const score = -negamax(play(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (score > best) {
        best = score;
        bestMove = moveId(m);
      }
      if (best > alpha) alpha = best;
      if (alpha >= beta) {
        if (last && m.capture === undefined && m.promotion === undefined) {
          const id = moveId(m);
          const k = (killers[ply] ??= []);
          if (k[0] !== id) killers[ply] = [id, ...k.filter((x) => x !== id)].slice(0, 2);
          history.set(id, (history.get(id) ?? 0) + depth * depth);
        }
        break;
      }
    }
    store(key, best, from, beta, bestMove);
    return best;
  }

  // Iterative deepening: each finished depth reorders the root moves best first for the next.
  // A depth cut short by the budget is dropped, except the first, which keeps what it finished.
  let ranked = ordered(state.legal);
  let ties: GeneratedMove[] = [ranked[0]!];
  let score = 0;
  let depth = 0;
  let capped = false;
  for (let d = 1; d <= maxDepth; d++) {
    last = d === maxDepth;
    const scored: [GeneratedMove, number][] = [];
    let complete = true;
    try {
      let alpha = -Infinity;
      for (const m of ranked) {
        // Integer scores: a window just under the best so far scores equal moves exactly.
        const s = -negamax(play(state, m), d - 1, -Infinity, -(alpha - 1), 1);
        scored.push([m, s]);
        if (s > alpha) alpha = s;
      }
    } catch (e) {
      if (e !== OUT_OF_NODES) throw e;
      complete = false;
      capped = true;
    }
    if (!complete && (d > 1 || scored.length === 0)) break;
    const top = Math.max(...scored.map(([, s]) => s));
    ties = scored.filter(([, s]) => s === top).map(([m]) => m);
    score = top;
    depth = d;
    if (!complete) break;
    const rank = new Map(scored.map(([m, s]) => [m, s]));
    ranked = [...ranked].sort((a, b) => rank.get(b)! - rank.get(a)!);
    if (Math.abs(top) >= MATE - maxDepth - QUIESCENCE_PLIES) break; // A forced mate is found.
  }
  const move = random
    ? ties[Math.min(ties.length - 1, Math.floor(random() * ties.length))]
    : ties[0];
  return { move, score, depth, nodes, capped };
}
