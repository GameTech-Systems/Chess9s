// One 3-player self-play game (S58): a few random opening plies, then the greedy player, or the
// paranoid search at a depth (S62), plays every seat until the game ends or reaches the safety cap.
// With `greedyDragon` the Dragon plays greedy against searching Kinged players (S59). Deterministic
// for a given seed (decision 0008). The balance measures are in stats3.ts (decision 0015).
import {
  bestMove,
  greedyMove,
  newGame,
  playMove,
  toNotation,
  type DrawReason,
  type GameEvent,
  type GameInit,
  three,
  type MoveRules,
  type WinReason,
} from '@chess9s/engine';
import { hash, seeded } from './play';

export interface Play3Options {
  seed: number;
  /** Random plies before the greedy player takes over. */
  openingPlies: number;
  /** Plies after which an unfinished game stops. */
  maxPlies: number;
  /** A start other than the board's start position (tests). */
  init?: GameInit;
  /** Every seat searches at this depth with this many positions per move; greedy without it. */
  search?: { depth: number; nodes: number };
  /** With `search`: the Dragon plays greedy and only the Kinged players search. */
  greedyDragon?: boolean;
}

export interface Summary3 {
  seed: number;
  /** The seats in turn order. */
  order: string[];
  /** The Dragon's seat. */
  dragon: string;
  outcome: 'win' | 'draw' | 'unfinished';
  winner: string | null;
  /** The seat the deciding move beat. */
  loser: string | null;
  reason: WinReason | DrawReason | 'unfinished';
  /** The seats that share a draw; null unless the game was drawn. */
  between: string[] | null;
  /**
   * What happened along the way, in order: `king-captured:<side>` (the Dragon took that King),
   * `tail-stone:<side>` (that seat checkmated the Tail) and `dragon-out`.
   */
  events: string[];
  plies: number;
  /** A hash of the moves, to count distinct games. */
  key: string;
}

export function playGame3(
  rules: MoveRules,
  ruleset: { id: string; version: string },
  options: Play3Options,
): Summary3 {
  if (rules.players !== 3) throw new Error(`${ruleset.id} is not a 3-player ruleset`);
  const random = seeded(options.seed);
  let state = newGame(rules, ruleset, options.init);
  const { dragon } = three(rules, state.order);
  const greedy = (side: string) => !options.search || (options.greedyDragon && side === dragon);
  while (state.result.status === 'ongoing' && state.moves.length < options.maxPlies) {
    const move =
      state.moves.length < options.openingPlies
        ? state.legal[Math.floor(random() * state.legal.length)]
        : greedy(state.turn)
          ? greedyMove(state, { random })
          : bestMove(state, { ...options.search!, random }).move;
    if (!move) break;
    state = playMove(state, move);
  }
  const { result } = state;
  const base = {
    seed: options.seed,
    order: [...state.order],
    dragon,
    between: null,
    events: state.moves.flatMap((m) => (m.events ?? []).flatMap(eventOf)),
    plies: state.moves.length,
    key: hash(state.moves.map(toNotation).join(' ')),
  };
  if (result.status === 'win') {
    return {
      ...base,
      outcome: 'win',
      winner: result.winner,
      loser: result.loser,
      reason: result.reason,
    };
  }
  if (result.status === 'draw') {
    return {
      ...base,
      outcome: 'draw',
      winner: null,
      loser: null,
      reason: result.reason as DrawReason,
      between: [...(result.between ?? state.order)],
    };
  }
  return { ...base, outcome: 'unfinished', winner: null, loser: null, reason: 'unfinished' };
}

const eventOf = (e: GameEvent): string[] =>
  e.kind === 'king-captured'
    ? [`king-captured:${e.side}`]
    : e.kind === 'tail-stone'
      ? [`tail-stone:${e.by}`]
      : e.kind === 'dragon-out'
        ? ['dragon-out']
        : [];
