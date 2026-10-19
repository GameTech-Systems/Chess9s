// Game state (S17): turns, the Coast opening, the Tail and its repeat limit, the lost-piece
// list, game end, and the record kept with a game. Positions are data; rules come from the
// real board, pieces and draft-2p ruleset.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import hotSeatMate from '../../test/fixtures/games/hot-seat-mate.json';
import { toNotation, type GeneratedMove, type MoveRules, type Position } from '../moves/generate';
import { NEUTRAL, validateBoardAndPieces } from '../rules/formats';
import { RulesError, resolveRuleset, type Registry } from '../rules/loader';
import { findMove, gameRecord, newGame, playMove, unbuiltFeatures, type GameState } from './game';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = () => read('rules/parameters.json') as Registry;
const pieceFiles = readdirSync(root + 'rules/pieces').filter((f) => f.endsWith('.json'));
const set = validateBoardAndPieces(
  read('rules/boards/standard-9x9.json'),
  pieceFiles.map((f) => read(`rules/pieces/${f}`)),
  registry(),
);
const ID = { id: 'draft-2p', version: '0.2.0' };

function rulesFor(players: 2 | 3, overrides: Record<string, unknown> = {}): MoveRules {
  const base = read(`rules/rulesets/draft-${players}p.json`) as Record<string, unknown>;
  const { values } = resolveRuleset(registry(), { ...base, overrides });
  return { ...set, values, players };
}

const notations = (g: GameState) => g.legal.map(toNotation);
/** Play a move by its notation; fails the test when it is not legal. */
function play(g: GameState, notation: string): GameState {
  const move = g.legal.find((m) => toNotation(m) === notation);
  if (!move) throw new Error(`${notation} is not legal for ${g.turn}`);
  return playMove(g, move);
}
const playAll = (g: GameState, ...moves: string[]) => moves.reduce(play, g);
const tailMoves = (g: GameState) =>
  g.legal.filter((m) => m.piece === 'dragon-tail').map(toNotation);

const king = (side: string) => ({ piece: 'king', side });

describe('a new game', () => {
  it('starts from the start position with dark to move (turn.firstMove)', () => {
    const g = newGame(rulesFor(2), ID);
    expect(g.turn).toBe('dark');
    expect(g.order).toEqual(['dark', 'light']);
    expect(Object.keys(g.position)).toHaveLength(37);
    expect(g.result).toEqual({ status: 'ongoing' });
    expect(g.moves).toEqual([]);
    expect(g.lost).toEqual({});
  });

  it('lets light start with turn.firstMove = light', () => {
    expect(newGame(rulesFor(2, { 'turn.firstMove': 'light' }), ID).turn).toBe('light');
  });

  it('refuses a 3-player game (not playable yet)', () => {
    expect(() => newGame(rulesFor(3), { id: 'draft-3p', version: '0.2.0' })).toThrow(RulesError);
  });

  it('refuses a ruleset with an undecided (null) value', () => {
    const rules = rulesFor(2);
    expect(() =>
      newGame({ ...rules, values: { ...rules.values, 'king.range': null } }, ID),
    ).toThrow(/king\.range/);
  });

  it('refuses a start that already is not dark’s or light’s turn', () => {
    expect(() => newGame(rulesFor(2), ID, { turn: 'dragon' })).toThrow(RulesError);
  });
});

