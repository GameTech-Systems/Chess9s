import { describe, expect, it } from 'vitest';
import { newGame, type Position } from '@chess9s/engine';
import {
  cancelPromotion,
  click,
  fromGame,
  highlights,
  newModel,
  promote,
  rounds,
  statusLine,
  type Model,
} from './session';
import { createRules, ruleset } from './rules';

const clicks = (m: Model, ...squares: string[]) => squares.reduce(click, m);
const king = (side: string) => ({ piece: 'king', side });

describe('the rules the game plays', () => {
  it('are draft-2p, resolved from the data in rules/ with no undecided value', () => {
    const rules = createRules();
    expect(rules.players).toBe(2);
    expect(ruleset.id).toBe('draft-2p');
    expect(ruleset.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.values(rules.values)).not.toContain(null);
  });
});

describe('selecting and moving', () => {
  it('starts with dark to move and nothing selected', () => {
    const m = newModel();
    expect(m.game.turn).toBe('dark');
    expect(m.selected).toBeNull();
    expect(highlights(m).targets).toEqual([]);
  });

  it('selecting a piece shows its legal moves', () => {
    const m = click(newModel(), 'b8');
    expect(m.selected).toBe('b8');
    expect(highlights(m).targets).toEqual([
      { at: 'b6', capture: false },
      { at: 'b7', capture: false },
    ]);
  });

  it('only pieces with a legal move can be selected: not the other side’s, not a closed Coast piece', () => {
    for (const at of ['b2', 'a9', 'a8', 'a1', 'e5', 'f9']) {
      expect(click(newModel(), at).selected, at).toBeNull();
    }
  });

  it('clicking the same square again, or an empty square, deselects', () => {
    expect(clicks(newModel(), 'b8', 'b8').selected).toBeNull();
    expect(clicks(newModel(), 'b8', 'e6').selected).toBeNull();
  });

  it('clicking another movable piece of the side switches the selection', () => {
    expect(clicks(newModel(), 'b8', 'c8').selected).toBe('c8');
  });

  it('clicking a target plays the move and passes the turn', () => {
    const m = clicks(newModel(), 'b8', 'b6');
    expect(m.game.turn).toBe('light');
    expect(m.game.position.b6).toMatchObject({ piece: 'pawn', side: 'dark' });
    expect(m.selected).toBeNull();
    expect(highlights(m).lastMove).toEqual(['b8', 'b6']);
  });

  it('the Dragon Tail is selectable by whoever’s turn it is, and a5 to e5 opens the Coast', () => {
    const selected = click(newModel(), 'a5');
    expect(highlights(selected).targets).toEqual([{ at: 'e5', capture: false }]);
    const m = click(selected, 'e5');
    expect(m.game.coastOpen).toBe(true);
    expect(m.game.turn).toBe('light');
  });

  it('marks the squares of the pieces that can move', () => {
    const { movable } = highlights(newModel());
    expect(movable).toContain('b8');
    expect(movable).toContain('a5');
    expect(movable).not.toContain('b2');
  });

  it('marks captures', () => {
    const position: Position = {
      f9: king('dark'),
      f1: king('light'),
      h2: { piece: 'rook', side: 'dark' },
      c2: { piece: 'knight', side: 'light' },
    };
    const m = click(fromGame(newGame(createRules(), ruleset, { position, turn: 'dark' })), 'h2');
    expect(highlights(m).targets).toContainEqual({ at: 'c2', capture: true });
    expect(highlights(m).targets).toContainEqual({ at: 'd2', capture: false });
  });
});

