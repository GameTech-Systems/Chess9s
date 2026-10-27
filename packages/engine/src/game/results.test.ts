// Results that do not come from the board (S51, D51): a resignation and a draw by agreement.
// Online play needs both; the record of such a game keeps them.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toNotation, type MoveRules } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { RulesError, resolveRuleset, type Registry } from '../rules/loader';
import { agreeDraw, gameRecord, newGame, playMove, resign, type GameState } from './game';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = read('rules/parameters.json') as Registry;
const pieces = readdirSync(root + 'rules/pieces')
  .filter((f) => f.endsWith('.json'))
  .map((f) => read(`rules/pieces/${f}`));
const set = validateBoardAndPieces(read('rules/boards/standard-9x9.json'), pieces, registry);
const rules: MoveRules = {
  ...set,
  values: resolveRuleset(registry, read('rules/rulesets/draft-2p.json')).values,
  players: 2,
};
const ID = { id: 'draft-2p', version: '0.2.0' };

const start = () => newGame(rules, ID);
const first = (g: GameState) => playMove(g, g.legal[0]!);

describe('resign', () => {
  it('ends the game: the other seat wins by resignation', () => {
    const g = resign(start(), 'dark');
    expect(g.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'resignation',
    });
    expect(g.legal).toEqual([]);
  });

  it('may be done by the seat that is not to move', () => {
    const g = start();
    expect(g.turn).toBe('dark');
    expect(resign(g, 'light').result).toMatchObject({ winner: 'dark', loser: 'light' });
  });

  it('keeps the position and the moves', () => {
    const g = first(start());
    const r = resign(g, 'light');
    expect(r.position).toEqual(g.position);
    expect(r.moves.map((m) => m.notation)).toEqual([toNotation(g.moves[0]!)]);
  });

  it('refuses a seat that is not in the game and a game that is over', () => {
    expect(() => resign(start(), 'dragon')).toThrow(RulesError);
    expect(() => resign(resign(start(), 'dark'), 'light')).toThrow(RulesError);
  });

  it('allows no move after it', () => {
    const g = start();
    expect(() => playMove(resign(g, 'dark'), g.legal[0]!)).toThrow(RulesError);
  });
});

describe('agreeDraw', () => {
  it('ends the game in a draw by agreement', () => {
    const g = agreeDraw(first(start()));
    expect(g.result).toEqual({ status: 'draw', reason: 'agreement' });
    expect(g.legal).toEqual([]);
  });

  it('refuses a game that is over', () => {
    expect(() => agreeDraw(agreeDraw(start()))).toThrow(RulesError);
  });
});

describe('the record of a resigned or agreed game', () => {
  it('keeps the result', () => {
    expect(gameRecord(resign(first(start()), 'light')).result).toMatchObject({
      reason: 'resignation',
    });
    expect(gameRecord(agreeDraw(start())).result).toEqual({ status: 'draw', reason: 'agreement' });
  });
});
