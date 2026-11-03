// S84: decision 0023 (D82). The Tail gets its own range, `tail.3p.range`: "same as the Heads"
// (the default, so no existing ruleset changes) or 1 to 8. Built as data with no engine change.
// `heavy-h3-3p` is heavy-3p 0.1.0 with the Heads limited to 3 and the Tail free (8).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toNotation, type MoveRules, type PlacedPiece, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import games from '../../test/fixtures/games/three-player-tail-range.json';
import { newGame, playMove, unbuiltFeatures } from './game';

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
const ruleset = (id: string) => read(`rules/rulesets/${id}.json`) as Ruleset;
const threePlayerIds = readdirSync(root + 'rules/rulesets')
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((id) => ruleset(id).players === 3);

/** The rules of a ruleset, with some parameters overridden on top. */
function rulesFor(id: string, overrides: Record<string, unknown> = {}): MoveRules {
  const r = ruleset(id);
  const values = resolveRuleset(registry, {
    ...r,
    overrides: { ...r.overrides, ...overrides },
  }).values;
  return { ...set, values, players: 3 };
}

const piece = (side: string, name: string, left = false): PlacedPiece => ({
  piece: name,
  side,
  moved: true,
  ...(left && { left: ['coast'] }),
});

/** The Dragon's moves from `from`, with one piece of the Dragon on that square. */
function movesOf(rules: MoveRules, name: string, from: string, extra: Position = {}): string[] {
  const position: Position = {
    f1: piece('light', 'king'),
    f9: piece('dark', 'king'),
    ...extra,
    [from]: piece('dragon', name, true),
  };
  const g = newGame(rules, { id: 'test', version: '0' }, { position, turn: 'dragon' });
  return g.legal
    .map(toNotation)
    .filter((m) => m.startsWith(from))
    .map((m) => m.slice(from.length + 1));
}

const HEAD = { a7: piece('dragon', 'light-dragon-head', true) };
const TAIL = { i5: piece('dragon', 'dragon-tail') };

/** How far the piece on c3 slides north (c4 to c9) and east (d3 to i3). */
function reach(moves: string[]): { north: number; east: number } {
  return {
    north: ['c4', 'c5', 'c6', 'c7', 'c8', 'c9'].filter((s) => moves.includes(s)).length,
    east: ['d3', 'e3', 'f3', 'g3', 'h3', 'i3'].filter((s) => moves.includes(s)).length,
  };
}
const tailReach = (rules: MoveRules) => reach(movesOf(rules, 'dragon-tail', 'c3', HEAD));
const headReach = (rules: MoveRules) => reach(movesOf(rules, 'light-dragon-head', 'c3', TAIL));

const RANGES = [1, 2, 3, 4, 5, 6, 7, 8];
const capped = (n: number) => ({ north: Math.min(n, 6), east: Math.min(n, 6) });

describe('the parameter tail.3p.range (D82)', () => {
  const p = registry.parameters.find((x) => x.id === 'tail.3p.range');

  it('is registered for the Tail in 3-player games, beside the other Tail parameters', () => {
    expect(p).toBeDefined();
    expect(p!.piece).toBe('dragon-tail');
    expect(p!.players).toEqual([3]);
    expect(p!.type).toBe('enum');
    expect(p!.group).toBe('Dragon Tail');
    expect(p!.status).toBe('experimental');
  });

  it('defaults to the Heads’ range and offers 1 to 8', () => {
    expect(p!.default).toBe('same-as-heads');
    expect(p!.options).toEqual(['same-as-heads', ...RANGES]);
    for (const o of p!.options) expect(p!.optionLabels).toHaveProperty(String(o));
    expect(p!.optionLabels!['8']).toMatch(/unlimited/i);
  });

  it('marks its source and the provisional readings', () => {
    expect(p!.source).toMatch(/0023/);
    expect(p!.notes).toMatch(/provisional/i);
  });
});

describe('the Tail slides as far as tail.3p.range says', () => {
  it.each(RANGES.flatMap((n) => [['non-coast-pieces', n] as const, ['none', n] as const]))(
    'tail.3p.captures %s, range %i',
    (captures, n) => {
      const rules = rulesFor('heavy-3p', { 'tail.3p.range': n, 'tail.3p.captures': captures });
      expect(tailReach(rules)).toEqual(capped(n));
    },
  );

  it('an explicit range is the Tail’s whatever the Heads’ range is', () => {
    for (const heads of [1, 3, 8]) {
      for (const tail of [2, 5, 8]) {
        const rules = rulesFor('heavy-3p', { 'dragonHead.range': heads, 'tail.3p.range': tail });
        expect(tailReach(rules)).toEqual(capped(tail));
        expect(headReach(rules)).toEqual(capped(heads));
      }
    }
  });

  it('takes the Tail on a capture no further than its range', () => {
    const rules = rulesFor('heavy-3p', { 'tail.3p.range': 3 });
    const m = movesOf(rules, 'dragon-tail', 'c3', {
      ...HEAD,
      c6: piece('dark', 'pawn'),
      c7: piece('dark', 'pawn'),
    });
    expect(m).toContain('c6');
    expect(m).not.toContain('c7');
  });
});

