// Batch 2 of the real pieces (S14): Queen and Pawn, driven by data. Every
// parameter they read is set to every option in
// test/fixtures/positions/queen-pawn.json; expected moves were worked out from
// docs/RULES.md by plain geometry, not from the engine.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import cases from '../../test/fixtures/positions/queen-pawn.json';
import {
  generateMoves,
  movesFrom,
  startPosition,
  toNotation,
  type Lost,
  type MoveRules,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces, type Piece } from './formats';
import { RulesError, resolveRuleset, type Registry } from './loader';

interface Case {
  name: string;
  players: 2 | 3;
  overrides?: Record<string, unknown>;
  side: string;
  from: string;
  pieces: Position;
  /** Pieces each side has lost; absent when the game does not track them. */
  lost?: Lost;
  expected?: string[];
  /** Substring of the RulesError the case must raise. */
  error?: string;
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
const batch = ['queen', 'pawn'];

describe('fixture positions: Queen and Pawn', () => {
  it.each(all.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const rules = rulesFor(c.players, c.overrides);
    const run = () => movesFrom(rules, c.pieces, c.from, c.lost).map(toNotation);
    if (c.error !== undefined) {
      expect(run).toThrow(RulesError);
      expect(run).toThrow(c.error);
    } else {
      expect(run()).toEqual([...c.expected!].sort());
    }
  });
});

describe('promotion to a lost piece (pawn.promotion.targets captured-piece)', () => {
  const pieces: Position = { d8: { piece: 'pawn', side: 'light', moved: true } };
  const rules = rulesFor(2, { 'pawn.promotion.targets': ['captured-piece'] });

  it('refuses a lost list that names an unknown piece', () => {
    expect(() => movesFrom(rules, pieces, 'd8', { light: ['wizard'] })).toThrow(
      'unknown piece wizard',
    );
  });

  it('is refused when a pawn reaches the last rank and no lost list was given', () => {
    expect(() => generateMoves(rules, pieces, 'light')).toThrow(RulesError);
    expect(generateMoves(rules, pieces, 'light', { light: ['rook'] }).map(toNotation)).toEqual([
      'd8-d9=rook',
    ]);
  });

  it('does not need the list while no pawn reaches the last rank', () => {
    const start = startPosition(set.board, 2);
    expect(() => generateMoves(rules, start, 'light')).not.toThrow();
    expect(() => generateMoves(rules, start, 'dark')).not.toThrow();
  });
});

describe('fixture coverage', () => {
  const read = [
    'queen.canEnterVoid',
    'queen.canEnterCoast',
    'queen.voidCrossings',
    'pawn.canEnterCenter',
    'pawn.initialDoubleStep',
    'pawn.promotion.targets',
    'center.occupants',
    'center.passThrough',
  ];

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
    const options = (p.type === 'enumSet' ? p.options.map((o) => [o]) : p.options).map((o) =>
      JSON.stringify(o),
    );
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
    for (const o of options)
      expect(used.has(o) || (usedByDefault && defaults.includes(o)), `${id}=${o}`).toBe(true);
  });

  it('every case places only pieces of this board, on squares of it', () => {
    for (const c of all) {
      expect(c.pieces[c.from], c.name).toBeDefined();
      for (const [at, placed] of Object.entries(c.pieces)) {
        expect(at).toMatch(/^[a-i][1-9]$/);
        expect(Object.keys(set.pieces)).toContain(placed.piece);
      }
      for (const ids of Object.values(c.lost ?? {}))
        for (const id of ids) expect(Object.keys(set.pieces)).toContain(id);
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

  it.each(['light', 'dark'])('the %s Queen is boxed in by her own side', (side) => {
    expect(names(side, 'queen')).toEqual([]);
  });

  it('every light pawn has a single and a double step', () => {
    const files = 'bcdefghi'.split('');
    expect(names('light', 'pawn')).toEqual(
      files.flatMap((f) => [`${f}2-${f}3`, `${f}2-${f}4`]).sort(),
    );
  });

  it('every dark pawn has a single and a double step', () => {
    const files = 'bcdefghi'.split('');
    expect(names('dark', 'pawn')).toEqual(
      files.flatMap((f) => [`${f}8-${f}6`, `${f}8-${f}7`]).sort(),
    );
  });

  it('without the double step each pawn has one move', () => {
    const single = rulesFor(2, { 'pawn.initialDoubleStep': false });
    const moves = generateMoves(single, start, 'light').filter((m) => m.piece === 'pawn');
    expect(moves.map(toNotation)).toEqual(
      'bcdefghi'
        .split('')
        .map((f) => `${f}2-${f}3`)
        .sort(),
    );
  });
});

describe('every parameter of this batch, at every option, from the start position', () => {
  it.each([2, 3] as const)('generates for %i players', (players) => {
    const sides = players === 2 ? ['light', 'dark'] : ['light', 'dark', 'dragon'];
    for (const [id, option] of [
      ['queen.canEnterVoid', true],
      ['queen.canEnterCoast', false],
      ['queen.voidCrossings', 'e5-only'],
      ['queen.voidCrossings', 'none'],
      ['pawn.canEnterCenter', true],
      ['pawn.initialDoubleStep', false],
      ['pawn.promotion.targets', ['captured-piece']],
      ['pawn.promotion.targets', ['queen', 'captured-piece']],
      ['center.occupants', 'any'],
      ['center.passThrough', ['queen', 'pawn']],
    ] as const) {
      const rules = rulesFor(players, { [id]: option });
      for (const side of sides) {
        expect(() => generateMoves(rules, startPosition(set.board, players), side)).not.toThrow();
      }
    }
  });
});
