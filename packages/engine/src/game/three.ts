// 3-player check, checkmate, stones and game end (S56, decision 0016 rules 1 to 11 and both end
// tables). Pure and deterministic. game.ts keeps the game state (turns, draws, the record) and asks
// this module for the legal moves of the side to move and what each one leads to.
//
// Who counts as what comes from the board's 3-player setup: the Kinged players are the sides with a
// royal piece, the Dragon is the side that holds the Tail. The Tail is the Dragon's King while it is
// active (rule 4); every other piece behaves as its movement data says.
import { applyMove } from '../moves/check';
import {
  attacksFrom,
  castlePath,
  generateMoves,
  givesCheck,
  mayStand,
  promotionsAt,
  squareTypes,
  toNotation,
  type GeneratedMove,
  type Lost,
  type MoveRules,
  type Passing,
  type PlacedPiece,
  type Position,
} from '../moves/generate';
import { RulesError, type ParamValue } from '../rules/loader';
import type { GameResult, WinReason } from './game';
import { nextSide } from './turns';

/** The piece decision 0016 makes the Dragon's King (rule 4). */
export const TAIL = 'dragon-tail';
/** The square type where a checkmated Tail turns to stone without a swap (rule 9). */
const CENTER = 'center';
/**
 * How deep checkmate is judged inside the test for checkmate: whether a checked side has a move
 * that ends the check counts that move's own checkmates (a Dragon move that checkmates a King,
 * which removes it), but not the checkmates those would cause in turn. An engine limit.
 */
const MATE_DEPTH = 2;

/**
 * A seat's status. A Kinged seat is active, or out once its King is captured (its pieces turn to
 * stone, rule 11). The Dragon is active, `tail-stone` once the Tail is checkmated (it plays on
 * with its other pieces), or out.
 */
export type SeatStatus = 'active' | 'out' | 'tail-stone';
export type Seats = Record<string, SeatStatus>;

/** What a move did besides moving and capturing, for the record and the screens. */
export type GameEvent =
  /** The Dragon captured a King, or checkmated it (which counts as capturing it): that side is out. */
  | { kind: 'king-captured'; side: string; how: 'capture' | 'checkmate' | 'exposed-king' }
  /** The Tail was checkmated and turned to stone on `at`; `by` owns the checkmating piece. */
  | { kind: 'tail-stone'; by: string; at: string }
  /** Both Dragon Heads, the Sun and the Moon are gone and the Tail is in stone. */
  | { kind: 'dragon-out' }
  /** The Dragon had no legal move with both Kings on the board (rule 15). */
  | { kind: 'turn-skipped'; side: string };

/** The pieces and seats a move is played on. */
export interface Table {
  position: Position;
  seats: Seats;
  lost: Lost;
  passing: Passing | null;
}

/** A legal move and everything it leads to. `result` is set when the move ends the game. */
export interface Outcome {
  move: GeneratedMove;
  position: Position;
  seats: Seats;
  lost: Lost;
  events: GameEvent[];
  result: GameResult | null;
}

interface Mode {
  firstMate: boolean;
  dragonCheck: boolean;
  lastKingCapture: boolean;
  tailAtDragonTurn: boolean;
  exposedAllowed: boolean;
}

export interface Three {
  rules: MoveRules;
  order: readonly string[];
  kinged: string[];
  dragon: string;
  mode: Mode;
}

function param(rules: MoveRules, id: string): Exclude<ParamValue, null> {
  const v = rules.values[id];
  if (v === null || v === undefined) {
    throw new RulesError(`Parameter ${id} is missing or still undecided (null)`);
  }
  return v;
}

/** The roles and settings of a 3-player game. */
export function three(rules: MoveRules, order: readonly string[]): Three {
  const setup = rules.board.setups.find((s) => s.players === 3);
  if (!setup) throw new RulesError(`Board ${rules.board.id} has no setup for 3 players`);
  const sides = Object.entries(setup.pieces);
  const kinged = sides
    .filter(([, placed]) => Object.values(placed).some((id) => rules.pieces[id]?.royal === true))
    .map(([side]) => side);
  const dragon = sides.find(([, placed]) => Object.values(placed).includes(TAIL))?.[0];
  if (kinged.length !== 2 || dragon === undefined) {
    throw new RulesError('A 3-player game needs two Kinged sides and a side with the Tail');
  }
  return {
    rules,
    order,
    kinged: order.filter((s) => kinged.includes(s)),
    dragon,
    mode: {
      firstMate: param(rules, 'endings.3p') === 'first-checkmate',
      dragonCheck: param(rules, 'dragon.3p.givesCheck') === true,
      lastKingCapture: param(rules, 'dragon.3p.lastKing') === 'capture',
      tailAtDragonTurn: param(rules, 'tail.3p.mateTiming') === 'dragon-turn',
      exposedAllowed: param(rules, 'check.3p.exposedKing') === 'counts-as-checkmate',
    },
  };
}

