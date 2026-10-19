import { describe, expect, it } from 'vitest';
import boardFixture from '../../test/fixtures/boards/neutral.json';
import registryFixture from '../../test/fixtures/parameters.json';
import guard from '../../test/fixtures/pieces/guard.json';
import hopper from '../../test/fixtures/pieces/hopper.json';
import leaper from '../../test/fixtures/pieces/leaper.json';
import slider from '../../test/fixtures/pieces/slider.json';
import stepper from '../../test/fixtures/pieces/stepper.json';
import conditions from '../../test/fixtures/positions/conditions.json';
import movement from '../../test/fixtures/positions/movement.json';
import squares from '../../test/fixtures/positions/squares.json';
import { validateBoardAndPieces } from '../rules/formats';
import { RulesError, resolveRuleset } from '../rules/loader';
import {
  generateMoves,
  movesFrom,
  startPosition,
  toNotation,
  type GeneratedMove,
  type MoveRules,
  type Position,
} from './generate';

interface Case {
  name: string;
  players: 2 | 3;
  overrides?: Record<string, unknown>;
  side: string;
  from?: string;
  start?: boolean;
  pieces?: Position;
  expected: string[];
}

const set = validateBoardAndPieces(
  structuredClone(boardFixture),
  structuredClone([guard, hopper, leaper, slider, stepper]),
  structuredClone(registryFixture),
);

/** Rules for the neutral fixture with the given overrides, resolved (and so validated) by the loader. */
function rulesFor(players: 2 | 3, overrides: Record<string, unknown> = {}): MoveRules {
  const ruleset = {
    id: 'fixture',
    name: 'Fixture',
    version: '0.0.1',
    status: 'experimental',
    players,
    overrides,
  };
  const { values } = resolveRuleset(structuredClone(registryFixture), ruleset);
  return { ...set, values, players };
}

const notation = (moves: GeneratedMove[]) => moves.map(toNotation);

function run(c: Case): string[] {
  const rules = rulesFor(c.players, c.overrides);
  const position = c.start ? startPosition(rules.board, c.players) : (c.pieces ?? {});
  return notation(
    c.from ? movesFrom(rules, position, c.from) : generateMoves(rules, position, c.side),
  );
}

describe.each([
  ['movement', movement.cases],
  ['squares', squares.cases],
  ['conditions', conditions.cases],
] as [string, Case[]][])('fixture positions: %s', (_file, cases) => {
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(run(c)).toEqual([...c.expected].sort());
  });
});

describe('fixture coverage', () => {
  const all = [...movement.cases, ...squares.cases, ...conditions.cases] as Case[];

  it('sets every live fixture parameter to every option somewhere (defaults are covered by cases without overrides)', () => {
    const missing: string[] = [];
    for (const p of registryFixture.parameters) {
      if (p.status === 'deprecated') continue;
      const values = (p.type === 'enumSet' ? p.options.map((o) => [o]) : p.options).map((o) =>
        JSON.stringify(o),
      );
      const used = new Set<string>();
      for (const c of all) {
        const v = c.overrides?.[p.id];
        if (v === undefined) continue;
        if (Array.isArray(v)) for (const o of v) used.add(JSON.stringify([o]));
        else used.add(JSON.stringify(v));
      }
      const defaults = Array.isArray(p.default)
        ? p.default.map((o) => JSON.stringify([o]))
        : [JSON.stringify(p.default)];
      for (const v of values)
        if (!used.has(v) && !defaults.includes(v)) missing.push(`${p.id}=${v}`);
    }
    expect(missing).toEqual([]);
  });

  it('places only pieces from the fixture on squares of the board', () => {
    for (const c of all) {
      for (const [at, placed] of Object.entries(c.pieces ?? {})) {
        expect(at).toMatch(/^[a-i][1-9]$/);
        expect(Object.keys(set.pieces)).toContain(placed.piece);
      }
    }
  });
});

describe('startPosition', () => {
  it('places every piece of the setup for its side, unmoved', () => {
    const p = startPosition(set.board, 2);
    expect(p['e1']).toEqual({ piece: 'guard', side: 'light' });
    expect(p['f8']).toEqual({ piece: 'stepper', side: 'dark' });
    expect(p['b6']).toEqual({ piece: 'hopper', side: 'neutral' });
    expect(Object.keys(p)).toHaveLength(15);
  });

  it('refuses a player count with no setup', () => {
    const board = { ...set.board, setups: set.board.setups.filter((s) => s.players === 2) };
    expect(() => startPosition(board, 3)).toThrow(RulesError);
  });
});

describe('determinism', () => {
  it('gives the same sorted list whatever order the position was built in', () => {
    const rules = rulesFor(2);
    const position = startPosition(rules.board, 2);
    const reversed = Object.fromEntries(Object.entries(position).reverse());
    const a = generateMoves(rules, position, 'light');
    expect(generateMoves(rules, reversed, 'light')).toEqual(a);
    expect(generateMoves(rules, position, 'light')).toEqual(a);
    const sorted = [...a].sort((x, y) => (toNotation(x) < toNotation(y) ? -1 : 1));
    expect(a).toEqual(sorted);
  });

  it('describes captures and promotions in the move itself', () => {
    const rules = rulesFor(2);
    const moves = movesFrom(
      rules,
      {
        d8: { piece: 'stepper', side: 'light', moved: true },
        c9: { piece: 'slider', side: 'dark' },
      },
      'd8',
    );
    expect(moves).toContainEqual({
      from: 'd8',
      to: 'c9',
      piece: 'stepper',
      capture: 'slider',
      promotion: 'leaper',
    });
    expect(moves).toContainEqual({ from: 'd8', to: 'd9', piece: 'stepper', promotion: 'slider' });
  });

  it('returns nothing for an empty square', () => {
    expect(movesFrom(rulesFor(2), {}, 'e5')).toEqual([]);
  });
});

describe('refusals', () => {
  const lone = (piece: string, side: string): Position => ({ e5: { piece, side } });

  it('refuses a parameter whose value is still null', () => {
    const rules = rulesFor(2);
    rules.values = { ...rules.values, 'guard.range': null };
    expect(() => generateMoves(rules, lone('guard', 'light'), 'light')).toThrow(/guard\.range/);
  });

  it('refuses a parameter the ruleset does not resolve', () => {
    const rules = rulesFor(2);
    rules.values = { ...rules.values };
    delete rules.values['gate.occupants'];
    expect(() => generateMoves(rules, { h5: { piece: 'guard', side: 'light' } }, 'light')).toThrow(
      /gate\.occupants/,
    );
  });

  it('refuses a parameter of the wrong type', () => {
    const rules = rulesFor(2);
    rules.values = { ...rules.values, 'guard.range': true };
    expect(() => generateMoves(rules, lone('guard', 'light'), 'light')).toThrow(RulesError);
  });

  it('refuses forward-relative moves for a side with no forward direction', () => {
    expect(() => generateMoves(rulesFor(3), lone('stepper', 'third'), 'third')).toThrow(/forward/);
  });

  it('refuses an unknown piece', () => {
    expect(() => generateMoves(rulesFor(2), lone('dragon', 'light'), 'light')).toThrow(/dragon/);
  });
});
