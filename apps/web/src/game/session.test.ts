import { describe, expect, it } from 'vitest';
import { agreeDraw, newGame, resign, type Position } from '@chess9s/engine';
import {
  cancelPromotion,
  canUndo,
  click,
  fromGame,
  highlights,
  newModel,
  promote,
  rounds,
  statusLine,
  toggleDanger,
  toggleMoves,
  undo,
  type Model,
} from './session';
import { createRules, listRulesets, ruleset, rulesetSettings } from './rules';

const clicks = (m: Model, ...squares: string[]) => squares.reduce(click, m);
const king = (side: string) => ({ piece: 'king', side });

describe('the rules the game plays', () => {
  it('are Standard by default, resolved from the data in rules/ with no undecided value', () => {
    const rules = createRules();
    expect(rules.players).toBe(2);
    expect(ruleset.id).toBe('standard-2p');
    expect(ruleset.name).toBe('Standard');
    expect(ruleset.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.values(rules.values)).not.toContain(null);
  });

  it('Standard is Good Practice with a one-square King (owner, 24 Oct 2026)', () => {
    const standard = createRules('standard-2p').values;
    const practice = createRules('draft-2p').values;
    expect(standard['king.range']).toBe(1);
    expect(practice['king.range']).toBe(2);
    const differ = Object.keys(practice).filter(
      (id) => JSON.stringify(practice[id]) !== JSON.stringify(standard[id]),
    );
    expect(differ).toEqual(['king.range']);
  });

  it('Easy Start sets the chess-like options: light first, one-square King, castling', () => {
    const easy = createRules('easy-2p').values;
    expect(easy['turn.firstMove']).toBe('light');
    expect(easy['king.range']).toBe(1);
    expect(easy['castling.enabled']).toBe(true);
    expect(easy['pawn.safeZones']).toBe('off');
    expect(easy['queen.canCrossVoid']).toBe(true);
    expect(easy['queen.canStandOnVoid']).toBe(true);
    expect(easy['queen.canEnterVoid']).toBeUndefined();
    const info = listRulesets().find((r) => r.id === 'easy-2p')!;
    const { game } = newModel(createRules('easy-2p'), info);
    expect(game.turn).toBe('light');
    expect(game.legal.length).toBeGreaterThan(0);
  });
});