export const outSeats = (seats: Seats): string[] =>
  Object.keys(seats).filter((s) => seats[s] === 'out');

export const activeKinged = (g: Three, seats: Seats): string[] =>
  g.kinged.filter((s) => seats[s] === 'active');

/** The duel (rule 5): the Dragon has captured one King and the other is still on the board. */
export const inDuel = (g: Three, seats: Seats): boolean =>
  !g.mode.firstMate && seats[g.dragon] !== 'out' && activeKinged(g, seats).length === 1;

/** The seats a draw is shared between (rules 12, 16, 17 and Easy Start's draws). */
export function drawSeats(g: Three, seats: Seats): string[] {
  if (!g.mode.firstMate && activeKinged(g, seats).length === 2) return [...g.kinged];
  return g.order.filter((s) => seats[s] !== 'out');
}

/** Squares of the pieces of `side` that are royal now: its King, or the Dragon's active Tail. */
function royals(g: Three, position: Position, seats: Seats, side: string): string[] {
  if (seats[side] !== 'active') return [];
  return Object.keys(position).filter((at) => {
    const p = position[at]!;
    if (p.side !== side || p.stone === true) return false;
    return side === g.dragon ? p.piece === TAIL : g.rules.pieces[p.piece]?.royal === true;
  });
}

/**
 * Whether an attack by the piece on `at` on a royal piece of `target` is check. Kinged pieces
 * check Kings and the Tail as their data says (rules 1 and 4). Dragon attacks on a King are check
 * with `dragon.3p.givesCheck` on, in the first-checkmate ending, and in the duel unless
 * `dragon.3p.lastKing` = capture (rules 2, 3 and 5); the Tail then checks only if its own data
 * says so (`tail.canCheck`).
 */
function counts(g: Three, seats: Seats, at: string, attacker: PlacedPiece, target: string) {
  if (attacker.side !== g.dragon) return givesCheck(g.rules, at, attacker);
  if (target === g.dragon) return false;
  const { firstMate, dragonCheck, lastKingCapture } = g.mode;
  if (!(firstMate || dragonCheck || (inDuel(g, seats) && !lastKingCapture))) return false;
  return attacker.piece === TAIL ? givesCheck(g.rules, at, attacker) : true;
}

/** Attacks by square, worked out once per position (positions are never changed in place). */
const attackCache = new WeakMap<MoveRules, WeakMap<Position, Map<string, string[]>>>();
function attacks(rules: MoveRules, position: Position, at: string): string[] {
  let byRules = attackCache.get(rules);
  if (!byRules) attackCache.set(rules, (byRules = new WeakMap()));
  let byAt = byRules.get(position);
  if (!byAt) byRules.set(position, (byAt = new Map()));
  let found = byAt.get(at);
  if (!found) byAt.set(at, (found = attacksFrom(rules, position, at)));
  return found;
}

/**
 * The squares a piece standing on `at` attacks on an empty board: a superset of what it attacks in
 * any position, since other pieces only shorten its lines (as in check.ts, staysOutOfCheck).
 */
const reachCache = new WeakMap<MoveRules, Map<string, Set<string>>>();
/** The same, looked up by the piece object first (pieces are never changed in place either). */
const reachByPiece = new WeakMap<MoveRules, WeakMap<PlacedPiece, Map<string, Set<string>>>>();
function reach(rules: MoveRules, at: string, placed: PlacedPiece): Set<string> {
  let byPiece = reachByPiece.get(rules);
  if (!byPiece) reachByPiece.set(rules, (byPiece = new WeakMap()));
  let byAt = byPiece.get(placed);
  if (!byAt) byPiece.set(placed, (byAt = new Map()));
  let found = byAt.get(at);
  if (found) return found;
  let byKey = reachCache.get(rules);
  if (!byKey) reachCache.set(rules, (byKey = new Map()));
  const key = `${at}|${placed.side}|${placed.piece}|${placed.moved === true}|${placed.home ?? ''}`;
  found = byKey.get(key);
  if (!found) byKey.set(key, (found = new Set(attacksFrom(rules, { [at]: placed }, at))));
  byAt.set(at, found);
  return found;
}

