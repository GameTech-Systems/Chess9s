// 3-player hot-seat sessions (S57, decision 0016): the choices a move can ask for, the check and
// danger marks for the Tail and the Kings, and the text for the status line. Positions come from
// the engine's 3-player fixtures (packages/engine/test/fixtures/positions/three-player.json).
import { describe, expect, it } from 'vitest';
import { newGame, type PlacedPiece, type Position, type Seats } from '@chess9s/engine';
import {
  canUndo,
  cancelPromotion,
  choose,
  click,
  fromGame,
  highlights,
  resignFor,
  rounds,
  statusLine,
  toggleDanger,
  undo,
  type Model,
} from './session';
import { createRules, listRulesets } from './rules';

const info = (id: string) => listRulesets().find((r) => r.id === id)!;

/** "<side> <piece>[ stone]" for each square, as the engine fixtures write them. */
function board(pieces: Record<string, string>): Position {
  const position: Position = {};
  for (const [at, text] of Object.entries(pieces)) {
    const [side, piece, stone] = text.split(' ');
    const placed: PlacedPiece = { piece: piece!, side: side!, moved: true };
    position[at] = stone === 'stone' ? { ...placed, stone: true } : placed;
  }
  return position;
}

function start(
  pieces: Record<string, string>,
  turn: string,
  opts: { id?: string; seats?: Seats } = {},
): Model {
  const id = opts.id ?? 'standard-3p';
  const game = newGame(createRules(id), info(id), {
    position: board(pieces),
    turn,
    ...(opts.seats && { seats: opts.seats }),
  });
  return fromGame(game);
}
const clicks = (m: Model, ...squares: string[]) => squares.reduce(click, m);

// Rule 8: two pieces check the Tail and neither just moved; the mover chooses which one swaps.
const TWO_CHECKERS = {
  a1: 'dragon dark-dragon-head',
  b7: 'dark king',
  c9: 'light rook',
  e2: 'light king',
  e7: 'dark knight',
  e9: 'light bishop',
  f6: 'light bishop',
  h8: 'dragon moon',
  i6: 'light rook',
  i8: 'dragon light-dragon-head',
  i9: 'dragon dragon-tail',
};

describe('a move that asks which piece checkmates the Tail (rule 8)', () => {
  const ready = () => {
    const dark = clicks(start(TWO_CHECKERS, 'dark'), 'e7', 'g8');
    expect(dark.game.turn).toBe('light');
    return clicks(dark, 'e9', 'd8');
  };

  it('offers the checkmating pieces by square, and plays nothing yet', () => {
    const m = ready();
    expect(m.choosing).toMatchObject({ from: 'e9', to: 'd8', kind: 'mate' });
    expect(m.choosing!.choices.map((c) => c.value)).toEqual(['c9', 'g8']);
    expect(m.choosing!.choices.map((c) => c.label)).toEqual(['c9 rook', 'g8 knight']);
    expect(m.game.turn).toBe('light');
    expect(m.game.moves).toHaveLength(1);
  });

  it('plays the chosen piece: it swaps with the Tail, which turns to stone', () => {
    const m = choose(ready(), 'c9');
    expect(m.choosing).toBeNull();
    expect(m.game.moves.at(-1)!.notation).toBe('e9-d8#c9');
    expect(m.game.seats.dragon).toBe('tail-stone');
    // The rook takes the Tail's square (i9) and the Tail, now stone, stands where the rook was.
    expect(m.game.position.c9).toMatchObject({ piece: 'dragon-tail', stone: true });
    expect(m.game.position.i9).toMatchObject({ piece: 'rook', side: 'light' });
  });

  it('ignores a piece that is not a choice and clicks on the board; Cancel drops the move', () => {
    const m = ready();
    expect(choose(m, 'a1').choosing).not.toBeNull();
    expect(click(m, 'a1').choosing).not.toBeNull();
    const cancelled = cancelPromotion(m);
    expect(cancelled.choosing).toBeNull();
    expect(cancelled.selected).toBeNull();
    expect(cancelled.game.turn).toBe('light');
  });
});

describe('a pawn swapped onto its last rank by a Tail checkmate (rule 9)', () => {
  const pieces = {
    b7: 'dark king',
    c9: 'light rook',
    e2: 'light king',
    g8: 'light rook',
    h7: 'light pawn',
    h9: 'dragon sun',
    i6: 'light rook',
    i8: 'dragon light-dragon-head',
    i9: 'dragon dragon-tail',
  };

  it('asks which piece it becomes, like a promotion', () => {
    const m = clicks(start(pieces, 'light'), 'h7', 'h8');
    expect(m.choosing).toMatchObject({ kind: 'swap' });
    expect(m.choosing!.choices.map((c) => c.value).sort()).toEqual([
      'bishop',
      'knight',
      'queen',
      'rook',
    ]);
    const done = choose(m, 'queen');
    expect(done.game.moves.at(-1)!.notation).toBe('h7-h8#=queen');
    expect(done.game.position.i9).toMatchObject({ piece: 'queen', side: 'light' });
  });
});

