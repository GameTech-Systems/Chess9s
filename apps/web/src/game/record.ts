// The game record (S46): a finished or running game saved as a JSON file on the player's
// device, and read back for replay. It holds the ruleset id and version (and a custom ruleset's
// overrides), the turn order, the moves in notation, the result and the date; no names. A load
// replays the moves through the engine, so a record can never hold an illegal position, and it is
// refused when the replay does not give the recorded turn order and result.
import {
  endedBy,
  gameRecord,
  playMove,
  replayResignations,
  snapshot,
  startClock,
  toNotation,
  type GameState,
  type Resignation,
  type Times,
} from '@chess9s/engine';
import { newModel } from './session';
import { controlById } from './timeControls';
import { timedFromSaved, type Timed } from './timed';
import { createRulesFor, customInfo, findRuleset, same, type RulesetInfo } from './rules';

export const RECORD_FORMAT = 'chess9s-game-record';

/**
 * The record of a game as JSON text. `date` is the day it is saved, YYYY-MM-DD. A game played with
 * a clock also carries the time control, Show only and each seat's time left after each move
 * (S65, decision 0017); older records, and untimed games, have none of these.
 */
export const recordJson = (game: GameState, date: string, timed: Timed | null = null): string =>
  JSON.stringify(
    {
      format: RECORD_FORMAT,
      v: 1,
      ...gameRecord(game),
      ...(timed && {
        timeControl: timed.control.id,
        showOnly: timed.showOnly,
        timeLeft: timed.lefts,
      }),
      date,
    },
    null,
    2,
  );

/** The file name a record is saved as. */
export const recordFile = (info: Pick<RulesetInfo, 'id'>, date: string): string =>
  `chess9s-${info.id}-${date}.json`;

/** Save game record: a download from this page; nothing is sent anywhere. */
export function saveRecordFile(
  game: GameState,
  info: Pick<RulesetInfo, 'id'>,
  timed: Timed | null = null,
): void {
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(
    new Blob([recordJson(game, date, timed)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = recordFile(info, date);
  a.click();
  URL.revokeObjectURL(url);
}

export type Opened =
  | { ok: true; info: RulesetInfo; game: GameState; date: string; timed: Timed | null }
  | { ok: false; problem: string };

const refuse = (problem: string): Opened => ({ ok: false, problem });

/** A record read back and replayed, or the reason it was refused. */
export function openRecord(text: string): Opened {
  let saved: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return refuse('This file is not a Chess Nines game record.');
    }
    saved = parsed as Record<string, unknown>;
  } catch {
    return refuse('This file is not a Chess Nines game record (it is not JSON).');
  }
  if (saved.format !== RECORD_FORMAT) return refuse('This file is not a Chess Nines game record.');
  if (saved.v !== 1) return refuse('This game record is from a version this app cannot read.');
  const ref = saved.ruleset as { id?: unknown; version?: unknown; overrides?: unknown } | null;
  if (
    !ref ||
    typeof ref.id !== 'string' ||
    typeof ref.version !== 'string' ||
    (ref.overrides !== undefined && (typeof ref.overrides !== 'object' || ref.overrides === null))
  ) {
    return refuse('This game record does not name its ruleset.');
  }
  const { moves } = saved;
  if (!Array.isArray(moves) || !moves.every((m) => typeof m === 'string')) {
    return refuse('This game record has no list of moves.');
  }
  if (typeof saved.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved.date)) {
    return refuse('This game record has no valid date.');
  }

  let info: RulesetInfo | undefined;
  try {
    info = ref.overrides
      ? customInfo({
          id: ref.id,
          name: ref.id,
          players: saved.players === 3 ? 3 : 2,
          overrides: ref.overrides as NonNullable<RulesetInfo['overrides']>,
        })
      : findRuleset(ref.id, ref.version);
    if (!info)
      return refuse(`This game was played on ${ref.id} ${ref.version}, which is not known.`);
    // 3-player resignations (S67): a resignation is not a move, so the record says after how
    // many moves each was made.
    const resigned = saved.resignations ?? [];
    if (!Array.isArray(resigned))
      return refuse('This game record has an invalid list of resignations.');
    let { game } = newModel(createRulesFor(info), info);
    game = replayResignations(game, resigned as Resignation[]);
    for (const [i, notation] of moves.entries()) {
      const move = game.legal.find((m) => toNotation(m) === notation);
      if (!move) return refuse(`Move ${i + 1} (${notation}) is not legal in this game.`);
      game = replayResignations(playMove(game, move), resigned as Resignation[]);
    }
    if (!same(resigned, game.resignations)) {
      return refuse('The resignations in this game record do not match its moves.');
    }
    // A resignation or a draw by agreement (S51) ends a game that its moves leave going.
    game = endedBy(game, saved.result as GameState['result']) ?? game;
    if (!same(saved.turnOrder, game.order)) {
      return refuse('The turn order in this game record does not match its ruleset.');
    }
    if (!same(saved.result, game.result)) {
      return refuse('The result in this game record does not match its moves.');
    }
    const timed = recordClock(saved, game);
    if (timed === 'bad') return refuse('The clock in this game record does not match its moves.');
    return { ok: true, info, game, date: saved.date, timed };
  } catch {
    return refuse('This game record could not be replayed on its ruleset.');
  }
}

/**
 * The clock of a record, paused at the time left after the last move; null for a record with none
 * (or one naming a control this app does not know, which opens as an untimed game), 'bad' when
 * the fields are there but do not fit the game.
 */
function recordClock(saved: Record<string, unknown>, game: GameState): Timed | null | 'bad' {
  if (saved.timeControl === undefined) return null;
  if (typeof saved.timeControl !== 'string') return 'bad';
  const control = controlById(saved.timeControl);
  if (!control) return null;
  const lefts = saved.timeLeft;
  if (!Array.isArray(lefts)) return 'bad';
  const start = startClock(control, game.order, game.order[0]!, 0);
  if (!start) return null;
  const left: Times = { ...((lefts.at(-1) as Times | undefined) ?? snapshot(start, 0)) };
  // The seat that lost on time ends with none left, whatever it had after its last move.
  if (game.result.status === 'win' && game.result.reason === 'timeout') {
    left[game.result.loser] = 0;
  }
  return (
    timedFromSaved({ control: control.id, showOnly: saved.showOnly ?? false, left, lefts }, game) ??
    'bad'
  );
}