/**
 * Squares of the pieces attacking a royal piece of `target`, check or not, sorted; with `from`,
 * only pieces of those sides.
 */
export function attackersOn(
  g: Three,
  position: Position,
  seats: Seats,
  target: string,
  from?: readonly string[],
): string[] {
  const kings = new Set(royals(g, position, seats, target));
  if (kings.size === 0) return [];
  return Object.keys(position)
    .filter((at) => {
      const p = position[at]!;
      if (p.side === target || p.stone === true) return false;
      if (from && !from.includes(p.side)) return false;
      const alone = reach(g.rules, at, p);
      if (![...kings].some((k) => alone.has(k))) return false;
      return attacks(g.rules, position, at).some((k) => kings.has(k));
    })
    .sort();
}

/**
 * Squares of the pieces giving check to a royal piece of `target`, sorted; with `from`, only
 * pieces of those sides.
 */
export function checkersOn(
  g: Three,
  position: Position,
  seats: Seats,
  target: string,
  from?: readonly string[],
): string[] {
  return attackersOn(g, position, seats, target, from).filter((at) =>
    counts(g, seats, at, position[at]!, target),
  );
}

/** The seats that move after `mover` and before `target` (rule 6). */
function between(g: Three, seats: Seats, mover: string, target: string): string[] {
  const out = outSeats(seats);
  const found: string[] = [];
  for (let s = nextSide(g.order, mover, out); s !== target && s !== mover;) {
    found.push(s);
    s = nextSide(g.order, s, out);
  }
  return found;
}

const win = (winner: string, loser: string, reason: WinReason): GameResult => ({
  status: 'win',
  winner,
  loser,
  reason,
});

interface Work {
  position: Position;
  seats: Seats;
  lost: Lost;
  events: GameEvent[];
  result: GameResult | null;
}

const copyLost = (lost: Lost): Lost =>
  Object.fromEntries(Object.entries(lost).map(([s, l]) => [s, [...l]]));

/** A promotion gives back one lost piece of that type (owner, S16 notes). */
function giveBack(lost: Lost, side: string, piece: string) {
  const list = lost[side];
  const at = list?.indexOf(piece) ?? -1;
  if (list && at >= 0) list.splice(at, 1);
  if (list && list.length === 0) delete lost[side];
}

/**
 * `by` captures the King of `side`, or checkmates it. The Dragon doing so while both Kings are on
 * the board turns that side to stone and starts the duel (rules 2, 3, 11); anything else ends the
 * game.
 */
function kingTaken(
  g: Three,
  w: Work,
  side: string,
  by: string,
  how: 'capture' | 'checkmate' | 'exposed-king',
) {
  const reason: WinReason = how === 'capture' ? 'king-capture' : how;
  if (g.mode.firstMate || by !== g.dragon || inDuel(g, w.seats)) {
    w.result = win(by, side, reason);
    return;
  }
  w.position = stoneOut(g, w.position, side);
  w.seats = { ...w.seats, [side]: 'out' };
  w.events = [...w.events, { kind: 'king-captured', side, how }];
}

/**
 * A Kinged side leaves the game (rule 11): its King leaves the board and its other pieces turn to
 * stone. The Dragon (the side that is not Kinged) keeps every piece, the Tail too, as stone.
 */
function stoneOut(g: Three, position: Position, side: string): Position {
  const out: Position = {};
  for (const [at, p] of Object.entries(position)) {
    if (p.side !== side) out[at] = p;
    else if (side === g.dragon || g.rules.pieces[p.piece]?.royal !== true) {
      out[at] = { ...p, stone: true };
    }
  }
  return out;
}

/** What a resignation leads to: the position and seats after it, and the result if it ends the game. */
export interface Resigned {
  position: Position;
  seats: Seats;
  result: GameResult | null;
}

/**
 * `side` resigns (decision 0018). With both Kinged players in, a Kinged side is out as after a King
 * capture and the Dragon, if it resigns, is out with every piece in stone; no result. When the
 * resigning side is the last Kinged player, the Dragon wins; when the Dragon resigns with one
 * Kinged player left, that player wins; when the Dragon is already out, the other Kinged player
 * wins (the 2-player end rules).
 */
