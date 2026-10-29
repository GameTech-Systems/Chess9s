// S71: what the Dragon's pieces may do from the Coast, who may take them there, and the 3-player
// turn order (decision 0020, owner, 29 Oct 2026). coast.3p.attackFrom = blocked (standard-3p
// 0.3.0): a Coast piece standing on a Coast square captures nothing, gives no check and guards
// nothing, but still blocks lines. allowed: as standard-3p 0.2.0 and the other presets. Kings and
// Queens may take Coast pieces on the Coast (coast.3p.capturable on in standard-3p 0.3.0).
// turn.3p.order: dark, light, Dragon (D26) or dark, Dragon, light.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  attacksFrom,
  reachFrom,
  toNotation,
  type MoveRules,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces, validatePiece } from '../rules/formats';
import { resolveRuleset, RulesError, type Registry, type Ruleset } from '../rules/loader';
import { newGame, playMove, unbuiltFeatures, type GameState } from './game';
import { turnOrder } from './turns';

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

const game = (rules: MoveRules, turn: string, position?: Position) =>
  newGame(rules, { id: 'test', version: '0' }, { turn, ...(position && { position }) });

const notations = (g: GameState, from?: string) =>
  g.legal
    .filter((m) => from === undefined || m.from === from)
    .map(toNotation)
    .sort();

const BLOCKED = { 'coast.3p.attackFrom': 'blocked' };
const ALLOWED = { 'coast.3p.attackFrom': 'allowed' };
const COAST_PIECES = ['dark-dragon-head', 'light-dragon-head', 'sun', 'moon', 'dragon-tail'];

/** A piece of the Dragon's that has left the Coast once (decision 0019), so it may go anywhere. */
const out = (piece: string, home: string) => ({
  piece,
  side: 'dragon',
  home,
  moved: true,
  left: ['coast'],
});
const kings: Position = {
  f1: { piece: 'king', side: 'light', home: 'f1', moved: true },
  f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
};
const tail = { e5: { piece: 'dragon-tail', side: 'dragon', home: 'a5', moved: true } };

describe('the registry', () => {
  it('coast.3p.attackFrom: allowed by default (the other presets), blocked as an option', () => {
    const p = registry.parameters.find((x) => x.id === 'coast.3p.attackFrom')!;
    expect(p.players).toEqual([3]);
    expect(p.default).toBe('allowed');
    expect(p.options).toEqual(['allowed', 'blocked']);
    expect(Object.keys(p.optionLabels ?? {})).toEqual(['allowed', 'blocked']);
  });

  it('turn.3p.order: dark, light, Dragon by default (D26); dark, Dragon, light as an option', () => {
    const p = registry.parameters.find((x) => x.id === 'turn.3p.order')!;
    expect(p.players).toEqual([3]);
    expect(p.default).toBe('dark-light-dragon');
    expect(p.options).toEqual(['dark-light-dragon', 'dark-dragon-light']);
  });

  it('both are built in every 3-player preset, at every option', () => {
    for (const id of ['draft-3p', 'standard-3p', 'easy-3p']) {
      for (const o of [BLOCKED, ALLOWED, { 'turn.3p.order': 'dark-dragon-light' }]) {
        expect(unbuiltFeatures(rulesFor(id, o))).toEqual([]);
      }
    }
  });
});

describe('the presets (decision 0020, D74)', () => {
  it('standard-3p 0.3.0 blocks attacks from the Coast and lets Kings and Queens take there', () => {
    const s = ruleset('standard-3p');
    expect(s.version).toBe('0.3.0');
    expect(s.status).toBe('experimental');
    const v = rulesFor('standard-3p').values;
    expect(v['coast.3p.attackFrom']).toBe('blocked');
    expect(v['coast.3p.capturable']).toBe(true);
    expect(v['coast.3p.exit']).toBe('a5-first-then-any');
    expect(v['turn.3p.order']).toBe('dark-light-dragon');
    expect(v['dragon.3p.givesCheck']).toBe(false);
  });

  it.each(['draft-3p', 'easy-3p'])('%s keeps attacks from the Coast', (id) => {
    expect(rulesFor(id).values['coast.3p.attackFrom']).toBe('allowed');
  });

  it('every Coast piece carries the rule, and no other piece does', () => {
    for (const p of pieceFiles as { id: string; moveOnly?: unknown }[]) {
      expect(p.moveOnly !== undefined, p.id).toBe(COAST_PIECES.includes(p.id));
    }
  });
});

