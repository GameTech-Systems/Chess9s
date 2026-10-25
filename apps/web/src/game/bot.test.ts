import { describe, expect, it } from 'vitest';
import { newGame, playMove, toNotation, type Position } from '@chess9s/engine';
import { computerMove, computerReply } from './bot';
import { createRules, createRulesFor, customInfo, ruleset } from './rules';
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
    const reply = computerReply(ID, notations, () => 0, 100);
    expect(game.legal.map(toNotation)).toContain(reply);
  });

  it('gives nothing for a ruleset it does not know or moves that do not replay', () => {
    expect(computerReply({ id: 'no-such-ruleset', version: '1.0.0' }, [])).toBeUndefined();
    expect(computerReply(ID, ['a1-a9'])).toBeUndefined();
  });

  it('plays a custom ruleset from the overrides in the request, with no file for it', () => {
    // King range 3 (an override) lets the dark King's replies differ from Standard's: the worker
    // must build the rules from the overrides, since custom-1 is not in rules/rulesets/.
    const info = customInfo({ id: 'custom-1', name: 'Wide', overrides: { 'king.range': 3 } });
    let { game } = newModel(createRulesFor(info), info);
    game = playMove(game, game.legal[0]!);
    const reply = computerReply(
      { id: info.id, version: info.version, overrides: info.overrides! },
      game.moves.map((m) => m.notation),
      () => 0,
      100,
    );
    expect(game.legal.map(toNotation)).toContain(reply);
    expect(game.ruleset.overrides).toEqual({ 'king.range': 3 });
  });
});