export function resignedBy(
  g: Three,
  position: Position,
  seats: Seats,
  side: string,
  reason: 'resignation' | 'timeout' = 'resignation',
): Resigned {
  const kinged = activeKinged(g, seats);
  const lost = (winner: string): Resigned => ({
    position,
    seats,
    result: win(winner, side, reason),
  });
  if (side === g.dragon) {
    if (kinged.length === 1) return lost(kinged[0]!);
  } else if (seats[g.dragon] === 'out') {
    return lost(kinged.find((s) => s !== side)!);
  } else if (kinged.length === 1) {
    return lost(g.dragon);
  }
  return {
    position: stoneOut(g, position, side),
    seats: { ...seats, [side]: 'out' },
    result: null,
  };
}

interface Mate {
  side: string;
  /** Squares the checkmating piece may be chosen from (rule 8), sorted. */
  by: string[];
}

/**
 * The checkmates a move by `mover` gives (rule 7): every royal side but the mover's that is in
 * check and has no move ending it, as if it moved next. The Tail under `tail.3p.mateTiming` =
 * dragon-turn only when the Dragon moves next.
 */
function matesAfter(g: Three, w: Work, mover: string, move: GeneratedMove, depth: number): Mate[] {
  const out = outSeats(w.seats);
  const next = nextSide(g.order, mover, out);
  const mates: Mate[] = [];
  for (let side = next; side !== mover; side = nextSide(g.order, side, out)) {
    if (side === g.dragon && g.mode.tailAtDragonTurn && !g.mode.firstMate && next !== g.dragon) {
      continue;
    }
    const checks = checkersOn(g, w.position, w.seats, side);
    if (checks.length === 0) continue;
    const table: Table = {
      position: w.position,
      seats: w.seats,
      lost: w.lost,
      passing: side === next && move.passes ? { squares: move.passes, at: move.to } : null,
    };
    if (hasLegalMove(g, table, side, depth + 1)) continue;
    // Rule 8: the piece that just moved, if it gives check; else the only one; else a choice.
    const moved = [move.to, ...(move.castle ? [move.castle.to] : [])];
    const own = checks.filter((at) => moved.includes(at));
    mates.push({ side, by: own.length > 0 ? own : checks });
  }
  return mates;
}

/** Whether the Tail checkmated now switches places with the checkmating piece (rule 9). */
const swaps = (g: Three, seats: Seats, side: string): boolean =>
  side === g.dragon && !g.mode.firstMate && activeKinged(g, seats).length === 2;

/** Apply one checkmate; returns the variants it leads to (a swapped pawn's promotions). */
function applyMate(
  g: Three,
  w: Work,
  mate: Mate,
  at: string,
): { work: Work; promotion?: string }[] {
  if (w.result) return [{ work: w }];
  const owner = w.position[at]!.side;
  if (mate.side !== g.dragon) {
    if (g.mode.firstMate || owner !== g.dragon) w.result = win(owner, mate.side, 'checkmate');
    else kingTaken(g, w, mate.side, g.dragon, 'checkmate');
    return [{ work: w }];
  }
  if (!swaps(g, w.seats, mate.side)) {
    w.result = win(owner, g.dragon, 'checkmate');
    return [{ work: w }];
  }
  return stoneTail(g, w, at, false);
}

/**
 * The Tail on its square turns to stone and, unless it stands on the center or the piece on `at`
 * (the checkmating or capturing piece) may not stand on its square, switches places with that piece
 * (rule 9). A swapped pawn promotes at once, one variant per choice. `keepSeat`: the Dragon seat
 * stays as it is (a capture that ends the game).
 */
function stoneTail(
  g: Three,
  w: Work,
  at: string,
  keepSeat: boolean,
): { work: Work; promotion?: string }[] {
  const owner = w.position[at]!.side;
  const tailAt = royals(g, w.position, w.seats, g.dragon)[0]!;
  const tail = w.position[tailAt]!;
  const piece = w.position[at]!;
  const seats: Seats = keepSeat ? w.seats : { ...w.seats, [g.dragon]: 'tail-stone' };
  const stays =
    (squareTypes(g.rules.board).get(tailAt) ?? []).includes(CENTER) ||
    !mayStand(g.rules, at, piece, tailAt);
  if (stays) {
    const position = { ...w.position, [tailAt]: { ...tail, stone: true } };
    const events = [...w.events, { kind: 'tail-stone' as const, by: owner, at: tailAt }];
    return [{ work: { ...w, position, seats, events } }];
  }
  return promotionsAt(g.rules, at, piece, tailAt, w.lost).map((promotion) => {
    const lost = copyLost(w.lost);
    if (promotion !== undefined) giveBack(lost, piece.side, promotion);
    const position: Position = {
      ...w.position,
      [tailAt]: { ...piece, piece: promotion ?? piece.piece, moved: true },
      [at]: { ...tail, stone: true },
    };
    const events = [...w.events, { kind: 'tail-stone' as const, by: owner, at }];
    return {
      work: { ...w, position, seats, lost, events },
      ...(promotion !== undefined && { promotion }),
    };
  });
}