describe('coast.3p.attackFrom = blocked: a Coast piece on the Coast attacks nothing', () => {
  // The Light Dragon Head on a3 has left the Coast once; a light Rook stands on d6, on its diagonal.
  const position: Position = {
    ...kings,
    ...tail,
    a3: out('light-dragon-head', 'a1'),
    d6: { piece: 'rook', side: 'light', home: 'b1', moved: true },
  };

  it('allowed: it attacks d6 and may take the Rook', () => {
    expect(attacksFrom(rulesFor('draft-3p', ALLOWED), position, 'a3')).toContain('d6');
    expect(notations(game(rulesFor('draft-3p', ALLOWED), 'dragon', position), 'a3')).toContain(
      'a3xd6',
    );
  });

  it('blocked: it attacks nothing and takes nothing, but still moves', () => {
    const rules = rulesFor('draft-3p', BLOCKED);
    expect(attacksFrom(rules, position, 'a3')).toEqual([]);
    const moves = notations(game(rules, 'dragon', position), 'a3');
    expect(moves.some((n) => n.includes('x'))).toBe(false);
    expect(moves).toEqual(expect.arrayContaining(['a3-b4', 'a3-c5', 'a3-a2', 'a3-a9', 'a3-i3']));
    expect(moves).not.toContain('a3-d6');
  });

  it('blocked: off the Coast it attacks and takes as before', () => {
    const { a3, ...rest } = position;
    const offCoast: Position = { ...rest, b4: a3! };
    const rules = rulesFor('draft-3p', BLOCKED);
    expect(attacksFrom(rules, offCoast, 'b4')).toContain('d6');
    expect(notations(game(rules, 'dragon', offCoast), 'b4')).toContain('b4xd6');
  });

  it('blocked: it may take a piece on the Coast from off it, and return to any Coast square', () => {
    const position: Position = {
      ...kings,
      ...tail,
      c3: out('light-dragon-head', 'a1'),
      a3: { piece: 'queen', side: 'dark', home: 'e9', moved: true },
    };
    const moves = notations(game(rulesFor('standard-3p'), 'dragon', position), 'c3');
    expect(moves).toEqual(expect.arrayContaining(['c3xa3', 'c3-a1', 'c3-a5']));
  });

  it.each(COAST_PIECES)('blocked: %s on a Coast square attacks nothing', (piece) => {
    const position: Position = {
      ...kings,
      a4: out(piece, 'a5'),
      b4: { piece: 'pawn', side: 'light', home: 'b2', moved: true },
      b5: { piece: 'pawn', side: 'dark', home: 'b8', moved: true },
      ...(piece !== 'dragon-tail' && tail),
    };
    expect(attacksFrom(rulesFor('draft-3p', ALLOWED), position, 'a4').length).toBeGreaterThan(0);
    expect(attacksFrom(rulesFor('draft-3p', BLOCKED), position, 'a4')).toEqual([]);
  });

  it('blocked: reachFrom still says where its moves go (the computer Tail looks for a way out)', () => {
    const allowed = rulesFor('draft-3p', ALLOWED);
    const blocked = rulesFor('draft-3p', BLOCKED);
    expect(reachFrom(blocked, position, 'a3')).toEqual(attacksFrom(allowed, position, 'a3'));
    expect(reachFrom(allowed, position, 'd6')).toEqual(attacksFrom(allowed, position, 'd6'));
  });

  it('blocked: it still blocks a line along the Coast', () => {
    // A dark Queen on a7, light's King on a1 and the Moon between them on a4.
    const position: Position = {
      a1: { piece: 'king', side: 'light', home: 'f1', moved: true },
      f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
      a7: { piece: 'queen', side: 'dark', home: 'e9', moved: true },
      a4: out('moon', 'a2'),
      ...tail,
    };
    const rules = rulesFor('draft-3p', BLOCKED);
    expect(attacksFrom(rules, position, 'a7')).not.toContain('a1');
    expect(attacksFrom(rules, position, 'a7')).toContain('a4');
  });

  it('blocked, with Dragon check on: no check from the Coast, and it guards nothing', () => {
    // Light's King on b2, the Moon on a2 beside it and the Dark Dragon Head on a1 behind the Moon.
    const position: Position = {
      b2: { piece: 'king', side: 'light', home: 'f1', moved: true },
      f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
      a2: out('moon', 'a2'),
      a1: out('dark-dragon-head', 'a9'),
      i1: { piece: 'rook', side: 'light', home: 'b1', moved: true },
      ...tail,
    };
    const check = { 'dragon.3p.givesCheck': true, 'coast.3p.capturable': true };
    // Blocked: no check, so a quiet Rook move is legal, and the King may take the unguarded Moon.
    const blocked = game(rulesFor('draft-3p', { ...check, ...BLOCKED }), 'light', position);
    expect(notations(blocked, 'i1')).toContain('i1-i2');
    expect(notations(blocked, 'b2')).toContain('b2xa2');
    // Allowed: the Moon and the Head give check, and the Head guards the Moon.
    const allowed = game(rulesFor('draft-3p', { ...check, ...ALLOWED }), 'light', position);
    expect(notations(allowed, 'i1')).not.toContain('i1-i2');
    expect(notations(allowed, 'b2')).not.toContain('b2xa2');
  });

  it('blocked: a Coast piece on the Coast can never take a King', () => {
    const position: Position = {
      b1: { piece: 'king', side: 'light', home: 'f1', moved: true },
      f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
      a1: out('dark-dragon-head', 'a9'),
      ...tail,
    };
    expect(notations(game(rulesFor('draft-3p', ALLOWED), 'dragon', position), 'a1')).toContain(
      'a1xb1',
    );
    expect(notations(game(rulesFor('draft-3p', BLOCKED), 'dragon', position), 'a1')).not.toContain(
      'a1xb1',
    );
  });

  it('blocked: the first moves from the start are the same, less any capture', () => {
    const allowed = notations(game(rulesFor('draft-3p', ALLOWED), 'dragon'));
    const blocked = notations(game(rulesFor('draft-3p', BLOCKED), 'dragon'));
    expect(blocked).toEqual(allowed.filter((n) => !n.includes('x')));
  });
});

