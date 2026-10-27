// S58: the computer in 3-player games (decision D59): the greedy player, one or two computer
// seats, the Dragon the usual one, kept with the saved guest game.
import { describe, expect, it } from 'vitest';
import { playMove, toNotation } from '@chess9s/engine';
import { computerMove, computerReply } from './bot';
import { BOT_LEVEL_3P, canToggleBot, followSeat, toggleBot, undoForHuman } from './bots';
import { loadGuest, saveGuest, type Store } from './guest';
import { createRules, listRulesets } from './rules';
import { newModel, playFor } from './session';

const info = (id: string) => listRulesets().find((r) => r.id === id)!;
const fresh = (id = 'standard-3p') => newModel(createRules(id), info(id));

const memory = (): Store => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

describe('the 3-player computer move', () => {
  it('is a legal move for the seat to move, the same for the same seed', () => {
    const { game } = fresh();
    const a = computerMove(game, () => 0.3);
    expect(game.legal).toContain(a);
    expect(computerMove(game, () => 0.3)).toBe(a);
  });

  it('plays every seat in turn through a short game', () => {
    let { game } = fresh();
    for (let i = 0; i < 9 && game.result.status === 'ongoing'; i++) {
      game = playMove(game, computerMove(game, Math.random)!);
    }
    expect(game.moves.map((m) => m.side)).toEqual([
      'dark',
      'light',
      'dragon',
      'dark',
      'light',
      'dragon',
      'dark',
      'light',
      'dragon',
    ]);
  });

  it('is what the Web Worker answers with: the moves replay, the reply is legal', () => {
    let { game } = fresh('easy-3p');
    game = playMove(game, game.legal[0]!);
    const ref = { id: 'easy-3p', version: info('easy-3p').version };
    const reply = computerReply(
      ref,
      game.moves.map((m) => m.notation),
      () => 0,
    );
    expect(game.legal.map(toNotation)).toContain(reply);
  });

  it('can be played into the model like a click-made move', () => {
    const model = fresh();
    const next = playFor(model, computerMove(model.game)!);
    expect(next.game.moves).toHaveLength(1);
  });

  it('names its level Greedy', () => {
    expect(BOT_LEVEL_3P).toBe('Greedy');
  });
});

describe('choosing the computer seats', () => {
  it('turns a seat on and off', () => {
    expect(toggleBot([], 'dragon')).toEqual(['dragon']);
    expect(toggleBot(['dragon'], 'dark')).toEqual(['dragon', 'dark']);
    expect(toggleBot(['dragon', 'dark'], 'dragon')).toEqual(['dark']);
  });

  it('takes at most two seats, so a person is always playing', () => {
    expect(canToggleBot(['dragon', 'dark'], 'light')).toBe(false);
    expect(toggleBot(['dragon', 'dark'], 'light')).toEqual(['dragon', 'dark']);
    expect(canToggleBot(['dragon', 'dark'], 'dark')).toBe(true);
    expect(canToggleBot([], 'light')).toBe(true);
  });
});

describe('undo against the computer', () => {
  it("takes back the computer seats too, so it is a person's turn again", () => {
    // dark and light play and the computer Dragon replies: undo goes back to light's turn.
    let model = fresh();
    for (let i = 0; i < 3; i++) model = playFor(model, model.game.legal[0]!);
    expect(model.game.moves.map((m) => m.side)).toEqual(['dark', 'light', 'dragon']);
    const back = undoForHuman(model, ['dragon']);
    expect(back.game.turn).toBe('light');
    expect(back.game.moves).toHaveLength(1);
  });

  it("takes back one move when the seat before it is a person's", () => {
    let model = fresh();
    for (let i = 0; i < 2; i++) model = playFor(model, model.game.legal[0]!);
    expect(undoForHuman(model, ['dragon']).game.moves).toHaveLength(1);
  });

  it('stops at the start of the game', () => {
    expect(undoForHuman(fresh(), ['dark']).game.moves).toHaveLength(0);
  });
});

describe('guest play keeps the computer seats', () => {
  it('saves and restores them', () => {
    const { game } = fresh();
    const store = memory();
    saveGuest(store, { game, mode: 'hot-seat', bots: ['dragon'] });
    const loaded = loadGuest(store, game.rules, info('standard-3p'));
    expect(loaded?.bots).toEqual(['dragon']);
  });

  it('has none when none were saved, and ignores seats the game does not have', () => {
    const { game } = fresh();
    const store = memory();
    saveGuest(store, { game, mode: 'hot-seat' });
    expect(loadGuest(store, game.rules, info('standard-3p'))?.bots ?? []).toEqual([]);
    store.setItem(
      'chess9s.guest',
      JSON.stringify({
        v: 1,
        ruleset: 'standard-3p',
        version: game.ruleset.version,
        mode: 'hot-seat',
        moves: [],
        bots: ['nobody', 'dragon', 'dark', 'light'],
      }),
    );
    expect(loadGuest(store, game.rules, info('standard-3p'))?.bots ?? []).toEqual([]);
  });
});

describe('the board follows the people, not the computer', () => {
  it('turns to the seat to move when a person moves', () => {
    expect(followSeat(fresh().game, ['dragon'])).toBe('dark');
  });

  it('stays on the person who moved last while a computer seat moves', () => {
    let model = fresh();
    for (let i = 0; i < 2; i++) model = playFor(model, model.game.legal[0]!);
    expect(model.game.turn).toBe('dragon');
    expect(followSeat(model.game, ['dragon'])).toBe('light');
  });

  it('starts on the first person to move when the computer moves first', () => {
    expect(followSeat(fresh().game, ['dark', 'light'])).toBe('dragon');
  });
});
