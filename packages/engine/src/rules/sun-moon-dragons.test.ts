// Batch 3 of the real pieces (S15): Sun, Moon, Dragon Heads and the Dragon Tail
// in 2-player games, driven by data. Every parameter they read for movement is
// set to every option in test/fixtures/positions/sun-moon-dragons.json;
// expected moves were worked out from docs/RULES.md by plain geometry, not from
// the engine. The Coast is treated as open: opening it is game state (S16/S17).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import cases from '../../test/fixtures/positions/sun-moon-dragons.json';
import {
  generateMoves,
  movesFrom,
  startPosition,
  toNotation,
  type MoveRules,
  type Position,
} from '../moves/generate';
import { NEUTRAL, validateBoardAndPieces, type Piece } from './formats';
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
const batch = ['sun', 'moon', 'light-dragon-head', 'dark-dragon-head', 'dragon-tail'];

describe('fixture positions: Sun, Moon, Dragon Heads, Dragon Tail', () => {
  it.each(all.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const moves = movesFrom(rulesFor(c.players, c.overrides), c.pieces, c.from).map(toNotation);
    expect(moves).toEqual([...c.expected].sort());
  });
});

describe('dragons.2p.mode (deprecated by rule set v0.2, decision D3)', () => {
  it('is refused as an override and never resolves into a game', () => {
    const base = read('rules/rulesets/draft-2p.json') as Record<string, unknown>;
    for (const option of ['blocking', 'removed']) {
      expect(() =>
        resolveRuleset(registry(), { ...base, overrides: { 'dragons.2p.mode': option } }),
      ).toThrow(/deprecated/);
    }
    expect(rulesFor(2).values).not.toHaveProperty('dragons.2p.mode');
  });

  it('is read by no piece: the Coast pieces play, they are neither blocking nor removed', () => {
    const found = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (typeof o.param === 'string') found.add(o.param);
        Object.values(o).forEach(walk);
      }
    };
    walk(Object.values(set.pieces));
    expect(found.has('dragons.2p.mode')).toBe(false);
  });
});

describe('sunMoon.canPromote', () => {
  // PROVISIONAL (S15): the owner has given no promotion targets for the Sun and Moon, so no
  // piece reads this parameter and neither option makes them promote. Update when they do.
  const far: Position = {
    d8: { piece: 'sun', side: 'light', moved: true },
    e2: { piece: 'moon', side: 'dark', moved: true },
  };

  it.each([false, true])('resolves at %s and the Sun and Moon never promote', (option) => {
    const rules = rulesFor(2, { 'sunMoon.canPromote': option });
    expect(rules.values['sunMoon.canPromote']).toBe(option);
    for (const [side, from] of [
      ['light', 'd8'],
      ['dark', 'e2'],
    ] as const) {
      const moves = movesFrom(rules, far, from);
      expect(moves.length, `${side} ${from}`).toBeGreaterThan(0);
      expect(moves.some((m) => m.promotion !== undefined)).toBe(false);
    }
  });

  it('no Sun or Moon move reaches the last rank with a promotion either', () => {
    const rules = rulesFor(2, { 'sunMoon.canPromote': true, 'sunMoon.range': 2 });
    const pieces: Position = { d8: { piece: 'sun', side: 'light', moved: true } };
    const moves = generateMoves(rules, pieces, 'light').map(toNotation);
    expect(moves).toContain('d8-d9');
    expect(moves.some((m) => m.includes('='))).toBe(false);
  });
});

describe('fixture coverage', () => {
  // Read by these pieces and set to every option in the fixtures.
  const read = [
    'sunMoon.range',
    'sunMoon.firstMoveDouble',
    'sunMoon.capture',
    'dragonHead.range',
    'dragon.canJump',
    'coast.returnAllowed',
    'tail.2p.path',
    'tail.2p.canCapture',
    'tail.capturable',
    'center.occupants',
    'center.passThrough',
  ];
  // Read by these pieces, but not about movement the fixtures can show.
  const later = [
    'coastPieces.2p.giveCheck', // check: S16 (attack maps)
    'tail.canCheck', // check: S16
    'sunMoon.3p.range', // 3-player Coast play
    'tail.3p.movement',
    'tail.3p.captures',
  ];

  it('the pieces of this batch read only the parameters covered here or set aside above', () => {
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
    expect([...found].sort()).toEqual([...read, ...later].sort());
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
    }
  });
});

describe('start position, 2 players (Coast treated as open)', () => {
  const rules = rulesFor(2);
  const start = startPosition(set.board, 2);

  it('the light Sun may step to a3, double-step to a4 or step to b3; the Head is boxed in', () => {
    expect(movesFrom(rules, start, 'a2').map(toNotation)).toEqual(['a2-a3', 'a2-a4', 'a2-b3']);
    expect(movesFrom(rules, start, 'a1')).toEqual([]);
  });

  it('the dark Moon mirrors the Sun; the dark Head is boxed in', () => {
    expect(movesFrom(rules, start, 'a8').map(toNotation)).toEqual(['a8-a6', 'a8-a7', 'a8-b7']);
    expect(movesFrom(rules, start, 'a9')).toEqual([]);
  });

  it('the Tail on a5 may jump to e5 or i5, and is moved as the neutral side', () => {
    expect(generateMoves(rules, start, NEUTRAL).map(toNotation)).toEqual(['a5-e5', 'a5-i5']);
  });
});

describe('every parameter of this batch, at every option, from the start position', () => {
  const params = [
    'sunMoon.range',
    'sunMoon.3p.range',
    'sunMoon.firstMoveDouble',
    'sunMoon.capture',
    'sunMoon.canPromote',
    'dragonHead.range',
    'dragon.canJump',
    'coast.returnAllowed',
    'tail.2p.path',
    'tail.2p.canCapture',
    'tail.3p.movement',
    'tail.3p.captures',
    'tail.capturable',
    'tail.canCheck',
    'coastPieces.2p.giveCheck',
    'center.occupants',
    'center.passThrough',
  ];

  it.each([2, 3] as const)('generates for %i players', (players) => {
    const sides = players === 2 ? ['light', 'dark', NEUTRAL] : ['light', 'dark', 'dragon', NEUTRAL];
    for (const id of params) {
      const p = registry().parameters.find((x) => x.id === id)!;
      if (!p.players.includes(players)) continue;
      const options = p.type === 'enumSet' ? p.options.map((o) => [o]) : p.options;
      for (const option of options) {
        const rules = rulesFor(players, { [id]: option });
        for (const side of sides) {
          expect(
            () => generateMoves(rules, startPosition(set.board, players), side),
            `${id}=${JSON.stringify(option)} ${side}`,
          ).not.toThrow();
        }
      }
    }
  });
});
