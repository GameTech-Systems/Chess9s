// S56: stones (decision 0016, rule 10). A stone only blocks: it never moves, can't be captured,
// attacks nothing and gives no check, and no piece may move onto it. Real board and pieces,
// draft-3p.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry } from '../rules/loader';
import { checkers } from './check';
import {
  attacksFrom,
  capturable,
  movesFrom,
  placedKey,
  toNotation,
  type MoveRules,
  type Position,
} from './generate';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = read('rules/parameters.json') as Registry;
const set = validateBoardAndPieces(
  read('rules/boards/standard-9x9.json'),
  readdirSync(root + 'rules/pieces')
    .filter((f) => f.endsWith('.json'))
    .map((f) => read(`rules/pieces/${f}`)),
  registry,
);
const rules: MoveRules = {
  ...set,
  values: resolveRuleset(registry, read('rules/rulesets/draft-3p.json')).values,
  players: 3,
};

const position: Position = {
  c3: { piece: 'rook', side: 'light', moved: true },
  f3: { piece: 'pawn', side: 'dark', moved: true, stone: true },
  f6: { piece: 'rook', side: 'dark', moved: true, stone: true },
  f8: { piece: 'king', side: 'light', moved: true },
};
const to = (from: string) => movesFrom(rules, position, from).map((m) => m.to);

describe('a stone', () => {
  it('blocks a line and may not be captured or moved onto', () => {
    expect(to('c3')).toContain('e3');
    expect(to('c3')).not.toContain('f3');
    expect(to('c3')).not.toContain('g3');
  });

  it('never moves, attacks nothing and gives no check', () => {
    expect(movesFrom(rules, position, 'f6')).toEqual([]);
    expect(attacksFrom(rules, position, 'f6')).toEqual([]);
    expect(checkers(rules, position, 'light')).toEqual([]);
  });

  it('can never be captured, whatever its piece data says', () => {
    expect(capturable(rules, 'f3', position.f3!)).toBe(false);
    expect(capturable(rules, 'f3', { ...position.f3!, stone: false })).toBe(true);
  });

  it('is a different piece for repetition than the same piece alive', () => {
    expect(placedKey(rules, position.f6!)).not.toBe(
      placedKey(rules, { piece: 'rook', side: 'dark', moved: true }),
    );
  });

  it('leaves the moves of a piece beside it as they were', () => {
    const alone = movesFrom(rules, { c3: position.c3! }, 'c3').map(toNotation);
    expect(alone).toContain('c3-g3');
  });
});