describe('the Coast', () => {
  it('is closed at the start: no Coast piece moves, and nothing enters the Coast', () => {
    const g = newGame(rulesFor(2), ID);
    expect(g.coastOpen).toBe(false);
    const moves = g.legal;
    expect(moves.filter((m) => m.from.startsWith('a') && m.piece !== 'dragon-tail')).toEqual([]);
    expect(moves.filter((m) => m.to.startsWith('a') && m.piece !== 'dragon-tail')).toEqual([]);
  });

  it('lets either side open it, and only by putting the Tail on E5', () => {
    const g = newGame(rulesFor(2), ID);
    expect(tailMoves(g)).toEqual(['a5-e5']);
    const light = play(g, 'b8-b6');
    expect(light.turn).toBe('light');
    expect(tailMoves(light)).toEqual(['a5-e5']);
  });

  it('opens when the Tail reaches E5, and stays open when the Tail leaves', () => {
    let g = play(newGame(rulesFor(2), ID), 'a5-e5');
    expect(g.coastOpen).toBe(true);
    g = playAll(g, 'b2-b3', 'e5-i5');
    expect(g.coastOpen).toBe(true);
    g = play(g, 'c2-c3');
    expect(g.coastOpen).toBe(true);
  });

  it('lets Coast pieces move once open', () => {
    const g = playAll(newGame(rulesFor(2), ID), 'a5-e5', 'b2-b3');
    // The Moon on a8 can step forward now; dark’s pieces from the Coast appear in its moves.
    expect(g.turn).toBe('dark');
    expect(g.legal.some((m) => m.from === 'a8')).toBe(true);
  });

  it('is open from the start with coast.2p.initiation = open-at-start', () => {
    const g = newGame(rulesFor(2, { 'coast.2p.initiation': 'open-at-start' }), ID);
    expect(g.legal.some((m) => m.from === 'a8')).toBe(true);
  });

  it('gives no check from the Coast while closed (owner, 19 Oct 2026)', () => {
    const position: Position = {
      f9: king('dark'),
      f1: king('light'),
      a9: { piece: 'light-dragon-head', side: 'light' },
    };
    const rules = rulesFor(2, { 'king.range': 1 });
    const closed = newGame(rules, ID, { position, turn: 'dark' });
    expect(closed.checkers).toEqual([]);
    expect(closed.result.status).toBe('ongoing');
    const open = newGame(rules, ID, { position, turn: 'dark', coastOpen: true });
    expect(open.checkers).toEqual(['a9']);
  });

  it('judges the opening move with the Coast open: it may not expose its own King', () => {
    // Dark’s King on f9 is on the Light Dragon Head’s rank with nothing between them.
    const position: Position = {
      f9: king('dark'),
      f1: king('light'),
      a9: { piece: 'light-dragon-head', side: 'light' },
      a5: { piece: 'dragon-tail', side: NEUTRAL },
    };
    const g = newGame(rulesFor(2, { 'king.range': 1 }), ID, { position, turn: 'dark' });
    // The Dragon Head gives no check while the Coast is closed, so dark is not in check yet; but
    // opening the Coast would put its own King in check, so a5-e5 is illegal for dark.
    expect(g.checkers).toEqual([]);
    expect(notations(g)).not.toContain('a5-e5');
  });
});

describe('the Tail', () => {
  const open = () => playAll(newGame(rulesFor(2), ID), 'a5-e5');

  it('is moved by either player, once the Coast is open, jumping among a5, e5 and i5', () => {
    const g = playAll(open(), 'b2-b3');
    expect(g.turn).toBe('dark');
    // Dark’s second turn: the opener may continue e5 to i5 (below), but not e5 to a5.
    expect(tailMoves(g)).toEqual(['e5-i5']);
  });

  it('may be moved by the other player at once', () => {
    const g = open();
    expect(g.turn).toBe('light');
    expect(tailMoves(g)).toEqual(['e5-a5', 'e5-i5']);
  });

  it('repeat limit: no Tail move on two of a player’s own turns in a row', () => {
    // Light moves the Tail; dark answers with a pawn move; light may not move the Tail again.
    let g = play(open(), 'e5-i5');
    expect(g.turn).toBe('dark');
    expect(tailMoves(g)).toEqual([]);
    g = play(g, 'b8-b6');
    expect(g.turn).toBe('light');
    expect(tailMoves(g)).toEqual([]);
    g = play(g, 'b2-b3');
    // Dark moved a pawn since its own Tail move, so dark may use the Tail again.
    expect(tailMoves(g)).toEqual(['i5-a5', 'i5-e5']);
  });

  it('the opener may move the Tail A5 to E5 and then E5 to I5 on the next turn, once', () => {
    let g = playAll(newGame(rulesFor(2), ID), 'a5-e5', 'b2-b3');
    expect(tailMoves(g)).toEqual(['e5-i5']);
    g = play(g, 'e5-i5');
    g = play(g, 'c2-c4');
    // Two Tail moves in a row used the exception up; the next turn has no Tail move.
    expect(tailMoves(g)).toEqual([]);
  });

  it('the exception is lost when the Tail is no longer on E5 at the opener’s next turn', () => {
    const g = playAll(newGame(rulesFor(2), ID), 'a5-e5', 'e5-a5');
    expect(g.turn).toBe('dark');
    expect(tailMoves(g)).toEqual([]);
  });

  it('with tail.repeatLimit = 0 there is no limit', () => {
    let g = playAll(newGame(rulesFor(2, { 'tail.repeatLimit': 0 }), ID), 'a5-e5', 'e5-i5');
    expect(tailMoves(g)).toEqual(['i5-a5', 'i5-e5']);
    g = playAll(g, 'i5-e5', 'e5-i5', 'i5-a5');
    expect(g.turn).toBe('light');
    expect(tailMoves(g).length).toBeGreaterThan(0);
  });

  it('with e5-i5-only the Tail still opens the Coast on E5 and never goes to A5', () => {
    const rules = rulesFor(2, { 'tail.2p.path': 'e5-i5-only' });
    const g = newGame(rules, ID);
    expect(tailMoves(g)).toEqual(['a5-e5']);
    const after = playAll(g, 'a5-e5', 'e5-i5');
    expect(after.coastOpen).toBe(true);
    expect(tailMoves(playAll(after, 'b8-b6'))).toEqual([]);
  });

  it('never captures its mover’s own pieces, and never captures at all by default', () => {
    const g = open();
    expect(g.legal.filter((m) => m.piece === 'dragon-tail' && m.capture !== undefined)).toEqual([]);
  });

  it('with tail.2p.canCapture on, captures only the other side’s pieces', () => {
    const position: Position = {
      f9: king('dark'),
      f1: king('light'),
      a5: { piece: 'dragon-tail', side: NEUTRAL },
      i5: { piece: 'rook', side: 'light' },
    };
    const rules = rulesFor(2, { 'tail.2p.canCapture': true });
    const asDark = newGame(rules, ID, { position, turn: 'dark', coastOpen: true });
    expect(notations(asDark)).toContain('a5xi5');
    const asLight = newGame(rules, ID, { position, turn: 'light', coastOpen: true });
    expect(notations(asLight)).not.toContain('a5xi5');
  });
});

