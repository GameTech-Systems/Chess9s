import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type Position } from '@chess9s/engine';
import { computerMove, computerReply } from './bot';
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

describe('computerReply (what the Web Worker runs)', () => {
  it('replays the moves by notation and answers with a legal notation', () => {
    let { game } = newModel();
    game = playMove(game, game.legal[0]!);
    const notations = game.moves.map((m) => m.notation);
    const reply = computerReply(ruleset.id, notations, () => 0, 100);
    expect(game.legal.map(toNotation)).toContain(reply);
  });

  it('gives nothing for a ruleset it does not know or moves that do not replay', () => {
    expect(computerReply('no-such-ruleset', [])).toBeUndefined();
    expect(computerReply(ruleset.id, ['a1-a9'])).toBeUndefined();
  });
});
