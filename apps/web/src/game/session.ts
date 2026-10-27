// What a click does in a hot-seat game: select a piece, show its legal moves, play one, ask
// for a promotion piece. Pure functions over a model; React only draws it. The engine decides
// every rule (legal moves, check, game end); nothing here knows how a piece moves.
import {
  attackMap,
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
  /** Earlier states of this game, oldest first; undo pops the last. */
  history: GameState[];
  /** Play aid: show the selected piece's legal moves (on by default). */
  showMoves: boolean;
  /** Play aid: mark the side to move's pieces that the other side attacks (off by default, provisional). */
  showDanger: boolean;
}

export const fromGame = (game: GameState): Model => ({
  game,
  selected: null,
  promoting: null,
  history: [],
  showMoves: true,
  showDanger: false,
});

export function newModel(
  rules: MoveRules = createRules(),
  info: Pick<RulesetInfo, 'id' | 'version' | 'overrides'> = ruleset,
): Model {
  const { id, version, overrides } = info;
  return fromGame(newGame(rules, { id, version, ...(overrides && { overrides }) }));
}

const movesFrom = (game: GameState, from: string): GeneratedMove[] =>
  game.legal.filter((m) => m.from === from);

/** The square a move is chosen by: its to-square, or for castling the partner's (King onto Rook). */
const pickedAt = (m: GeneratedMove): string => m.castle?.from ?? m.to;

const played = (model: Model, move: GeneratedMove): Model => ({
  ...model,
  game: playMove(model.game, move),
  selected: null,
  promoting: null,
  history: [...model.history, model.game],
});

/** A move chosen outside the board (the computer's), recorded like a click-made one. */
export const playFor = played;

export const canUndo = (model: Model): boolean => model.history.length > 0;

/** Take back the last move (hot-seat only; online play will not offer it). */
export function undo(model: Model): Model {
  const game = model.history.at(-1);
  if (!game) return model;
  return { ...model, game, selected: null, promoting: null, history: model.history.slice(0, -1) };
}

export const toggleMoves = (model: Model): Model => ({ ...model, showMoves: !model.showMoves });
export const toggleDanger = (model: Model): Model => ({ ...model, showDanger: !model.showDanger });

/** A click on a square: play a shown move, or select the piece standing there, or clear. */
export function click(model: Model, at: string): Model {
  const { game, selected } = model;
  if (game.result.status !== 'ongoing' || model.promoting) return model;

  if (selected && at !== selected) {
    const moves = movesFrom(game, selected).filter((m) => pickedAt(m) === at);
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

/** Squares of the side to move's pieces that any other side attacks. */
function endangered(game: GameState): string[] {
  const threatened = new Set(
    [...new Set(Object.values(game.position).map((p) => p.side))]
      .filter((side) => side !== game.turn)
      .flatMap((side) => attackMap(game.rules, game.position, side)),
  );
  return Object.entries(game.position)
    .filter(([at, p]) => p.side === game.turn && threatened.has(at))
    .map(([at]) => at)
    .sort();
}

/** What the board shows besides the pieces. */
export function highlights(model: Model): Highlights {
  const { game, selected, showMoves, showDanger } = model;
  const ongoing = game.result.status === 'ongoing';
  const last = game.moves.at(-1);
  const royal = Object.entries(game.position)
    .filter(([, p]) => p.side === game.turn && game.rules.pieces[p.piece]?.royal === true)
    .map(([at]) => at);
  return {
    ...(selected && { selected }),
    targets:
      selected && showMoves
        ? [...new Map(movesFrom(game, selected).map((m) => [pickedAt(m), m])).values()].map(
            (m) => ({ at: pickedAt(m), capture: m.capture !== undefined }),
          )
        : [],
    ...(last && { lastMove: [last.from, last.to] as [string, string] }),
    check: game.inCheck ? royal : [],
    danger: showDanger && ongoing ? endangered(game) : [],
    movable: ongoing ? [...new Set(game.legal.map((m) => m.from))].sort() : [],
  };
}

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

const REASONS: Record<string, string> = {
  'insufficient-material': 'Insufficient material',
  'fifty-move': 'Fifty-move rule',
  repetition: 'Threefold repetition',
  agreement: 'By agreement',
};

/** One line on the state of the game: whose move, check, or how it ended. */
export function statusLine({ result, turn, inCheck }: GameState): string {
  switch (result.status) {
    case 'ongoing':
      return `${title(turn)} to move${inCheck ? ' · in check' : ''}`;
    case 'draw':
      return `${REASONS[result.reason] ?? title(result.reason)} · draw`;
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