describe('lost pieces', () => {
  const duel = (extra: Position): Position => ({
    f9: king('dark'),
    f1: king('light'),
    ...extra,
  });

  it('records a captured piece against the side that lost it', () => {
    const position = duel({
      h2: { piece: 'rook', side: 'dark' },
      c2: { piece: 'knight', side: 'light' },
    });
    const g = play(newGame(rulesFor(2), ID, { position, turn: 'dark' }), 'h2xc2');
    expect(g.lost).toEqual({ light: ['knight'] });
    expect(g.position.c2).toMatchObject({ piece: 'rook', side: 'dark', moved: true });
  });

  it('a promotion to a lost piece takes it off the list (owner, S16 answer, provisional)', () => {
    const position = duel({ b8: { piece: 'pawn', side: 'light' } });
    const rules = rulesFor(2, {
      'pawn.promotion.targets': ['queen', 'rook', 'bishop', 'knight', 'captured-piece'],
    });
    const start = newGame(rules, ID, {
      position,
      turn: 'light',
      lost: { light: ['knight', 'light-dragon-head'] },
    });
    expect(notations(start)).toContain('b8-b9=light-dragon-head');
    const g = play(start, 'b8-b9=light-dragon-head');
    expect(g.lost).toEqual({ light: ['knight'] });
    expect(g.position.b9).toMatchObject({ piece: 'light-dragon-head', side: 'light' });
  });

  it('a second pawn cannot promote to the same lost piece again', () => {
    const position = duel({
      b8: { piece: 'pawn', side: 'light' },
      c8: { piece: 'pawn', side: 'light' },
    });
    const rules = rulesFor(2, { 'pawn.promotion.targets': ['captured-piece'] });
    let g = newGame(rules, ID, { position, turn: 'light', lost: { light: ['knight'] } });
    g = play(g, 'b8-b9=knight');
    g = play(g, 'f9-e9'); // dark
    expect(g.turn).toBe('light');
    expect(notations(g).filter((m) => m.startsWith('c8-c9'))).toEqual(['c8-c9']);
  });

  it('keeps the list per side and out of the way of other sides', () => {
    const position = duel({
      h2: { piece: 'rook', side: 'dark' },
      c2: { piece: 'knight', side: 'light' },
    });
    const g = newGame(rulesFor(2), ID, { position, turn: 'dark', lost: { dark: ['queen'] } });
    expect(play(g, 'h2xc2').lost).toEqual({ dark: ['queen'], light: ['knight'] });
  });
});

