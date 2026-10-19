import { describe, expect, it } from 'vitest';
import { playMove } from '@chess9s/engine';
import { clearGuest, loadGuest, saveGuest, type Store } from './guest';
import { newModel } from './session';
import { createRules, ruleset } from './rules';

const memory = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

const twoMoves = () => {
  let { game } = newModel();
  game = playMove(game, game.legal[0]!);
  game = playMove(game, game.legal[0]!);
  return game;
};

describe('guest play kept in the browser', () => {
  it('restores a saved game move for move, with its mode', () => {
    const store = memory();
    const game = twoMoves();
    saveGuest(store, { game, mode: 'computer' });
    const back = loadGuest(store, createRules(), ruleset)!;
    expect(back.mode).toBe('computer');
    expect(back.game.moves.map((m) => m.notation)).toEqual(game.moves.map((m) => m.notation));
    expect(back.game.turn).toBe(game.turn);
  });

  it('has nothing to load when nothing was saved or after clearing', () => {
    const store = memory();
    expect(loadGuest(store, createRules(), ruleset)).toBeNull();
    saveGuest(store, { game: twoMoves(), mode: 'hot-seat' });
    clearGuest(store);
    expect(loadGuest(store, createRules(), ruleset)).toBeNull();
  });

  it('ignores damaged, foreign or other-ruleset data', () => {
    const store = memory();
    for (const bad of [
      '{',
      '[]',
      '{"v":1,"ruleset":"draft-2p","version":"0","mode":"x","moves":[]}',
    ]) {
      store.setItem('chess9s.guest', bad);
      expect(loadGuest(store, createRules(), ruleset)).toBeNull();
    }
    store.setItem(
      'chess9s.guest',
      JSON.stringify({
        v: 1,
        ruleset: 'other',
        version: ruleset.version,
        mode: 'computer',
        moves: [],
      }),
    );
    expect(loadGuest(store, createRules(), ruleset)).toBeNull();
    store.setItem(
      'chess9s.guest',
      JSON.stringify({
        v: 1,
        ruleset: ruleset.id,
        version: ruleset.version,
        mode: 'computer',
        moves: ['z9-z8'],
      }),
    );
    expect(loadGuest(store, createRules(), ruleset)).toBeNull();
  });

  it('survives a store that throws', () => {
    const broken: Store = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => saveGuest(broken, { game: twoMoves(), mode: 'computer' })).not.toThrow();
    expect(loadGuest(broken, createRules(), ruleset)).toBeNull();
    expect(() => clearGuest(broken)).not.toThrow();
  });
});
