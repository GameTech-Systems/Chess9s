// S68: how Coast pieces leave the Coast in 3-player games (coast.3p.exit, decision 0019).
// Default a5-first-then-any: each Coast piece's first way off the Coast is from A5, then any legal
// move. a5-always: only ever from A5. any-legal-move: any legal move from the start (how every
// 3-player game played before S68). Each option in each preset, attacks, keys and records.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  attacksFrom,
  placedKey,
  toNotation,
  type MoveRules,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces, validatePiece } from '../rules/formats';
import { resolveRuleset, RulesError, type Registry, type Ruleset } from '../rules/loader';
import { newGame, playMove, unbuiltFeatures, type GameState } from './game';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = read('rules/parameters.json') as Registry;
const pieceFiles = readdirSync(root + 'rules/pieces')
  .filter((f) => f.endsWith('.json'))
  .map((f) => read(`rules/pieces/${f}`));
const set = validateBoardAndPieces(read('rules/boards/standard-9x9.json'), pieceFiles, registry);
const ruleset = (id: string) => read(`rules/rulesets/${id}.json`) as Ruleset;

function rulesFor(id: string, overrides: Record<string, unknown> = {}): MoveRules {
  const base = ruleset(id);
  const values = resolveRuleset(registry, {
    ...base,
    overrides: { ...base.overrides, ...overrides },
  }).values;
  return { ...set, values, players: 3 };
}

const start = (id: string, overrides: Record<string, unknown> = {}, position?: Position) =>
  newGame(
    rulesFor(id, overrides),
    { id, version: ruleset(id).version },
    {
      turn: 'dragon',
      ...(position && { position }),
    },
  );

const play = (g: GameState, ...notations: string[]): GameState =>
  notations.reduce((s, n) => {
    const m = s.legal.find((x) => toNotation(x) === n);
    if (!m)
      throw new Error(`${n} is not legal for ${s.turn}: ${s.legal.map(toNotation).join(' ')}`);
    return playMove(s, m);
  }, g);

