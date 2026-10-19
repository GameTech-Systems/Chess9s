import { describe, expect, it } from 'vitest';
import { playMove } from '@chess9s/engine';
import { randomMove } from './bot';
import { newModel } from './session';

describe('the random computer opponent', () => {
  it('picks a legal move, whatever the random number', () => {
    const { game } = newModel();
    for (const r of [0, 0.3, 0.999999]) {
      const move = randomMove(game, () => r);
      expect(move).toBeDefined();
      expect(() => playMove(game, move!)).not.toThrow();
    }
  });

  it('picks the move the random number points at', () => {
    const { game } = newModel();
    expect(randomMove(game, () => 0)).toBe(game.legal[0]);
    expect(randomMove(game, () => 0.999999)).toBe(game.legal.at(-1));
  });

  it('has no move once the game is over', () => {
    const { game } = newModel();
    expect(randomMove({ ...game, legal: [] })).toBeUndefined();
  });

  it('plays a whole game of legal moves without error (capped)', () => {
    let { game } = newModel();
    for (let i = 0; i < 60 && game.result.status === 'ongoing'; i++) {
      game = playMove(game, randomMove(game)!);
    }
    expect(game.moves.length).toBeGreaterThan(0);
  });
});