/** What decides a checkmate's effect, so a choice is offered only between different effects. */
const effectKey = (g: Three, w: Work, mate: Mate, at: string): string =>
  swaps(g, w.seats, mate.side) ? at : w.position[at]!.side;

/**
 * Every outcome of one pseudo-legal move of `mover` that is legal: the move with its checkmate
 * choice and swap promotion, if any. None when the move is illegal.
 */
function resolve(g: Three, t: Table, mover: string, move: GeneratedMove, depth: number): Outcome[] {
  const victim = t.position[move.captureAt ?? move.to];
  if (victim?.piece === TAIL && victim.side === g.dragon && move.captureAt === undefined) {
    return tailCaptures(g, t, mover, move).flatMap((start) =>
      settleMove(g, t, mover, move, depth, start),
    );
  }
  const lost = copyLost(t.lost);
  if (victim) (lost[victim.side] ??= []).push(victim.piece);
  if (move.promotion !== undefined) giveBack(lost, mover, move.promotion);
  const start: Work = {
    position: applyMove(t.position, move),
    seats: t.seats,
    lost,
    events: [],
    result: null,
  };
  if (victim && victim.side !== g.dragon && g.rules.pieces[victim.piece]?.royal === true) {
    kingTaken(g, start, victim.side, mover, 'capture');
  }
  return settleMove(g, t, mover, move, depth, start);
}

/**
 * A capture of the Tail (`tail.capturable`, decision 0018): handled as a checkmate of the Tail
 * (rule 9). The Tail never leaves the board: the capturing piece switches places with it and it
 * turns to stone, or turns to stone where it stands (on the center, or if the piece may not stand
 * there). While both Kinged players are in, the Dragon plays on; in the duel, and in Easy Start's
 * first-checkmate game (provisional), the capturing player wins as by checkmate.
 */
function tailCaptures(g: Three, t: Table, mover: string, move: GeneratedMove): Work[] {
  const before: Work = {
    position: t.position,
    seats: t.seats,
    lost: copyLost(t.lost),
    events: [],
    result: null,
  };
  const final = !swaps(g, t.seats, g.dragon);
  return stoneTail(g, before, move.from, final)
    .filter((v) => v.promotion === move.promotion)
    .map(({ work }) => {
      if (final) work.result = win(mover, g.dragon, 'checkmate');
      return work;
    });
}

/**
 * The rest of `resolve` for a move whose own effect is `start` (the position after it): the
 * checkmates it gives, the choices they leave, and whether the position is legal.
 */
function settleMove(
  g: Three,
  t: Table,
  mover: string,
  move: GeneratedMove,
  depth: number,
  start: Work,
): Outcome[] {
  let works: { work: Work; mateBy?: string; promotion?: string }[] = [{ work: start }];
  if (depth < MATE_DEPTH && !start.result) {
    const duelBefore = inDuel(g, start.seats);
    const mates = matesAfter(g, start, mover, move, depth);
    // King checkmates first: one by a Kinged player ends the game before the Tail matters.
    mates.sort((a, b) => Number(a.side === g.dragon) - Number(b.side === g.dragon));
    // One choice per move: the first checkmate whose candidate pieces would act differently.
    let chosen = false;
    for (const mate of mates) {
      const keys = new Set(mate.by.map((at) => effectKey(g, works[0]!.work, mate, at)));
      const choice: boolean = !chosen && keys.size > 1;
      chosen ||= choice;
      works = works.flatMap((v) =>
        (choice ? mate.by : [mate.by[0]!]).flatMap((at) =>
          applyMate(g, { ...v.work }, mate, at).map((r) => {
            const mateBy = choice ? at : v.mateBy;
            const promotion = r.promotion ?? v.promotion;
            return {
              work: r.work,
              ...(mateBy !== undefined && { mateBy }),
              ...(promotion !== undefined && { promotion }),
            };
          }),
        ),
      );
    }
    // The duel began with this move: the last King may already be checkmated (rule 5).
    works = works.map((v) => {
      if (v.work.result || duelBefore || !inDuel(g, v.work.seats)) return v;
      const work = { ...v.work };
      for (const mate of matesAfter(g, work, mover, move, depth)) {
        if (mate.side !== g.dragon) applyMate(g, work, mate, mate.by[0]!);
      }
      return { ...v, work };
    });
  }

  const found: Outcome[] = [];
  for (const v of works) {
    const w = v.work;
    if (!w.result && !g.mode.firstMate && g.kinged.includes(mover)) dragonCaptured(g, w, mover);
    if (!legalAfter(g, w, mover)) continue;
    found.push({
      move: {
        ...move,
        ...(v.mateBy !== undefined && { mateBy: v.mateBy }),
        ...(v.promotion !== undefined && { swapPromotion: v.promotion }),
      },
      position: w.position,
      seats: w.seats,
      lost: w.lost,
      events: w.events,
      result: w.result,
    });
  }
  return found;
}

