// What a click does in a hot-seat game: select a piece, show its legal moves, play one, ask
// for a promotion piece. Pure functions over a model; React only draws it. The engine decides
// every rule (legal moves, check, game end); nothing here knows how a piece moves.
import {
  findMove,
  newGame,
  playMove,
  type GameState,
  type GeneratedMove,
  type MoveRules,
} from '@chess9s/engine';
import type { Highlights } from '../board/view';
import { createRules, ruleset, type RulesetInfo } from './rules';

export interface Promoting {
  from: string;
  to: string;
  /** The pieces the pawn may become. */
  choices: string[];
}

export interface Model {
  game: GameState;
  /** The square of the piece whose moves are shown. */
  selected: string | null;
  /** A promotion waiting for the player to pick a piece. */
  promoting: Promoting | null;
}

export const fromGame = (game: GameState): Model => ({ game, selected: null, promoting: null });

export function newModel(
  rules: MoveRules = createRules(),
  info: Pick<RulesetInfo, 'id' | 'version'> = ruleset,
): Model {
  return fromGame(newGame(rules, { id: info.id, version: info.version }));
}

const movesFrom = (game: GameState, from: string): GeneratedMove[] =>
  game.legal.filter((m) => m.from === from);

const played = (model: Model, move: GeneratedMove): Model => fromGame(playMove(model.game, move));

/** A click on a square: play a shown move, or select the piece standing there, or clear. */
export function click(model: Model, at: string): Model {
  const { game, selected } = model;
  if (game.result.status !== 'ongoing' || model.promoting) return model;

  if (selected && at !== selected) {
    const moves = movesFrom(game, selected).filter((m) => m.to === at);
    if (moves.length === 1 && moves[0]!.promotion === undefined) return played(model, moves[0]!);
    if (moves.length > 0) {
      const choices = moves.flatMap((m) => m.promotion ?? []);
      return { ...model, promoting: { from: selected, to: at, choices } };
    }
  }
  if (at !== selected && movesFrom(game, at).length > 0) return { ...model, selected: at };
  return { ...model, selected: null };
}

/** The player picked a promotion piece. A piece that is not a choice changes nothing. */
export function promote(model: Model, piece: string): Model {
  const { promoting } = model;
  if (!promoting) return model;
  const move = findMove(model.game, promoting.from, promoting.to, piece);
  return move ? played(model, move) : model;
}

export const cancelPromotion = (model: Model): Model =>
  model.promoting ? { ...model, selected: null, promoting: null } : model;

/** What the board shows besides the pieces. */
export function highlights(model: Model): Highlights {
  const { game, selected } = model;
  const ongoing = game.result.status === 'ongoing';
  const last = game.moves.at(-1);
  const royal = Object.entries(game.position)
    .filter(([, p]) => p.side === game.turn && game.rules.pieces[p.piece]?.royal === true)
    .map(([at]) => at);
  return {
    ...(selected && { selected }),
    targets: selected
      ? [...new Map(movesFrom(game, selected).map((m) => [m.to, m])).values()].map((m) => ({
          at: m.to,
          capture: m.capture !== undefined,
        }))
      : [],
    ...(last && { lastMove: [last.from, last.to] as [string, string] }),
    check: game.inCheck ? royal : [],
    movable: ongoing ? [...new Set(game.legal.map((m) => m.from))].sort() : [],
  };
}

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** One line on the state of the game: whose move, check, or how it ended. */
export function statusLine({ result, turn, inCheck }: GameState): string {
  switch (result.status) {
    case 'ongoing':
      return `${title(turn)} to move${inCheck ? ' · in check' : ''}`;
    case 'draw':
      return `${title(result.reason)} · draw`;
    case 'win':
      return `${title(result.reason)} · ${title(result.winner)} wins`;
  }
}

export interface Round {
  number: number;
  first: string;
  second?: string;
}

/** The moves played, two to a round, as notation (`e2-e4`, `e5xd6`, `d8-d9=queen`). */
export function rounds({ moves }: GameState): Round[] {
  const out: Round[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const second = moves[i + 1]?.notation;
    out.push({ number: i / 2 + 1, first: moves[i]!.notation, ...(second && { second }) });
  }
  return out;
}