describe('game end', () => {
  const mate = (): Position => ({
    i9: king('dark'),
    b8: { piece: 'rook', side: 'light' },
    c7: { piece: 'rook', side: 'light' },
    b1: king('light'),
  });
  const rules = () => rulesFor(2, { 'king.range': 1 });

  it('checkmate: the side that moved wins', () => {
    const g = play(newGame(rules(), ID, { position: mate(), turn: 'light' }), 'c7-c9');
    expect(g.inCheck).toBe(true);
    expect(g.checkers).toEqual(['c9']);
    expect(g.legal).toEqual([]);
    expect(g.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'checkmate',
    });
  });

  it('check without mate is still ongoing: the King can step out of the line', () => {
    const g = play(
      newGame(rulesFor(2, { 'king.range': 2 }), ID, { position: mate(), turn: 'light' }),
      'c7-c9',
    );
    expect(g.inCheck).toBe(true);
    expect(g.result.status).toBe('ongoing');
    expect(g.turn).toBe('dark');
    expect(g.legal.length).toBeGreaterThan(0);
  });

  const boxed: Position = {
    i9: king('dark'),
    h7: { piece: 'rook', side: 'light' },
    b8: { piece: 'rook', side: 'light' },
    b1: king('light'),
  };

  it.each([
    ['draw', { status: 'draw', reason: 'stalemate' }],
    ['loss-for-stalemated', { status: 'win', winner: 'light', loser: 'dark', reason: 'stalemate' }],
    ['win-for-stalemated', { status: 'win', winner: 'dark', loser: 'light', reason: 'stalemate' }],
  ])('stalemate under draw.stalemate = %s', (option, result) => {
    const g = newGame(rulesFor(2, { 'king.range': 1, 'draw.stalemate': option }), ID, {
      position: boxed,
      turn: 'dark',
    });
    expect(g.result).toEqual(result);
  });

  it('refuses a move once the game is over, and an illegal move at any time', () => {
    const over = play(newGame(rules(), ID, { position: mate(), turn: 'light' }), 'c7-c9');
    const any: GeneratedMove = { from: 'i9', to: 'i8', piece: 'king' };
    expect(() => playMove(over, any)).toThrow(RulesError);
    const g = newGame(rulesFor(2), ID);
    expect(() => playMove(g, { from: 'e1', to: 'e5', piece: 'queen' })).toThrow(RulesError);
    expect(() => playMove(g, { from: 'b8', to: 'b6', piece: 'pawn' })).not.toThrow();
  });
});

describe('finding and recording moves', () => {
  it('finds a legal move by squares, and a promotion by its piece', () => {
    const g = newGame(rulesFor(2), ID);
    expect(findMove(g, 'b8', 'b6')).toMatchObject({ from: 'b8', to: 'b6', piece: 'pawn' });
    expect(findMove(g, 'b8', 'b4')).toBeUndefined();
  });

  it('offers every promotion choice and none when a promotion is not asked for', () => {
    const position: Position = {
      f9: king('dark'),
      f1: king('light'),
      b8: { piece: 'pawn', side: 'light' },
    };
    const g = newGame(rulesFor(2), ID, { position, turn: 'light' });
    expect(findMove(g, 'b8', 'b9')).toBeUndefined();
    expect(findMove(g, 'b8', 'b9', 'queen')).toMatchObject({ promotion: 'queen' });
  });

  it('keeps the ruleset id and version, the moves and the result with the game', () => {
    const g = playAll(newGame(rulesFor(2), ID), 'b8-b6', 'b2-b4');
    expect(gameRecord(g)).toEqual({
      ruleset: { id: 'draft-2p', version: '0.2.0' },
      players: 2,
      turnOrder: ['dark', 'light'],
      moves: ['b8-b6', 'b2-b4'],
      result: { status: 'ongoing' },
    });
  });

  it('plays are pure: the earlier state is not changed', () => {
    const g = newGame(rulesFor(2), ID);
    const before = JSON.stringify(g.position);
    playAll(g, 'b8-b6', 'b2-b4');
    expect(JSON.stringify(g.position)).toBe(before);
    expect(g.moves).toEqual([]);
  });
});

describe('features the game does not play yet', () => {
  it('lists none at the draft-2p defaults: every rule they switch on is built (S22a)', () => {
    expect(unbuiltFeatures(rulesFor(2))).toEqual([]);
  });

  it('lists an option only while it is on', () => {
    const on = unbuiltFeatures(rulesFor(2, { 'queen.pawnSwap': true })).map((f) => f.id);
    expect(on).toEqual(['queen.pawnSwap']);
    const swap = unbuiltFeatures(rulesFor(2, { 'setup.swapKingQueen': true })).map((f) => f.id);
    expect(swap).toEqual(['setup.swapKingQueen']);
  });
});

describe('a whole game', () => {
  const replay = (moves: string[], overrides: Record<string, unknown> = {}) =>
    moves.reduce(play, newGame(rulesFor(2, overrides), ID));

  it('replays a full game from the start position to checkmate (fixture)', () => {
    const g = replay(hotSeatMate.moves, hotSeatMate.overrides);
    expect(g.result).toEqual(hotSeatMate.result);
    expect(g.moves).toHaveLength(80);
    expect(g.turn).toBe('dark');
    expect(g.inCheck).toBe(true);
    expect(g.checkers).toEqual(['i9']);
    expect(g.legal).toEqual([]);
    expect(g.coastOpen).toBe(true);
    expect(gameRecord(g)).toMatchObject({
      ruleset: hotSeatMate.ruleset,
      moves: hotSeatMate.moves,
      result: hotSeatMate.result,
    });
  });

  it('accounts for every piece: those on the board plus those lost are the 37 that began', () => {
    const g = replay(hotSeatMate.moves);
    const lost = Object.values(g.lost).reduce((n, l) => n + l.length, 0);
    expect(Object.keys(g.position).length + lost).toBe(37);
    expect(lost).toBe(23);
  });
});