const COAST = new Set(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']);
/** The Dragon's moves that land off the Coast from a Coast square, as notation. */
const offCoast = (g: GameState) =>
  g.legal
    .filter((m) => COAST.has(m.from) && !COAST.has(m.to))
    .map(toNotation)
    .sort();

const PRESETS = ['draft-3p', 'standard-3p', 'easy-3p'];

describe('the registry offers three ways off the Coast', () => {
  it('coast.3p.exit: A5 first by default, always A5, or any legal move', () => {
    const p = registry.parameters.find((x) => x.id === 'coast.3p.exit')!;
    expect(p.default).toBe('a5-first-then-any');
    expect(p.options).toEqual(['a5-first-then-any', 'a5-always', 'any-legal-move']);
    expect(p.optionLabels).toEqual({
      'a5-first-then-any': 'A5 first, then any move',
      'a5-always': 'Always through A5',
      'any-legal-move': 'Any legal move',
    });
  });

  it('is built: no 3-player ruleset lists it as unbuilt, at any option', () => {
    for (const id of PRESETS) {
      for (const exit of ['a5-first-then-any', 'a5-always', 'any-legal-move']) {
        expect(unbuiltFeatures(rulesFor(id, { 'coast.3p.exit': exit }))).toEqual([]);
      }
    }
  });
});

describe.each(PRESETS)('%s at the start', (id) => {
  it('by default the Dragon leaves the Coast only from A5 (the Tail), and the Heads are boxed in', () => {
    const g = start(id);
    expect(offCoast(g).every((n) => n.startsWith('a5'))).toBe(true);
    expect(offCoast(g).length).toBeGreaterThan(0);
    const heads = g.legal.filter((m) => m.from === 'a1' || m.from === 'a9');
    expect(heads).toEqual([]);
    // The Sun and Moon may only step along the Coast (rule 2).
    const sunMoon = g.legal.filter((m) => m.from === 'a2' || m.from === 'a8').map(toNotation);
    expect(sunMoon.sort()).toEqual(['a2-a3', 'a8-a7']);
  });

  it('a5-always plays the same first turn', () => {
    expect(offCoast(start(id, { 'coast.3p.exit': 'a5-always' }))).toEqual(offCoast(start(id)));
  });

  it('any-legal-move lets the Sun and Moon take the B-file Rooks on the first turn', () => {
    const g = start(id, { 'coast.3p.exit': 'any-legal-move' });
    expect(offCoast(g)).toEqual(expect.arrayContaining(['a2xb1', 'a8xb9']));
    expect(offCoast(g).some((n) => n.startsWith('a1') || n.startsWith('a9'))).toBe(true);
  });
});

/** A bare position: Kings, one light Rook, the Dragon's Moon on a3 and its Tail on e5. */
function bare(moon: Position[string]): Position {
  return {
    f1: { piece: 'king', side: 'light', home: 'f1' },
    f9: { piece: 'king', side: 'dark', home: 'f9' },
    b4: { piece: 'rook', side: 'light', home: 'b1', moved: true },
    a3: moon,
    e5: { piece: 'dragon-tail', side: 'dragon', home: 'a5', moved: true },
  };
}
const fresh = { piece: 'moon', side: 'dragon', home: 'a2', moved: true };
const emerged = { ...fresh, left: ['coast'] };

describe('a5-first-then-any: after its first way out, a Coast piece leaves from anywhere', () => {
  it('a Moon that never left the Coast may not take b4 from a3', () => {
    const g = start('draft-3p', {}, bare(fresh));
    expect(g.legal.filter((m) => m.from === 'a3').map(toNotation)).toEqual(['a3-a2', 'a3-a4']);
  });

  it('a Moon that has left the Coast before may', () => {
    const g = start('draft-3p', {}, bare(emerged));
    expect(g.legal.map(toNotation)).toContain('a3xb4');
  });

  it('a5-always: even a Moon that has left before goes out only from A5', () => {
    const g = start('draft-3p', { 'coast.3p.exit': 'a5-always' }, bare(emerged));
    expect(g.legal.filter((m) => m.from === 'a3').map(toNotation)).toEqual(['a3-a2', 'a3-a4']);
  });

  it('any-legal-move: a Moon that never left goes out from a3', () => {
    const g = start('draft-3p', { 'coast.3p.exit': 'any-legal-move' }, bare(fresh));
    expect(g.legal.map(toNotation)).toContain('a3xb4');
  });

  it('attacks follow the same rule: a fresh Moon on a3 attacks only Coast squares', () => {
    const rules = rulesFor('draft-3p');
    expect(attacksFrom(rules, bare(fresh), 'a3')).toEqual(['a2', 'a4']);
    expect(attacksFrom(rules, bare(emerged), 'a3')).toEqual(['a2', 'a4', 'b2', 'b3', 'b4']);
  });

  it('with Dragon check on, a fresh Coast piece gives no check off the Coast', () => {
    const position: Position = {
      ...bare(fresh),
      b4: { piece: 'king', side: 'light', home: 'f1', moved: true },
      f1: { piece: 'rook', side: 'light', home: 'b1', moved: true },
    };
    const g = newGame(
      rulesFor('draft-3p', { 'dragon.3p.givesCheck': true }),
      { id: 'draft-3p', version: '0' },
      { turn: 'light', position },
    );
    // Light's King on b4 is not in check from the Moon on a3, so a quiet Rook move is legal.
    expect(g.legal.map(toNotation)).toContain('f1-f2');
  });
});

describe('a Coast piece remembers its first way out', () => {
  it('walks out through A5, comes back, and may then leave from another Coast square', () => {
    let g = start('draft-3p');
    // The Tail frees A5; dark and light move; the Moon walks a2, a3, a4, a5 and out to b4.
    g = play(g, 'a5-e5', 'b8-b7', 'b2-b3', 'a2-a3', 'b7-b6', 'c2-c3', 'a3-a4', 'c8-c7', 'd2-d3');
    g = play(g, 'a4-a5', 'c7-c6', 'h2-h3', 'a5-b4');
    expect(g.position['b4']).toMatchObject({ piece: 'moon', left: ['coast'] });
    g = play(g, 'd8-d7', 'h3-h4', 'b4-a3');
    expect(g.position['a3']).toMatchObject({ piece: 'moon', left: ['coast'] });
    g = play(g, 'd7-d6', 'h4-h5');
    expect(g.legal.map(toNotation)).toContain('a3xb3');
  });

  it("is part of the piece's repetition key, only for pieces whose data reads it", () => {
    const rules = rulesFor('draft-3p');
    expect(placedKey(rules, fresh)).not.toBe(placedKey(rules, emerged));
    const rook = { piece: 'rook', side: 'light', home: 'b1' };
    expect(placedKey(rules, { ...rook, left: ['coast'] })).toBe(placedKey(rules, rook));
  });

  it('is kept only for Coast pieces: a King that steps off the Coast carries nothing', () => {
    const position: Position = {
      a2: { piece: 'king', side: 'light', home: 'f1', moved: true },
      f9: { piece: 'king', side: 'dark', home: 'f9' },
      a5: { piece: 'dragon-tail', side: 'dragon', home: 'a5' },
    };
    let g = newGame(
      rulesFor('draft-3p'),
      { id: 'draft-3p', version: '0' },
      { turn: 'light', position },
    );
    g = play(g, 'a2-b2');
    expect(g.position['b2']!.left).toBeUndefined();
  });
});

describe('the hasLeft condition in piece data', () => {
  const moon = pieceFiles.find((p) => (p as { id: string }).id === 'moon') as Record<
    string,
    unknown
  >;

  it('names a square type the board declares', () => {
    const ok = { ...moon, squares: [{ type: 'coast', stop: false, when: { hasLeft: 'coast' } }] };
    expect(() => validatePiece(ok, set.board, registry)).not.toThrow();
    const bad = {
      ...moon,
      squares: [{ type: 'coast', stop: false, when: { hasLeft: 'no-such-square' } }],
    };
    expect(() => validatePiece(bad, set.board, registry)).toThrow(RulesError);
  });
});