/**
 * Both Dragon Heads, the Sun and the Moon are gone (no Dragon piece but the Tail is left): in the
 * duel the last Kinged player wins; with the Tail in stone the Dragon is out (end table).
 */
function dragonCaptured(g: Three, w: Work, mover: string) {
  if (w.seats[g.dragon] === 'out') return;
  const left = Object.values(w.position).some(
    (p) => p.side === g.dragon && p.piece !== TAIL && p.stone !== true,
  );
  if (left) return;
  if (inDuel(g, w.seats)) w.result = win(mover, g.dragon, 'dragon-captured');
  else if (w.seats[g.dragon] === 'tail-stone') {
    w.seats = { ...w.seats, [g.dragon]: 'out' };
    w.events = [...w.events, { kind: 'dragon-out' }];
  }
}

/**
 * Whether the position a move leads to is allowed (rules 1, 4 and 6): the mover's own royal piece
 * is not in check, and no King is in check from a seat that moves before its owner can answer.
 * With `check.3p.exposedKing` = counts-as-checkmate the second is allowed, and that King's owner
 * loses at once to the owner of the piece giving check.
 */
function legalAfter(g: Three, w: Work, mover: string): boolean {
  if (checkersOn(g, w.position, w.seats, mover).length > 0) return false;
  for (const side of activeKinged(g, w.seats)) {
    if (side === mover) continue;
    const from = between(g, w.seats, mover, side);
    if (from.length === 0) continue;
    const found = checkersOn(g, w.position, w.seats, side, from);
    if (found.length === 0) continue;
    if (!g.mode.exposedAllowed) return false;
    if (w.result) continue;
    const owner = w.position[found[0]!]!.side;
    if (owner === g.dragon) kingTaken(g, w, side, owner, 'exposed-king');
    else w.result = win(owner, side, 'exposed-king');
  }
  return true;
}

/** Castling's conditions besides the position after it: not in check, crossing no checked square. */
function castleAllowed(g: Three, t: Table, mover: string, move: GeneratedMove): boolean {
  if (checkersOn(g, t.position, t.seats, mover).length > 0) return false;
  return castlePath(move).every(
    (at) =>
      checkersOn(
        g,
        applyMove(t.position, { from: move.from, to: at, piece: move.piece }),
        t.seats,
        mover,
      ).length === 0,
  );
}

function pseudo(g: Three, t: Table, mover: string): GeneratedMove[] {
  return generateMoves(g.rules, t.position, mover, t.lost, t.passing ?? undefined).filter(
    (m) => !m.castle || castleAllowed(g, t, mover, m),
  );
}

function hasLegalMove(g: Three, t: Table, mover: string, depth: number): boolean {
  return pseudo(g, t, mover).some((m) => resolve(g, t, mover, m, depth).length > 0);
}

/** Every legal move of `mover` and what it leads to, sorted by notation. */
export function outcomes(g: Three, t: Table, mover: string): Outcome[] {
  return pseudo(g, t, mover)
    .flatMap((m) => resolve(g, t, mover, m, 0))
    .map((o) => [toNotation(o.move), o] as const)
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
    .map(([, o]) => o);
}

/** What one legal move leads to, found by its notation; undefined when it is not legal. */
export function outcomeOf(
  g: Three,
  t: Table,
  mover: string,
  move: GeneratedMove,
): Outcome | undefined {
  const plain: GeneratedMove = { ...move };
  delete plain.mateBy;
  delete plain.swapPromotion;
  const notation = toNotation(move);
  return resolve(g, t, mover, plain, 0).find((o) => toNotation(o.move) === notation);
}
