import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type Position } from '@chess9s/engine';
import { computerMove } from './bot';
import { createRules, ruleset } from './rules';
import { newModel } from './session';

const ID = { id: ruleset.id, version: ruleset.version };

describe('the search computer opponent', () => {
  it('picks a legal move from the start, whatever the random number', () => {
    const { game } = newModel();
    for (const r of [0, 0.5, 0.999999]) {
      const move = computerMove(game, () => r, 100);
      expect(game.legal).toContain(move);
    }
  });

  it('takes a queen left hanging', () => {
    const position: Position = {
      c1: { piece: 'king', side: 'light', moved: true },
      b7: { piece: 'rook', side: 'light', moved: true },
      g7: { piece: 'queen', side: 'dark', moved: true },
      i9: { piece: 'king', side: 'dark', moved: true },
    };
    const game = newGame(createRules(), ID, { position, turn: 'light', coastOpen: true });
    expect(toNotation(computerMove(game, () => 0)!)).toBe('b7xg7');
  });

  it('has no move once the game is over', () => {
    const { game } = newModel();
    expect(computerMove({ ...game, legal: [] })).toBeUndefined();
  });

  it('plays legal moves through a short game (capped)', () => {
    let { game } = newModel();
    for (let i = 0; i < 6 && game.result.status === 'ongoing'; i++) {
      game = playMove(game, computerMove(game, Math.random, 100)!);
    }
    expect(game.moves.length).toBeGreaterThan(0);
  });
});