describe('the ruleset list', () => {
  it('has every ruleset in rules/rulesets/, with a status and a player count', () => {
    const list = listRulesets();
    // The default first, then the other 2-player presets by name, then 3-player.
    expect(list.map((r) => r.id)).toEqual([
      'standard-2p',
      'easy-2p',
      'draft-2p',
      'easy-3p',
      'draft-3p',
      'standard-3p',
    ]);
    expect(list.map((r) => r.name)).toEqual([
      'Standard',
      'Easy Start',
      'Good Practice',
      'Easy Start (3-player)',
      'Good Practice (3-player)',
      'Standard (3-player)',
    ]);
    expect(list.filter((r) => r.isDefault).map((r) => r.id)).toEqual(['standard-2p']);
    for (const r of list) {
      expect(['proposed', 'experimental', 'candidate', 'official']).toContain(r.status);
      expect(r.name).not.toBe('');
    }
  });

  it('marks only the rulesets the engine can play as playable', () => {
    const byId = Object.fromEntries(listRulesets().map((r) => [r.id, r]));
    expect(byId['draft-2p']!.playable).toBe(true);
    expect(byId['draft-3p']!.playable).toBe(false);
    expect(byId['draft-3p']!.players).toBe(3);
  });

  it('builds the rules and the game record for the chosen ruleset', () => {
    expect(createRules('draft-2p').players).toBe(2);
    const practice = listRulesets().find((r) => r.id === 'draft-2p')!;
    const m = newModel(createRules('draft-2p'), practice);
    expect(m.game.ruleset).toEqual({ id: 'draft-2p', version: practice.version });
  });

  it('lists every setting of a ruleset with its value, marking those off the default', () => {
    const settings = rulesetSettings('standard-2p');
    const king = settings.find((x) => x.id === 'king.range')!;
    expect(king).toMatchObject({ label: 'King range', value: 1, defaultValue: 2, changed: true });
    expect(settings.filter((x) => x.changed).map((x) => x.id)).toEqual(['king.range']);
    // Only parameters that apply to 2-player games, none deprecated.
    expect(settings.some((x) => x.id === 'coast.3p.exit')).toBe(false);
    expect(settings.some((x) => x.id === 'dragons.2p.mode')).toBe(false);
    expect(rulesetSettings('draft-2p').filter((x) => x.changed)).toEqual([]);
  });

  it('gives each setting its group and the label of its value', () => {
    const settings = rulesetSettings('standard-2p');
    const king = settings.find((x) => x.id === 'king.range')!;
    expect(king.group).toBe('King');
    expect(settings.find((x) => x.id === 'queen.voidCrossings')).toMatchObject({
      group: 'Queen',
      valueLabel: 'A5, E5 and I5',
      defaultLabel: 'A5, E5 and I5',
    });
    expect(king).toMatchObject({ valueLabel: '1 square', defaultLabel: '2 squares' });
    for (const s of settings) expect(s.valueLabel, s.id).not.toBe('');
  });

  it('refuses a ruleset that is unknown or not playable yet', () => {
    expect(() => createRules('nope')).toThrow(/unknown ruleset/i);
    expect(() => createRules('draft-3p')).toThrow(/not playable/i);
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

  it('names the other draws in words', () => {
    const bare: Position = { f1: king('light'), f9: king('dark') };
    const drawn = newGame(createRules(), ruleset, { position: bare });
    expect(statusLine(drawn)).toBe('Insufficient material · draw');
  });

  it('names a resignation and a draw by agreement (S51)', () => {
    expect(statusLine(resign(newModel().game, 'dark'))).toBe('Resignation · Light wins');
    expect(statusLine(agreeDraw(newModel().game))).toBe('By agreement · draw');
  });

  it('castles when the King is clicked, then its Rook; the King’s own square stays a plain move', () => {
    // Good Practice (draft-2p): a 2-square King can also step onto h1 without castling.
    const r = createRules('draft-2p');
    const rules = { ...r, values: { ...r.values, 'castling.enabled': true } };
    const position: Position = {
      f1: king('light'),
      i1: { piece: 'rook', side: 'light' },
      f9: king('dark'),
    };
    const practice = listRulesets().find((x) => x.id === 'draft-2p')!;
    const m = fromGame(newGame(rules, practice, { position, turn: 'light' }));
    expect(highlights(click(m, 'f1')).targets).toContainEqual({ at: 'i1', capture: false });
    const castled = clicks(m, 'f1', 'i1').game;
    expect(castled.position.h1).toMatchObject({ piece: 'king' });
    expect(castled.position.g1).toMatchObject({ piece: 'rook' });
    const plain = clicks(m, 'f1', 'h1').game;
    expect(plain.position.h1).toMatchObject({ piece: 'king' });
    expect(plain.position.i1).toMatchObject({ piece: 'rook' });
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

describe('play aids', () => {
  const play = (...squares: string[]) => clicks(newModel(), ...squares);
  const first = () => {
    const m = newModel();
    const from = m.game.legal[0]!.from;
    const to = m.game.legal[0]!.to;
    return { m, from, to };
  };

  it('shows legal moves by default, and hides them when switched off', () => {
    const { m, from } = first();
    expect(m.showMoves).toBe(true);
    expect(highlights(click(m, from)).targets.length).toBeGreaterThan(0);
    const off = toggleMoves(m);
    expect(off.showMoves).toBe(false);
    const sel = click(off, from);
    expect(sel.selected).toBe(from);
    expect(highlights(sel).targets).toEqual([]);
  });

  it('undoes the last move, and has nothing to undo at the start', () => {
    const { m, from, to } = first();
    expect(canUndo(m)).toBe(false);
    expect(undo(m)).toBe(m);
    const after = play(from, to);
    expect(after.game.moves).toHaveLength(1);
    expect(canUndo(after)).toBe(true);
    const back = undo(after);
    expect(back.game.moves).toHaveLength(0);
    expect(back.game.turn).toBe(m.game.turn);
    expect(canUndo(back)).toBe(false);
  });

  it('keeps the aid settings when moving and undoing', () => {
    const { m, from, to } = first();
    const model = toggleDanger(toggleMoves(m));
    const after = click(click(model, from), to);
    expect(after.showMoves).toBe(false);
    expect(after.showDanger).toBe(true);
    expect(undo(after).showDanger).toBe(true);
  });

  it('marks pieces of the side to move that the other side attacks', () => {
    const position: Position = {
      e1: king('light'),
      e9: king('dark'),
      c4: { piece: 'rook', side: 'light' },
      c8: { piece: 'rook', side: 'dark' },
    };
    const game = newGame(createRules(), ruleset, { position, turn: 'light' });
    const model = fromGame(game);
    expect(highlights(model).danger).toEqual([]);
    const on = toggleDanger(model);
    expect(highlights(on).danger).toEqual(['c4']);
  });
});

describe('a move made for the computer', () => {
  it('plays the given legal move and can be undone', async () => {
    const { playFor } = await import('./session');
    const m = newModel();
    const next = playFor(m, m.game.legal[0]!);
    expect(next.game.moves).toHaveLength(1);
    expect(undo(next).game.moves).toHaveLength(0);
  });
});
