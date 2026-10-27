// One self-play game: a few random opening plies, then the engine's search plays both seats until
// the game ends or reaches the safety cap. Deterministic for a given seed (decision 0008).
import {
  bestMove,
  newGame,
  playMove,
  toNotation,
  type DrawReason,
  type TimeoutDraw,
  type GameInit,
  type MoveRules,
  type WinReason,
} from '@chess9s/engine';

export interface PlayOptions {
  /** Full-width search depth in plies. */
  depth: number;
  /** Positions the search may visit per move. */
  nodes: number;
  seed: number;
  /** Random plies before the search takes over. */
  openingPlies: number;
  /** Plies after which an unfinished game stops. */
  maxPlies: number;
  /** A start other than the board's start position (tests). */
  init?: GameInit;
}

/** Who won, seen from the turn order: `first` is the seat that moves first under the ruleset. */
export type Outcome = 'first' | 'second' | 'draw';

export interface GameSummary {
  seed: number;
  /** The seat that moves first in the turn order, and the other one. */
  first: string;
  second: string;
  outcome: Outcome;
  // Bots never resign or agree a draw, but the engine's result types allow both (S51).
  reason: WinReason | DrawReason | TimeoutDraw | 'agreement' | 'unfinished';
  winner: string | null;
  plies: number;
  /** Shallowest depth the search finished on any of its moves (0 if it never searched). */
  minDepth: number;
  /** Moves on which the node budget ran out before the search reached its depth. */
  capped: number;
  /** A hash of the moves, to count distinct games. */
  key: string;
}

/** mulberry32: a small seeded generator returning [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, 32-bit, as 8 hex digits. */
export function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function playGame(
  rules: MoveRules,
  ruleset: { id: string; version: string },
  options: PlayOptions,
): GameSummary {
  const random = seeded(options.seed);
  let state = newGame(rules, ruleset, options.init);
  const [first, second] = state.order as [string, string];
  let minDepth = Infinity;
  let capped = 0;
  while (state.result.status === 'ongoing' && state.moves.length < options.maxPlies) {
    if (state.moves.length < options.openingPlies) {
      state = playMove(state, state.legal[Math.floor(random() * state.legal.length)]!);
      continue;
    }
    const found = bestMove(state, { depth: options.depth, nodes: options.nodes, random });
    minDepth = Math.min(minDepth, found.depth);
    if (found.capped) capped++;
    state = playMove(state, found.move!);
  }
  const { result } = state;
  const base = {
    seed: options.seed,
    first,
    second,
    plies: state.moves.length,
    minDepth: minDepth === Infinity ? 0 : minDepth,
    capped,
    key: hash(state.moves.map(toNotation).join(' ')),
  };
  if (result.status === 'win') {
    const outcome = result.winner === first ? 'first' : 'second';
    return { ...base, outcome, reason: result.reason, winner: result.winner };
  }
  if (result.status === 'draw')
    return { ...base, outcome: 'draw', reason: result.reason, winner: null };
  return { ...base, outcome: 'draw', reason: 'unfinished', winner: null };
}
