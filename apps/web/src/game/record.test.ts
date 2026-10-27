// The game record (S46): a game saved as JSON loads back and replays to the same result.
import { describe, expect, it } from 'vitest';
import { agreeDraw, playMove, resign, stateKey, toNotation, type GameState } from '@chess9s/engine';
import hotSeatMate from '../../../../packages/engine/test/fixtures/games/hot-seat-mate.json';
import { newModel } from './session';
import { createRulesFor, customInfo, findRuleset } from './rules';
import { openRecord, recordFile, recordJson } from './record';

const standard = findRuleset('standard-2p')!;

/** Play the first legal move `n` times. */
function played(game: GameState, n: number): GameState {
  for (let i = 0; i < n && game.result.status === 'ongoing'; i++) {
    game = playMove(game, game.legal[0]!);
  }
  return game;
}

const fresh = () => newModel(createRulesFor(standard), standard).game;

describe('game record', () => {
  it('holds the ruleset, turn order, moves, result and date, and no names', () => {
    const game = played(fresh(), 6);
    const saved = JSON.parse(recordJson(game, '2026-10-25'));
    expect(saved.ruleset).toEqual({ id: 'standard-2p', version: standard.version });
    expect(saved.turnOrder).toEqual(game.order);
    expect(saved.moves).toEqual(game.moves.map((m) => m.notation));
    expect(saved.result).toEqual({ status: 'ongoing' });
    expect(saved.date).toBe('2026-10-25');
    expect(Object.keys(saved).sort()).toEqual(
      ['date', 'format', 'moves', 'players', 'result', 'ruleset', 'turnOrder', 'v'].sort(),
    );
  });

  it('loads back and replays move for move to the same position and result', () => {
    const game = played(fresh(), 40);
    const opened = openRecord(recordJson(game, '2026-10-25'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.info.id).toBe('standard-2p');
    expect(opened.date).toBe('2026-10-25');
    expect(opened.game.moves.map((m) => m.notation)).toEqual(game.moves.map((m) => m.notation));
    expect(opened.game.position).toEqual(game.position);
    expect(opened.game.result).toEqual(game.result);
    expect(opened.game.turn).toBe(game.turn);
  });

  it('replays a game that ended', () => {
    // Fool's-mate style: play random-ish legal moves until the game ends or a cap.
    let game = fresh();
    for (let i = 0; i < 600 && game.result.status === 'ongoing'; i++) {
      game = playMove(game, game.legal[(i * 7) % game.legal.length]!);
    }
    const opened = openRecord(recordJson(game, '2026-10-25'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.game.result).toEqual(game.result);
  });

  it('keeps a custom ruleset’s overrides and replays on them', () => {
    const custom = customInfo({ id: 'mine', name: 'Mine', overrides: { 'king.range': 2 } });
    const game = played(newModel(createRulesFor(custom), custom).game, 4);
    const saved = JSON.parse(recordJson(game, '2026-10-25'));
    expect(saved.ruleset.overrides).toEqual({ 'king.range': 2 });
    const opened = openRecord(recordJson(game, '2026-10-25'));
    if (!opened.ok) throw new Error(opened.problem);
    expect(opened.info.custom).toBe(true);
    expect(opened.info.overrides).toEqual({ 'king.range': 2 });
    expect(opened.game.position).toEqual(game.position);
  });

  it('refuses what is not a record, with a reason', () => {
    const good = JSON.parse(recordJson(played(fresh(), 4), '2026-10-25'));
    const bad = (patch: object | string) =>
      openRecord(typeof patch === 'string' ? patch : JSON.stringify({ ...good, ...patch }));
    for (const input of [
      bad('not json'),
      bad('[]'),
      bad({ format: 'other' }),
      bad({ v: 2 }),
      bad({ moves: 'e2-e4' }),
      bad({ moves: ['a1-a9'] }),
      bad({ ruleset: { id: 'nope-2p', version: '1.0.0' } }),
      bad({ ruleset: { id: 'standard-2p', version: '0.0.1' } }),
      bad({ turnOrder: ['black', 'white'] }),
      bad({ result: { status: 'draw', reason: 'repetition' } }),
      bad({ date: 'yesterday' }),
    ]) {
      expect(input.ok).toBe(false);
      if (!input.ok) expect(input.problem.length).toBeGreaterThan(5);
    }
  });

  it('keeps a resignation and a draw by agreement (S51), and replays them', () => {
    for (const game of [resign(played(fresh(), 7), 'light'), agreeDraw(played(fresh(), 10))]) {
      const text = recordJson(game, '2026-10-27');
      expect(JSON.parse(text).v).toBe(1);
      const opened = openRecord(text);
      if (!opened.ok) throw new Error(opened.problem);
      expect(opened.game.result).toEqual(game.result);
      expect(stateKey(opened.game)).toBe(stateKey(game));
    }
  });

  it('refuses a resignation or agreement that the moves do not allow', () => {
    const resigned = JSON.parse(recordJson(resign(played(fresh(), 3), 'dark'), '2026-10-27'));
    const bad = (patch: object) => openRecord(JSON.stringify({ ...resigned, ...patch }));
    // A seat the game does not have.
    expect(
      bad({ result: { status: 'win', winner: 'light', loser: 'dragon', reason: 'resignation' } })
        .ok,
    ).toBe(false);
    // The winner must be the other seat.
    expect(
      bad({ result: { status: 'win', winner: 'dark', loser: 'dark', reason: 'resignation' } }).ok,
    ).toBe(false);
    // A game that ended on the board cannot also have been resigned or agreed.
    const draft = findRuleset('draft-2p', hotSeatMate.ruleset.version)!;
    let ended = newModel(createRulesFor(draft), draft).game;
    for (const n of hotSeatMate.moves) {
      ended = playMove(
        ended,
        ended.legal.find((m) => toNotation(m) === n)!,
      );
    }
    expect(ended.result.status).toBe('win');
    const over = JSON.parse(recordJson(ended, '2026-10-27'));
    expect(openRecord(JSON.stringify(over)).ok).toBe(true);
    const agreed = { ...over, result: { status: 'draw', reason: 'agreement' } };
    expect(openRecord(JSON.stringify(agreed)).ok).toBe(false);
    const result = { status: 'win', winner: 'dark', loser: 'light', reason: 'resignation' };
    expect(openRecord(JSON.stringify({ ...over, result })).ok).toBe(false);
  });

  it('names the file after the ruleset and the date', () => {
    expect(recordFile(standard, '2026-10-25')).toBe('chess9s-standard-2p-2026-10-25.json');
  });
});