describe('who may take a Coast piece on the Coast (coast.3p.capturable, D71)', () => {
  // The Dark Dragon Head on a3 (it has left once), and one light piece next to it.
  const takes = (piece: string, at: string, capturable: boolean) => {
    const position: Position = {
      f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
      ...(piece !== 'king' && { f1: { piece: 'king', side: 'light', home: 'f1', moved: true } }),
      [at]: { piece, side: 'light', home: at, moved: true },
      a3: out('dark-dragon-head', 'a9'),
      ...tail,
    };
    const rules = rulesFor('standard-3p', { 'coast.3p.capturable': capturable });
    return notations(game(rules, 'light', position), at).includes(`${at}xa3`);
  };

  it.each([
    ['king', 'b3'],
    ['queen', 'c3'],
  ])('on: a %s may take it; off: it may not', (piece, at) => {
    expect(takes(piece, at, true)).toBe(true);
    expect(takes(piece, at, false)).toBe(false);
  });

  it.each([
    ['rook', 'b3'],
    ['bishop', 'b4'],
    ['knight', 'c4'],
    ['pawn', 'b2'],
  ])('a %s may not, whatever the setting: it may not enter the Coast', (piece, at) => {
    expect(takes(piece, at, true)).toBe(false);
  });

  it('the Tail on the Coast is never taken (tail.capturable off)', () => {
    const position: Position = {
      b4: { piece: 'king', side: 'light', home: 'f1', moved: true },
      f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
      a5: { piece: 'dragon-tail', side: 'dragon', home: 'a5' },
    };
    expect(notations(game(rulesFor('standard-3p'), 'light', position), 'b4')).not.toContain(
      'b4xa5',
    );
  });
});

