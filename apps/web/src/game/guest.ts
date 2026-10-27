// Guest play: the game in progress is kept in the browser (no account). Only the ruleset id and
// version (and a custom ruleset's full overrides), the mode and the moves are stored; a load replays them through the engine, so a saved
// game can never hold an illegal position.
import {
  playMove,
  replayResignations,
  toNotation,
  type GameState,
  type MoveRules,
  type Resignation,
} from '@chess9s/engine';
import { MAX_BOT_SEATS } from './bots';
import { newModel } from './session';
import { same, type RulesetInfo } from './rules';

export type Mode = 'hot-seat' | 'computer';

/** The part of `Storage` used here. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Guest {
  game: GameState;
  mode: Mode;
  /** 3-player games: the seats the computer plays (S58); none or absent for hot-seat. */
  bots?: string[];
}

const KEY = 'chess9s.guest';

export function saveGuest(store: Store, { game, mode, bots }: Guest): void {
  try {
    const { id, version, overrides } = game.ruleset;
    const moves = game.moves.map((m) => m.notation);
    store.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        ruleset: id,
        version,
        ...(overrides && { overrides }),
        mode,
        ...(bots && bots.length > 0 && { bots }),
        moves,
        ...(game.resignations.length > 0 && { resignations: game.resignations }),
      }),
    );
  } catch {
    // Storage blocked or full: the game goes on, just not kept.
  }
}

export function clearGuest(store: Store): void {
  try {
    store.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * The saved game for this exact ruleset version (and, for a custom ruleset, these exact
 * overrides), or null when none or it does not replay.
 */
export function loadGuest(
  store: Store,
  rules: MoveRules,
  info: Pick<RulesetInfo, 'id' | 'version' | 'overrides'>,
): Guest | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    if (
      saved.v !== 1 ||
      saved.ruleset !== info.id ||
      saved.version !== info.version ||
      !same(saved.overrides ?? null, info.overrides ?? null) ||
      (saved.mode !== 'hot-seat' && saved.mode !== 'computer') ||
      !Array.isArray(saved.moves)
    ) {
      return null;
    }
    // 3-player resignations (S67): each made after so many moves, replayed in its place.
    const resigned = (saved.resignations ?? []) as Resignation[];
    if (!Array.isArray(resigned)) return null;
    let { game } = newModel(rules, info);
    game = replayResignations(game, resigned);
    for (const notation of saved.moves) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      if (!move) return null;
      game = replayResignations(playMove(game, move), resigned);
    }
    if (!same(resigned, game.resignations)) return null;
    // The computer's seats: seats of this game, at most two, and only in 3-player games.
    const seats = Array.isArray(saved.bots) ? (saved.bots as unknown[]) : [];
    const bots =
      rules.players === 3 &&
      seats.length <= MAX_BOT_SEATS &&
      seats.every((s) => typeof s === 'string' && game.order.includes(s))
        ? (seats as string[])
        : [];
    return { game, mode: saved.mode, ...(bots.length > 0 && { bots }) };
  } catch {
    return null;
  }
}
