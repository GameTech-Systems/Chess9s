import { describe, expect, it } from 'vitest';
import { playMove, resign, timeLeft } from '@chess9s/engine';
import { clearGuest, loadGuest, saveGuest, type Store } from './guest';
import { fromGame, isPaused, newModel, playFor, startTimed, tick } from './session';
import { controlById } from './timeControls';
import { createRules, listRulesets, ruleset } from './rules';

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

describe('a 3-player guest game with a resignation (S67)', () => {
  it('is kept and restored with the resignation in its place', () => {
    const info = listRulesets().find((r) => r.id === 'standard-3p')!;
    const rules = createRules('standard-3p');
    let { game } = newModel(rules, info);
    game = playMove(game, game.legal[0]!);
    game = resign(game, 'light');
    game = playMove(game, game.legal[0]!);
    const store = memory();
    saveGuest(store, { game, mode: 'hot-seat' });
    const back = loadGuest(store, rules, info)!;
    expect(back.game.resignations).toEqual([{ side: 'light', after: 1 }]);
    expect(back.game.seats.light).toBe('out');
    expect(back.game.position).toEqual(game.position);
    expect(back.game.turn).toBe(game.turn);
  });

  it('keeps a game that ended by resignation', () => {
    const info = listRulesets().find((r) => r.id === 'standard-3p')!;
    const rules = createRules('standard-3p');
    const game = resign(resign(newModel(rules, info).game, 'light'), 'dark');
    const store = memory();
    saveGuest(store, { game, mode: 'hot-seat' });
    expect(loadGuest(store, rules, info)!.game.result).toEqual(game.result);
  });
});

describe('a guest game with a clock (S65)', () => {
  const S = 1000;
  const timedGame = () => {
    let m = startTimed(newModel(), controlById('3+2')!, true, 0);
    m = playFor(m, m.game.legal[0]!, 10 * S);
    m = playFor(m, m.game.legal[0]!, 14 * S);
    return m;
  };

  it('comes back paused, with the time each seat had left', () => {
    const store = memory();
    const m = timedGame();
    saveGuest(store, { game: m.game, mode: 'hot-seat', timed: m.timed! }, 20 * S);
    const back = loadGuest(store, createRules(), ruleset)!;
    expect(back.game.moves).toHaveLength(2);
    const timed = back.timed!;
    expect(timed.control.id).toBe('3+2');
    expect(timed.showOnly).toBe(true);
    expect(timed.lefts).toEqual(m.timed!.lefts);
    const model = fromGame(back.game, timed);
    expect(isPaused(model)).toBe(true);
    // The running seat was charged up to the moment of the save, and does not run on.
    expect(timeLeft(timed.clock, m.game.turn, 999 * S)).toBe(
      timeLeft(m.timed!.clock, m.game.turn, 20 * S),
    );
  });

  it('keeps the game when the clock it saved is damaged', () => {
    const store = memory();
    const m = timedGame();
    saveGuest(store, { game: m.game, mode: 'hot-seat', timed: m.timed! }, 20 * S);
    const saved = JSON.parse(store.getItem('chess9s.guest')!);
    store.setItem('chess9s.guest', JSON.stringify({ ...saved, timed: { control: 'nope' } }));
    const back = loadGuest(store, createRules(), ruleset)!;
    expect(back.game.moves).toHaveLength(2);
    expect(back.timed).toBeUndefined();
  });

  it('saves nothing about a clock for an untimed game', () => {
    const store = memory();
    saveGuest(store, { game: twoMoves(), mode: 'hot-seat' });
    expect(JSON.parse(store.getItem('chess9s.guest')!).timed).toBeUndefined();
    expect(loadGuest(store, createRules(), ruleset)!.timed).toBeUndefined();
  });

  it('keeps a game that ended by running out of time', () => {
    const store = memory();
    const m = tick(startTimed(newModel(), controlById('1+0')!, false, 0), 61 * S);
    saveGuest(store, { game: m.game, mode: 'hot-seat', timed: m.timed! }, 62 * S);
    const back = loadGuest(store, createRules(), ruleset)!;
    expect(back.game.result).toMatchObject({ status: 'win', reason: 'timeout' });
    expect(isPaused(fromGame(back.game, back.timed!))).toBe(false);
  });

  it('keeps a 3-player game with a seat out of time, in its place', () => {
    const info = listRulesets().find((r) => r.id === 'standard-3p')!;
    const rules = createRules('standard-3p');
    let m = startTimed(newModel(rules, info), controlById('move30s')!, false, 0);
    m = tick(m, 30 * S);
    m = playFor(m, m.game.legal[0]!, 35 * S);
    const store = memory();
    saveGuest(store, { game: m.game, mode: 'hot-seat', timed: m.timed! }, 36 * S);
    const back = loadGuest(store, rules, info)!;
    expect(back.game.resignations).toEqual([{ side: 'dark', after: 0, timeout: true }]);
    expect(back.game.seats.dark).toBe('out');
    expect(back.timed!.clock.out).toEqual(['dark']);
  });
});
