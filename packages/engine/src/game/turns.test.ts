// Turn order (S16): seats come from the board's setup, any number of them;
// turn.firstMove picks who starts in 2-player games.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MoveRules } from '../moves/generate';
import { validateBoard, validateBoardAndPieces, type Board } from '../rules/formats';
import { RulesError, resolveRuleset, type Registry } from '../rules/loader';
import { nextSide, turnOrder } from './turns';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = () => read('rules/parameters.json') as Registry;
const pieceFiles = readdirSync(root + 'rules/pieces').filter((f) => f.endsWith('.json'));
const set = validateBoardAndPieces(
  read('rules/boards/standard-9x9.json'),
  pieceFiles.map((f) => read(`rules/pieces/${f}`)),
  registry(),
);

function rulesFor(players: 2 | 3, overrides: Record<string, unknown> = {}): MoveRules {
  const base = read(`rules/rulesets/draft-${players}p.json`) as Record<string, unknown>;
  const { values } = resolveRuleset(registry(), { ...base, overrides });
  return { ...set, values, players };
}

describe('turnOrder', () => {
  it('2 players: dark moves first by default (turn.firstMove = dark)', () => {
    expect(turnOrder(rulesFor(2))).toEqual(['dark', 'light']);
  });

  it('2 players: turn.firstMove = light lets light start', () => {
    expect(turnOrder(rulesFor(2, { 'turn.firstMove': 'light' }))).toEqual(['light', 'dark']);
  });

  it('3 players: dark, light, Dragon (docs/RULES.md)', () => {
    expect(turnOrder(rulesFor(3))).toEqual(['dark', 'light', 'dragon']);
  });

  it('never seats the neutral Tail', () => {
    for (const players of [2, 3] as const)
      expect(turnOrder(rulesFor(players))).not.toContain('neutral');
  });

  it('refuses a first mover who has no seat, and a setup without a turn order', () => {
    const rules = rulesFor(2);
    expect(() =>
      turnOrder({ ...rules, values: { ...rules.values, 'turn.firstMove': 'dragon' } }),
    ).toThrow(RulesError);
    const board = structuredClone(set.board);
    delete board.setups[0]!.turnOrder;
    expect(() => turnOrder({ ...rules, board })).toThrow(/turn order/);
  });
});

describe('nextSide', () => {
  const order = ['dark', 'light', 'dragon'];

  it('goes round the seats in order', () => {
    expect(nextSide(order, 'dark')).toBe('light');
    expect(nextSide(order, 'light')).toBe('dragon');
    expect(nextSide(order, 'dragon')).toBe('dark');
    expect(nextSide(['dark', 'light'], 'light')).toBe('dark');
  });

  it('skips seats that are out (a captured King’s side in 3-player games)', () => {
    expect(nextSide(order, 'dark', ['light'])).toBe('dragon');
    expect(nextSide(order, 'dragon', ['dark'])).toBe('light');
    expect(nextSide(order, 'light', ['dark', 'dragon'])).toBe('light');
  });

  it('refuses an unknown seat and a table with nobody left', () => {
    expect(() => nextSide(order, 'neutral')).toThrow(RulesError);
    expect(() => nextSide(order, 'dark', order)).toThrow(RulesError);
  });
});

describe('board turn orders', () => {
  const board = () => structuredClone(read('rules/boards/standard-9x9.json')) as Board;

  it('the standard board seats every side of each setup once', () => {
    expect(() => validateBoard(board())).not.toThrow();
  });

  it('refuses a turn order with an undeclared, repeated, missing or neutral seat', () => {
    for (const turnOrder of [
      ['dark', 'light', 'blue'],
      ['dark', 'dark', 'light'],
      ['dark'],
      ['dark', 'light', 'neutral'],
    ]) {
      const b = board();
      b.setups[0]!.turnOrder = turnOrder;
      expect(() => validateBoard(b), JSON.stringify(turnOrder)).toThrow(/turnOrder/);
    }
  });
});