describe('the default follows dragonHead.range', () => {
  it.each(RANGES)('Heads %i: the Tail slides %i too', (n) => {
    const rules = rulesFor('heavy-3p', { 'dragonHead.range': n });
    expect(rules.values['tail.3p.range']).toBe('same-as-heads');
    expect(tailReach(rules)).toEqual(capped(n));
    expect(headReach(rules)).toEqual(capped(n));
  });

  it.each(threePlayerIds.filter((x) => x !== 'heavy-h3-3p'))(
    '%s: the default Tail moves exactly like a Tail with the Heads’ range',
    (id) => {
      const rules = rulesFor(id);
      const heads = rules.values['dragonHead.range'] as number;
      const explicit = rulesFor(id, { 'tail.3p.range': heads });
      for (const from of ['c3', 'e5']) {
        expect(movesOf(rules, 'dragon-tail', from, HEAD).sort()).toEqual(
          movesOf(explicit, 'dragon-tail', from, HEAD).sort(),
        );
      }
    },
  );

  it('changes no value of an existing ruleset except by adding the new key', () => {
    for (const id of threePlayerIds.filter((x) => x !== 'heavy-h3-3p')) {
      const r = ruleset(id);
      expect(r.overrides).not.toHaveProperty('tail.3p.range');
      const v = rulesFor(id).values;
      expect(v['tail.3p.range']).toBe('same-as-heads');
    }
  });
});

describe('Heavy-Handed Dragon, Heads 3 (D82)', () => {
  const id = 'heavy-h3-3p';

  it('is heavy-3p with dragonHead.range 3 and tail.3p.range 8', () => {
    const r = ruleset(id);
    expect(r.name).toBe('Heavy-Handed Dragon, Heads 3');
    expect(r.version).toBe('0.1.0');
    expect(r.status).toBe('experimental');
    expect(r.players).toBe(3);
    expect(r.overrides).toEqual({
      ...ruleset('heavy-3p').overrides,
      'dragonHead.range': 3,
      'tail.3p.range': 8,
    });
    const v = rulesFor(id).values;
    const b = rulesFor('heavy-3p').values;
    const changed = Object.keys(v).filter((k) => JSON.stringify(v[k]) !== JSON.stringify(b[k]));
    expect(changed.sort()).toEqual(['dragonHead.range', 'tail.3p.range']);
    expect(v['dragonHead.range']).toBe(3);
    expect(v['tail.3p.range']).toBe(8);
    expect(unbuiltFeatures(rulesFor(id))).toEqual([]);
  });

  it('a Dragon Head slides 3 squares', () => {
    expect(headReach(rulesFor(id))).toEqual(capped(3));
    const m = movesOf(rulesFor(id), 'light-dragon-head', 'c3', TAIL);
    expect(m).toEqual(expect.arrayContaining(['c4', 'c5', 'c6', 'f6', 'f3', 'c1']));
    expect(m).not.toContain('c7');
    expect(m).not.toContain('g7');
  });

  it('the Tail slides on, as far as the board allows', () => {
    expect(tailReach(rulesFor(id))).toEqual(capped(8));
    const m = movesOf(rulesFor(id), 'dragon-tail', 'c3', HEAD);
    expect(m).toEqual(expect.arrayContaining(['c9', 'i3', 'h8', 'g7']));
  });

  it('the Sim workflow’s set override changes only the Tail', () => {
    const rules = rulesFor(id, { 'tail.3p.range': 4 });
    expect(tailReach(rules)).toEqual(capped(4));
    expect(headReach(rules)).toEqual(capped(3));
  });
});

describe('recorded games of Heavy-Handed Dragon, Heads 3 play to their end', () => {
  type Recorded = {
    ruleset: string;
    seed: number;
    moves: string[];
    result: unknown;
    events: unknown[];
  };
  it.each((games.games as Recorded[]).map((g) => [`${g.ruleset} seed ${g.seed}`, g] as const))(
    '%s',
    (_name, game) => {
      const id = game.ruleset;
      let g = newGame(rulesFor(id), { id, version: ruleset(id).version });
      for (const notation of game.moves) {
        const move = g.legal.find((m) => toNotation(m) === notation);
        if (!move)
          throw new Error(`${notation} is not legal for ${g.turn} after ${g.moves.length}`);
        g = playMove(g, move);
      }
      expect(g.result).toEqual(game.result);
      expect(g.moves.flatMap((m) => m.events ?? [])).toEqual(game.events);
    },
    30_000,
  );

  it('the Tail’s own range matters: a Tail held to 1 square cannot play these games', () => {
    const id = 'heavy-h3-3p';
    const stuck = (games.games as Recorded[]).map((game) => {
      let g = newGame(rulesFor(id, { 'tail.3p.range': 1 }), { id, version: ruleset(id).version });
      for (const notation of game.moves) {
        const move = g.legal.find((m) => toNotation(m) === notation);
        if (!move) return true;
        g = playMove(g, move);
      }
      return false;
    });
    expect(stuck).toContain(true);
  }, 30_000);
});
