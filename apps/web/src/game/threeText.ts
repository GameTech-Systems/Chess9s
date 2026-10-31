// What the 3-player screens say (S57, decision 0016): the seats and their states, the notices a
// move leaves, the phase of the game, and the result card for every row of both end tables.
// Read from the game state; no rule is decided here.
import {
  TAIL,
  resign,
  activeKinged,
  inDuel,
  three,
  type GameState,
  type SeatStatus,
} from '@chess9s/engine';

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** A seat as a sentence subject: "Dark", "the Dragon". */
const who = (side: string) => (side === 'dragon' ? 'the Dragon' : title(side));
/** The same as a possessive: "Dark's", "the Dragon's". */
const whose = (side: string) => `${who(side)}${side === 'dragon' ? "'s" : "'s"}`;
/** "Dark", "Dark and Light", "Dark, Light and the Dragon". */
const list = (sides: string[]) =>
  sides.length < 2
    ? sides.map(who).join('')
    : `${sides.slice(0, -1).map(who).join(', ')} and ${who(sides.at(-1)!)}`;

export interface SeatLine {
  side: string;
  name: string;
  state: SeatStatus;
  /** It is this seat's turn and the game is on. */
  toMove: boolean;
  /** What to show beside the name: "to move", "out · King captured", "Tail in stone". */
  text: string;
}

/** The three seats in turn order, with whose move it is and who is out. */
export function seatLines(game: GameState): SeatLine[] {
  const g = three(game.rules, game.order);
  const ongoing = game.result.status === 'ongoing';
  return game.order.map((side) => {
    const state = game.seats[side] ?? 'active';
    const toMove = ongoing && game.turn === side && state !== 'out';
    const notes: string[] = [];
    if (toMove) notes.push('to move');
    const left = game.resignations.find((r) => r.side === side);
    const how = left?.timeout ? 'out of time' : 'resigned';
    if (state === 'out') {
      notes.push(left ? `out · ${how}` : side === g.dragon ? 'out' : 'out · King captured');
    } else if (left) notes.push(how);
    if (state === 'tail-stone') notes.push('Tail in stone');
    return { side, name: title(side), state, toMove, text: notes.join(' · ') };
  });
}

/** What the last move did besides moving and capturing (a King taken, the Tail in stone, ...). */
export function noticeLines(game: GameState): string[] {
  const last = game.moves.at(-1);
  const events = last?.events ?? [];
  const taken = last?.capture === TAIL;
  const g = three(game.rules, game.order);
  const out = events.some((e) => e.kind === 'dragon-out');
  const lines = events.map((e) => {
    switch (e.kind) {
      case 'king-captured': {
        const how =
          e.how === 'capture'
            ? 'captured by'
            : e.how === 'checkmate'
              ? 'checkmated by'
              : 'left in check from';
        return `${whose(e.side)} King was ${how} the Dragon. ${title(e.side)} is out and its pieces are stone.`;
      }
      case 'tail-stone':
        // Light-Handed Dragon: the Tail is never checkmated; it turns to stone with the Dragon out.
        if (g.mode.defeat === 'pieces') return `The Dragon's Tail turns to stone on ${e.at}.`;
        return `${who(e.by)} ${taken ? 'captured' : 'checkmated'} the Dragon's Tail; it turns to stone on ${e.at}.${out ? '' : ' The Dragon plays on without it.'}`.replace(
          /^the /,
          'The ',
        );
      case 'dragon-out':
        return 'Both Dragon Heads, the Sun and the Moon are gone, and the Tail is stone: the Dragon is out.';
      case 'turn-skipped':
        return e.lost
          ? `${title(who(e.side))} loses its turn: the Tail turning to stone was its move.`
          : `${title(e.side)} had no legal move, so its turn was skipped.`;
    }
  });
  // A resignation, or a seat out of time, since the last move (neither is a move, decisions 0018, 0017).
  const resigned = game.resignations.filter((r) => r.after === game.moves.length);
  for (const { side, timeout } of resigned) {
    if (game.result.status !== 'ongoing' || game.seats[side] !== 'out') continue;
    const did = timeout ? 'ran out of time' : 'resigned';
    lines.push(
      side === g.dragon
        ? `The Dragon ${did}. All its pieces, the Tail too, are stone.`
        : `${title(side)} ${did}. Its King leaves the board and its other pieces are stone.`,
    );
  }
  return lines;
}

