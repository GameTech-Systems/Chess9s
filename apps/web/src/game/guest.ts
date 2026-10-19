// Guest play: the game in progress is kept in the browser (no account). Only the ruleset id and
// version, the mode and the moves are stored; a load replays them through the engine, so a saved
// game can never hold an illegal position.
import { playMove, toNotation, type GameState, type MoveRules } from '@chess9s/engine';
import { newModel } from './session';
import type { RulesetInfo } from './rules';

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
}

const KEY = 'chess9s.guest';

export function saveGuest(store: Store, { game, mode }: Guest): void {
  try {
    const { id, version } = game.ruleset;
    const moves = game.moves.map((m) => m.notation);
    store.setItem(KEY, JSON.stringify({ v: 1, ruleset: id, version, mode, moves }));
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

/** The saved game for this exact ruleset version, or null when none or it does not replay. */
export function loadGuest(
  store: Store,
  rules: MoveRules,
  info: Pick<RulesetInfo, 'id' | 'version'>,
): Guest | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    if (
      saved.v !== 1 ||
      saved.ruleset !== info.id ||
      saved.version !== info.version ||
      (saved.mode !== 'hot-seat' && saved.mode !== 'computer') ||
      !Array.isArray(saved.moves)
    ) {
      return null;
    }
    let { game } = newModel(rules, info);
    for (const notation of saved.moves) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      if (!move) return null;
      game = playMove(game, move);
    }
    return { game, mode: saved.mode };
  } catch {
    return null;
  }
}