describe('check and game end', () => {
  const mate: Position = {
    i9: king('dark'),
    b8: { piece: 'rook', side: 'light' },
    c7: { piece: 'rook', side: 'light' },
    b1: king('light'),
  };
  const rules = () => {
    const r = createRules();
    return { ...r, values: { ...r.values, 'king.range': 1 } };
  };

  it('highlights the King that is in check', () => {
    const m = clicks(
      fromGame(newGame(rules(), ruleset, { position: mate, turn: 'light' })),
      'c7',
      'c9',
    );
    expect(m.game.result.status).toBe('win');
    expect(highlights(m).check).toEqual(['i9']);
  });

  it('ignores clicks once the game is over', () => {
    const over = clicks(
      fromGame(newGame(rules(), ruleset, { position: mate, turn: 'light' })),
      'c7',
      'c9',
    );
    expect(click(over, 'i9')).toBe(over);
    expect(highlights(over).movable).toEqual([]);
  });
});

describe('promotion', () => {
  const position: Position = {
    f9: king('dark'),
    f1: king('light'),
    b8: { piece: 'pawn', side: 'light' },
  };
  const ready = () =>
    clicks(fromGame(newGame(createRules(), ruleset, { position, turn: 'light' })), 'b8', 'b9');

  it('asks which piece when the move promotes', () => {
    const m = ready();
    expect(m.promoting).toEqual({
      from: 'b8',
      to: 'b9',
      choices: ['bishop', 'knight', 'queen', 'rook'],
    });
    expect(m.game.turn).toBe('light');
  });

  it('plays the chosen piece', () => {
    const m = promote(ready(), 'queen');
    expect(m.promoting).toBeNull();
    expect(m.game.position.b9).toMatchObject({ piece: 'queen', side: 'light' });
    expect(m.game.turn).toBe('dark');
  });

  it('refuses a piece that is not a choice, and can be cancelled', () => {
    expect(promote(ready(), 'king').promoting).not.toBeNull();
    const cancelled = cancelPromotion(ready());
    expect(cancelled.promoting).toBeNull();
    expect(cancelled.selected).toBeNull();
    expect(cancelled.game.turn).toBe('light');
  });

  it('ignores board clicks while a choice is waiting', () => {
    const m = ready();
    expect(click(m, 'c8')).toBe(m);
  });
});

describe('status line and move list', () => {
  const rulesFor = (range: number) => {
    const r = createRules();
    return { ...r, values: { ...r.values, 'king.range': range } };
  };
  const mate: Position = {
    i9: king('dark'),
    b8: { piece: 'rook', side: 'light' },
    c7: { piece: 'rook', side: 'light' },
    b1: king('light'),
  };

  it('says whose move it is, and when that side is in check', () => {
    expect(statusLine(newModel().game)).toBe('Dark to move');
    const checked = clicks(
      fromGame(newGame(rulesFor(2), ruleset, { position: mate, turn: 'light' })),
      'c7',
      'c9',
    );
    expect(statusLine(checked.game)).toBe('Dark to move · in check');
  });

  it('says how the game ended', () => {
    const over = clicks(
      fromGame(newGame(rulesFor(1), ruleset, { position: mate, turn: 'light' })),
      'c7',
      'c9',
    );
    expect(statusLine(over.game)).toBe('Checkmate · Light wins');
  });

  it('names a stalemate by its ruling', () => {
    const boxed: Position = {
      i9: king('dark'),
      h7: { piece: 'rook', side: 'light' },
      b8: { piece: 'rook', side: 'light' },
      b1: king('light'),
    };
    const status = (ruling: string) => {
      const r = rulesFor(1);
      const rules = { ...r, values: { ...r.values, 'draw.stalemate': ruling } };
      return statusLine(newGame(rules, ruleset, { position: boxed, turn: 'dark' }));
    };
    expect(status('draw')).toBe('Stalemate · draw');
    expect(status('loss-for-stalemated')).toBe('Stalemate · Light wins');
    expect(status('win-for-stalemated')).toBe('Stalemate · Dark wins');
  });

  it('lists moves by round, the first mover’s first', () => {
    const m = clicks(newModel(), 'b8', 'b6', 'b2', 'b4', 'c8', 'c6');
    expect(rounds(m.game)).toEqual([
      { number: 1, first: 'b8-b6', second: 'b2-b4' },
      { number: 2, first: 'c8-c6' },
    ]);
    expect(rounds(newModel().game)).toEqual([]);
  });
});