describe('turn.3p.order', () => {
  it('dark-light-dragon (default): dark, light, then the Dragon', () => {
    expect(turnOrder(rulesFor('standard-3p'))).toEqual(['dark', 'light', 'dragon']);
    let g = game(rulesFor('standard-3p'), 'dark');
    g = playMove(
      g,
      g.legal.find((m) => toNotation(m) === 'b8-b7')!,
    );
    expect(g.turn).toBe('light');
  });

  it('dark-dragon-light: dark, the Dragon, then light', () => {
    const rules = rulesFor('standard-3p', { 'turn.3p.order': 'dark-dragon-light' });
    expect(turnOrder(rules)).toEqual(['dark', 'dragon', 'light']);
    let g = newGame(rules, { id: 'standard-3p', version: '0.3.0' });
    expect(g.turn).toBe('dark');
    g = playMove(
      g,
      g.legal.find((m) => toNotation(m) === 'b8-b7')!,
    );
    expect(g.turn).toBe('dragon');
    g = playMove(
      g,
      g.legal.find((m) => toNotation(m) === 'a5-e5')!,
    );
    expect(g.turn).toBe('light');
  });

  it("rule 6 follows the order: the Dragon may not leave dark's King to light's Rook when light moves next", () => {
    // Dark's King on h2, light's Rook on c2 and the Dragon's Moon (out) between them on e2.
    const position: Position = {
      h2: { piece: 'king', side: 'dark', home: 'f9', moved: true },
      b8: { piece: 'king', side: 'light', home: 'f1', moved: true },
      c2: { piece: 'rook', side: 'light', home: 'b1', moved: true },
      e2: out('moon', 'a2'),
      g9: { piece: 'dragon-tail', side: 'dragon', home: 'a5', moved: true },
    };
    const off = (order: string) =>
      notations(
        game(rulesFor('standard-3p', { 'turn.3p.order': order }), 'dragon', position),
        'e2',
      ).filter((n) => !n.endsWith('2'));
    // Dark moves next and may answer the check.
    expect(off('dark-light-dragon').length).toBeGreaterThan(0);
    // Light moves next and would take the King.
    expect(off('dark-dragon-light')).toEqual([]);
  });

  it('an order that is not a permutation of the seats is refused', () => {
    const rules = rulesFor('standard-3p');
    const bad = { ...rules, values: { ...rules.values, 'turn.3p.order': 'dark-light' } };
    expect(() => turnOrder(bad)).toThrow(RulesError);
  });

  it('is not read in 2-player games', () => {
    const base = ruleset('standard-2p');
    const values = resolveRuleset(registry, base).values;
    expect('turn.3p.order' in values).toBe(false);
    expect(turnOrder({ ...set, values, players: 2 })).toEqual(['dark', 'light']);
  });
});

describe('the moveOnly field in piece data', () => {
  const moon = pieceFiles.find((p) => (p as { id: string }).id === 'moon') as Record<
    string,
    unknown
  >;

  it('takes a condition the registry and board can check', () => {
    expect(() => validatePiece(moon, set.board, registry)).not.toThrow();
    const unknown = { ...moon, moveOnly: { when: { param: 'no.such.param', is: true } } };
    expect(() => validatePiece(unknown, set.board, registry)).toThrow(RulesError);
    const option = { ...moon, moveOnly: { when: { param: 'coast.3p.attackFrom', is: 'never' } } };
    expect(() => validatePiece(option, set.board, registry)).toThrow(RulesError);
  });
});