describe('check and danger marks', () => {
  // The Tail on g4, attacked by the light rook on g1: the Dragon is in check.
  const tailInCheck = {
    e1: 'light king',
    e9: 'dark king',
    g1: 'light rook',
    g4: 'dragon dragon-tail',
    i9: 'dragon sun',
  };

  it("marks the Tail when it is in check on the Dragon's turn", () => {
    const m = start(tailInCheck, 'dragon');
    expect(m.game.inCheck).toBe(true);
    expect(highlights(m).check).toEqual(['g4']);
    expect(statusLine(m.game)).toBe('Dragon to move · in check');
  });

  it('marks a King in check from the other Kinged player, not the Tail', () => {
    const m = start(
      { e1: 'light king', e9: 'dark king', e5: 'dark rook', a1: 'dragon dragon-tail' },
      'light',
    );
    expect(m.game.inCheck).toBe(true);
    expect(highlights(m).check).toEqual(['e1']);
  });

  // The light King on f2, the Dragon Head on h4 attacks it along the diagonal.
  const exposed = {
    f2: 'light king',
    e9: 'dark king',
    h4: 'dragon light-dragon-head',
    i1: 'dragon dragon-tail',
  };

  it('shows a King a Dragon piece attacks when that is not check (rule 2)', () => {
    const m = toggleDanger(start(exposed, 'light'));
    expect(m.game.inCheck).toBe(false);
    expect(highlights(m).exposed).toEqual(['f2']);
    expect(highlights(m).check).toEqual([]);
  });

  it("also shows it on the other Kinged player's turn: the Dragon may take it next", () => {
    const m = toggleDanger(start(exposed, 'dark'));
    expect(highlights(m).exposed).toEqual(['f2']);
  });

  it('shows nothing while the aid is off, and nothing when the attack is check', () => {
    expect(highlights(start(exposed, 'light')).exposed).toEqual([]);
    const easy = toggleDanger(start(exposed, 'light', { id: 'easy-3p' }));
    expect(easy.game.inCheck).toBe(true);
    expect(highlights(easy).exposed).toEqual([]);
    expect(highlights(easy).check).toEqual(['f2']);
  });

  it("a stone neither attacks nor is shown as endangered, and an out seat's pieces are stone", () => {
    const m = toggleDanger(
      start(
        {
          e9: 'dark king',
          c8: 'dark rook',
          c4: 'light rook stone',
          i1: 'dragon dragon-tail',
          h4: 'dragon light-dragon-head',
        },
        'dark',
        { seats: { light: 'out' } as Seats },
      ),
    );
    expect(highlights(m).danger).toEqual([]);
    expect(highlights(m).movable).toContain('c8');
  });
});

describe('the status line in 3-player games', () => {
  it('says whose move it is among the three', () => {
    const m = start({ e1: 'light king', e9: 'dark king', a5: 'dragon dragon-tail' }, 'dragon');
    expect(statusLine(m.game)).toBe('Dragon to move');
    expect(statusLine({ ...m.game, turn: 'light' })).toBe('Light to move');
  });
});

describe('the status line at the end of a 3-player game', () => {
  it('reads the 3-player win reasons and the players who share a draw', () => {
    const base = start(
      { e1: 'light king', e9: 'dark king', a5: 'dragon dragon-tail' },
      'dark',
    ).game;
    const line = (result: object) => statusLine({ ...base, result } as typeof base);
    expect(line({ status: 'win', winner: 'dragon', loser: 'light', reason: 'king-capture' })).toBe(
      'King captured · Dragon wins',
    );
    expect(
      line({ status: 'win', winner: 'dark', loser: 'dragon', reason: 'dragon-captured' }),
    ).toBe('Dragon pieces captured · Dark wins');
    expect(line({ status: 'win', winner: 'dark', loser: 'light', reason: 'exposed-king' })).toBe(
      'King left in check · Dark wins',
    );
    expect(line({ status: 'draw', reason: 'fifty-move', between: ['dark', 'light'] })).toBe(
      'Fifty-move rule · draw between Dark and Light',
    );
    expect(
      line({ status: 'draw', reason: 'stalemate', between: ['dark', 'light', 'dragon'] }),
    ).toBe('Stalemate · draw between Dark, Light and Dragon');
  });
});

describe('the move list in 3-player games', () => {
  it('lists the moves three to a round, in turn order: dark, light, Dragon', () => {
    const m = clicks(
      start(
        { e1: 'light king', e9: 'dark king', a5: 'dragon dragon-tail', b2: 'light pawn' },
        'dark',
      ),
      'e9',
      'e8',
      'b2',
      'b3',
      'a5',
      'a6',
      'e8',
      'e9',
    );
    expect(rounds(m.game)).toEqual([
      { number: 1, first: 'e9-e8', second: 'b2-b3', third: 'a5-a6' },
      { number: 2, first: 'e8-e9' },
    ]);
  });
});

describe('resigning in a 3-player hot-seat game (S67)', () => {
  it('resignFor puts the resignation on the history, and undo takes it back', () => {
    const m0 = fromGame(newGame(createRules('standard-3p'), info('standard-3p')));
    const m1 = resignFor(m0, 'light');
    expect(m1.game.seats.light).toBe('out');
    expect(canUndo(m1)).toBe(true);
    const back = undo(m1);
    expect(back.game).toBe(m0.game);
    expect(back.game.seats.light).toBe('active');
  });

  it('clears a selected piece, and a resignation that ends the game leaves nothing to move', () => {
    const m0 = fromGame(newGame(createRules('standard-3p'), info('standard-3p')));
    const picked = click(m0, m0.game.legal[0]!.from);
    expect(picked.selected).not.toBeNull();
    const m = resignFor(resignFor(picked, 'light'), 'dark');
    expect(m.selected).toBeNull();
    expect(m.game.result).toMatchObject({ status: 'win', reason: 'resignation' });
  });
});
