// Batch 1 of the real pieces (S13): King, Rook, Bishop and Knight, driven by
// data. Every parameter they read is set to every option in
// test/fixtures/positions/standard-pieces.json; expected moves were worked out
// from docs/RULES.md by plain geometry, not from the engine.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import cases from '../../test/fixtures/positions/standard-pieces.json';
import {
  generateMoves,
  movesFrom,
  startPosition,
  toNotation,
  type MoveRules,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces, type Piece } from './formats';
import { resolveRuleset, type Registry } from './loader';

interface Case {
  name: string;
  players: 2 | 3;
  overrides?: Record<string, unknown>;
  side: string;
  from: string;
  pieces: Position;
  expected: string[];
}

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

const all = cases.cases as Case[];
const batch = ['king', 'rook', 'bishop', 'knight'];

describe('fixture positions: King, Rook, Bishop, Knight', () => {
  it.each(all.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const moves = movesFrom(rulesFor(c.players, c.overrides), c.pieces, c.from).map(toNotation);
    expect(moves).toEqual([...c.expected].sort());
  });
});

describe('fixture coverage', () => {
  const read = ['king.range', 'king.canJump', 'king.canEnterCoast', 'center.occupants', 'center.passThrough'];

  it('the pieces of this batch read only the parameters the fixtures cover', () => {
    const found = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (typeof o.param === 'string') found.add(o.param);
        Object.values(o).forEach(walk);
      }
    };
    walk(batch.map((id) => set.pieces[id] as Piece));
    expect([...found].sort()).toEqual([...read].sort());
  });

  it.each(read)('%s is set to every option, or left at its default, somewhere', (id) => {
    const p = registry().parameters.find((x) => x.id === id)!;
    const options = (p.type === 'enumSet' ? p.options.map((o) => [o]) : p.options).map((o) => JSON.stringify(o));
    const used = new Set<string>(
      all.flatMap((c) => {
        const v = c.overrides?.[id];
        if (v === undefined) return [];
        return Array.isArray(v) ? v.map((o) => JSON.stringify([o])) : [JSON.stringify(v)];
      }),
    );
    const usedByDefault = all.some((c) => c.overrides?.[id] === undefined);
    const defaults = Array.isArray(p.default)
      ? p.default.map((o) => JSON.stringify([o]))
      : [JSON.stringify(p.default)];
    // A default is covered by any case that does not override the parameter.
    for (const o of options) expect(used.has(o) || (usedByDefault && defaults.includes(o)), `${id}=${o}`).toBe(true);
  });

  it('every case places only pieces of this board, on squares of it', () => {
    for (const c of all) {
      expect(c.pieces[c.from], c.name).toBeDefined();
      for (const [at, placed] of Object.entries(c.pieces)) {
        expect(at).toMatch(/^[a-i][1-9]$/);
        expect(Object.keys(set.pieces)).toContain(placed.piece);
      }
    }
  });
});

describe('start position, 2 players', () => {
  const rules = rulesFor(2);
  const start = startPosition(set.board, 2);
  const names = (side: string, id: string) =>
    Object.keys(start)
      .filter((at) => start[at]!.side === side && start[at]!.piece === id)
      .sort()
      .flatMap((at) => movesFrom(rules, start, at).map(toNotation));

  it.each(['light', 'dark'])('%s Rooks, Bishops and King are boxed in by their own side', (side) => {
    for (const id of ['rook', 'bishop', 'king']) expect(names(side, id)).toEqual([]);
  });

  it('the Knights have their two moves each', () => {
    expect(names('light', 'knight')).toEqual(['c1-b3', 'c1-d3', 'h1-g3', 'h1-i3']);
    expect(names('dark', 'knight')).toEqual(['c9-b7', 'c9-d7', 'h9-g7', 'h9-i7']);
  });
});

describe('every parameter of this batch, at every option, from the start position', () => {
  it.each([2, 3] as const)('generates for %i players', (players) => {
    const sides = players === 2 ? ['light', 'dark'] : ['light', 'dark', 'dragon'];
    for (const [id, option] of [
      ['king.range', 1],
      ['king.range', 4],
      ['king.canJump', true],
      ['king.canEnterCoast', false],
      ['center.occupants', 'any'],
      ['center.passThrough', ['rook', 'bishop']],
    ] as const) {
      const rules = rulesFor(players, { [id]: option });
      for (const side of sides) {
        expect(() => generateMoves(rules, startPosition(set.board, players), side)).not.toThrow();
      }
    }
  });
});