/**
 * The seats a person can resign for: seats still in the game that the computer does not play. The
 * computer never resigns (S67).
 */
export function resignable(game: GameState, bots: readonly string[]): string[] {
  if (game.result.status !== 'ongoing') return [];
  return game.order.filter((side) => game.seats[side] !== 'out' && !bots.includes(side));
}

/** What the confirm step says a resignation will do, from the engine's own answer (decision 0018). */
export function resignPrompt(game: GameState, side: string): string {
  const after = resign(game, side);
  const { result } = after;
  const head = `${title(who(side))} resigns?`;
  if (result.status === 'win') {
    return `${head} The game ends and ${who(result.winner)} wins.`;
  }
  const what =
    side === three(game.rules, game.order).dragon
      ? 'All its pieces, the Tail too, turn to stone.'
      : 'Its King leaves the board and its other pieces turn to stone.';
  const rest = game.order.filter((s) => s !== side && after.seats[s] !== 'out');
  return `${head} ${what} ${list(rest)} play on.`;
}

/** Where the game stands: the duel, the Tail in stone, or the Dragon out; none at the start. */
export function phaseLine(game: GameState): string | null {
  const g = three(game.rules, game.order);
  const kinged = activeKinged(g, game.seats);
  if (game.seats[g.dragon] === 'out') return `The Dragon is out. ${list(kinged)} play on.`;
  const tail = game.seats[g.dragon] === 'tail-stone';
  if (inDuel(g, game.seats)) {
    return `The duel: ${list(kinged)} against the Dragon.${tail ? " The Dragon's Tail is in stone." : ''}`;
  }
  return tail ? "The Dragon's Tail is in stone. The Dragon plays on without it." : null;
}

const DRAWS: Record<string, string> = {
  stalemate: 'Stalemate',
  repetition: 'Threefold repetition',
  'fifty-move': 'Fifty-move rule',
  'insufficient-material': 'Insufficient material',
  agreement: 'By agreement',
};

export interface ResultCard {
  tone: 'win' | 'draw';
  heading: string;
  detail: string;
}

/** The result screen's text: who won and how, or who shares the draw. None while the game is on. */
export function resultCard(game: GameState): ResultCard | null {
  const { result } = game;
  if (result.status === 'ongoing') return null;
  if (result.status === 'draw') {
    const sharing = result.between ?? game.order;
    const reason = DRAWS[result.reason] ?? title(result.reason);
    return {
      tone: 'draw',
      heading: 'Draw',
      detail: `${reason}. ${list(sharing)} share the draw.`,
    };
  }
  const { winner, loser } = result;
  const heading = `${title(who(winner))} wins`;
  const tail = loser === three(game.rules, game.order).dragon;
  const detail = (() => {
    switch (result.reason) {
      case 'checkmate':
        return tail && game.moves.at(-1)?.capture === TAIL
          ? `${title(who(winner))} captured the Dragon's Tail.`
          : tail
            ? `${title(who(winner))} checkmated the Dragon's Tail.`
            : `${title(who(winner))} checkmated ${whose(loser)} King.`;
      case 'king-capture':
        return `${title(who(winner))} captured ${whose(loser)} King.`;
      case 'dragon-captured':
        return `${title(who(winner))} captured both Dragon Heads, the Sun and the Moon.`;
      case 'exposed-king':
        return `${title(whose(loser))} King was left in check from ${who(winner)}.`;
      case 'stalemate':
        return `${title(who(loser))} was stalemated.`;
      case 'resignation':
        return `${title(who(loser))} resigned.`;
      case 'timeout':
        return `${title(who(loser))} ran out of time.`;
    }
  })();
  return { tone: 'win', heading, detail };
}
