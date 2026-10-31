// S74: decision 0021. The Heavy-Handed Dragon (D75): a Dragon piece on the Coast attacks only the
// Coast (coast.3p.attackFrom = coast-only), and the Dragon loses when the four are captured and the
// Tail is checkmated (dragon.3p.defeat = pieces-and-tail), the Tail turning to stone where it stands
// (tail.3p.stone = where-it-stands; the Dragon loses its next turn when it plays on, owner, S74
// brief). The Light-Handed Dragon (D76): the Tail only blocks and the Dragon loses when the four
// are captured (pieces-only). Clockwise turn orders only (D77). Positions:
// test/fixtures/positions/dragon-defeat.json.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../../test/fixtures/positions/dragon-defeat.json';
import {
  attacksFrom,
  squareTypes,
  toNotation,
  type MoveRules,
  type PlacedPiece,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces, validatePiece } from '../rules/formats';
import { resolveRuleset, RulesError, type Registry, type Ruleset } from '../rules/loader';
import { newGame, playMove, unbuiltFeatures, type GameState } from './game';
import type { Seats } from './three';
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

/** "<side> <piece>[ stone][ left]" as a placed piece that has moved. */
function placed(text: string): PlacedPiece {
  const [side, piece, ...flags] = text.split(' ');
  return {
    piece: piece!,
    side: side!,
    moved: true,
    ...(flags.includes('stone') && { stone: true }),
    ...(flags.includes('left') && { left: ['coast'] }),
  };
}

const describePiece = (p: PlacedPiece | undefined) =>
  p && `${p.side} ${p.piece}${p.stone ? ' stone' : ''}`;

function play(g: GameState, notation: string): GameState {
  const move = g.legal.find((m) => toNotation(m) === notation);
  if (!move) {
    throw new Error(
      `${notation} is not legal for ${g.turn} (${JSON.stringify(g.result)}): ${g.legal.map(toNotation).join(' ')}`,
    );
  }
  return playMove(g, move);
}

interface Case {
  name: string;
  ruleset?: string;
  overrides?: Record<string, unknown>;
  turn: string;
  seats?: Partial<Seats>;
  pieces: Record<string, string>;
  play?: string[];
  expect: {
    legalHas?: string[];
    legalLacks?: string[];
    checkers?: string[];
    events?: unknown[];
    seats?: Seats;
    turn?: string;
    at?: Record<string, string>;
    result?: unknown;
    next?: string[];
    nextTurn?: string;
  };
}

function start(c: Case): GameState {
  const id = c.ruleset ?? 'heavy-3p';
  const position: Position = Object.fromEntries(
    Object.entries(c.pieces).map(([at, text]) => [at, placed(text)]),
  );
  const seats = { dark: 'active', light: 'active', dragon: 'active', ...c.seats } as Seats;
  return newGame(
    rulesFor(id, c.overrides),
    { id, version: '0' },
    { position, turn: c.turn, seats },
  );
}

describe.each((fixture.cases as Case[]).map((c) => [c.name, c] as const))('%s', (_name, c) => {
  it('plays out as decision 0021 says', () => {
    let g = (c.play ?? []).reduce(play, start(c));
    const e = c.expect;
    const legal = g.legal.map(toNotation);
    for (const m of e.legalHas ?? []) expect(legal, `${m} in ${legal.join(' ')}`).toContain(m);
    for (const m of e.legalLacks ?? []) expect(legal, m).not.toContain(m);
    if (e.checkers) expect(g.checkers).toEqual(e.checkers);
    if (e.events) expect(g.moves.at(-1)?.events ?? []).toEqual(e.events);
    if (e.seats) expect(g.seats).toEqual(e.seats);
    if (e.turn) expect(g.turn).toBe(e.turn);
    for (const [at, text] of Object.entries(e.at ?? {})) {
      expect(describePiece(g.position[at]), at).toBe(text);
    }
    if (e.result) expect(g.result).toEqual(e.result);
    if (e.next) g = e.next.reduce(play, g);
    if (e.nextTurn) expect(g.turn).toBe(e.nextTurn);
  });
});

const param = (id: string) => registry.parameters.find((x) => x.id === id)!;

describe('the registry (decision 0021)', () => {
  it('coast.3p.attackFrom gains coast-only', () => {
    const p = param('coast.3p.attackFrom');
    expect(p.default).toBe('allowed');
    expect(p.options).toEqual(['allowed', 'blocked', 'coast-only']);
    expect(Object.keys(p.optionLabels ?? {})).toEqual(p.options);
  });

  it('dragon.3p.defeat: the full rules by default; pieces-and-tail and pieces-only as options', () => {
    const p = param('dragon.3p.defeat');
    expect(p.players).toEqual([3]);
    expect(p.default).toBe('tail-or-pieces-in-duel');
    expect(p.options).toEqual(['tail-or-pieces-in-duel', 'pieces-and-tail', 'pieces-only']);
    expect(p.requires?.['pieces-only']).toEqual({
      'tail.3p.captures': 'none',
      'tail.canCheck': false,
      'tail.capturable': false,
    });
  });

  it('tail.3p.stone: swap by default (0016 rule 9), where-it-stands as an option', () => {
    const p = param('tail.3p.stone');
    expect(p.players).toEqual([3]);
    expect(p.default).toBe('swap');
    expect(p.options).toEqual(['swap', 'where-it-stands']);
  });

  it('turn.3p.order: the three clockwise orders only (D77)', () => {
    const p = param('turn.3p.order');
    expect(p.default).toBe('dark-light-dragon');
    expect(p.options).toEqual(['dark-light-dragon', 'light-dragon-dark', 'dragon-dark-light']);
  });

  it('the registry is version 0.6.0', () => {
    expect((read('rules/parameters.json') as { version: string }).version).toBe('0.6.0');
  });
});

describe('the engine refuses pieces-only without a Tail that only blocks', () => {
  it.each([
    ['tail.3p.captures', 'non-coast-pieces'],
    ['tail.canCheck', true],
    ['tail.capturable', true],
  ])('%s = %j', (id, value) => {
    expect(() => rulesFor('light-3p', { [id]: value })).toThrow(RulesError);
    expect(() => rulesFor('standard-3p', { 'dragon.3p.defeat': 'pieces-only' })).toThrow(
      RulesError,
    );
  });

  it('dark-dragon-light is no longer an option', () => {
    expect(() => rulesFor('standard-3p', { 'turn.3p.order': 'dark-dragon-light' })).toThrow(
      RulesError,
    );
  });
});

describe('the rulesets (D75, D76)', () => {
  it.each([
    ['heavy-3p', 'Heavy-Handed Dragon', 'pieces-and-tail', 'non-coast-pieces'],
    ['light-3p', 'Light-Handed Dragon', 'pieces-only', 'none'],
  ])('%s', (id, name, defeat, captures) => {
    const r = ruleset(id);
    expect(r.name).toBe(name);
    expect(r.version).toBe('0.1.0');
    expect(r.status).toBe('experimental');
    const v = rulesFor(id).values;
    const standard = rulesFor('standard-3p').values;
    expect(v['dragon.3p.defeat']).toBe(defeat);
    expect(v['tail.3p.stone']).toBe('where-it-stands');
    expect(v['coast.3p.attackFrom']).toBe('coast-only');
    expect(v['tail.3p.captures']).toBe(captures);
    expect(v['turn.3p.order']).toBe('dark-light-dragon');
    // Everything else as standard-3p 0.3.0.
    const changed = Object.keys(v).filter(
      (k) => JSON.stringify(v[k]) !== JSON.stringify(standard[k]),
    );
    expect(changed.sort()).toEqual(
      [
        'coast.3p.attackFrom',
        'dragon.3p.defeat',
        'tail.3p.stone',
        ...(id === 'light-3p' ? ['tail.3p.captures'] : []),
      ].sort(),
    );
    expect(unbuiltFeatures(rulesFor(id))).toEqual([]);
  });

  it('standard-3p, draft-3p and easy-3p keep the full rules', () => {
    for (const id of ['standard-3p', 'draft-3p', 'easy-3p']) {
      const v = rulesFor(id).values;
      expect(v['dragon.3p.defeat']).toBe('tail-or-pieces-in-duel');
      expect(v['tail.3p.stone']).toBe('swap');
    }
  });
});

describe('turn.3p.order: each clockwise order starts with its seat (D77)', () => {
  it.each([
    ['dark-light-dragon', ['dark', 'light', 'dragon']],
    ['light-dragon-dark', ['light', 'dragon', 'dark']],
    ['dragon-dark-light', ['dragon', 'dark', 'light']],
  ])('%s', (order, seats) => {
    for (const id of ['standard-3p', 'heavy-3p', 'light-3p']) {
      const rules = rulesFor(id, { 'turn.3p.order': order });
      expect(turnOrder(rules)).toEqual(seats);
      let g = newGame(rules, { id, version: '0' });
      for (const seat of [...seats, seats[0]!]) {
        expect(g.turn).toBe(seat);
        g = playMove(g, g.legal[0]!);
      }
    }
  });
});

describe('coast.3p.attackFrom = coast-only: from the Coast a Dragon piece attacks the Coast only', () => {
  const COAST_PIECES = ['dark-dragon-head', 'light-dragon-head', 'sun', 'moon', 'dragon-tail'];
  const coast = new Set(
    [...squareTypes(set.board)].filter(([, t]) => t.includes('coast')).map(([at]) => at),
  );
  const position = (piece: string): Position => ({
    f1: { piece: 'king', side: 'light', home: 'f1', moved: true },
    f9: { piece: 'king', side: 'dark', home: 'f9', moved: true },
    a4: { piece, side: 'dragon', home: 'a5', moved: true, left: ['coast'] },
    ...(piece !== 'dragon-tail' && {
      e5: { piece: 'dragon-tail', side: 'dragon', home: 'a5', moved: true },
    }),
  });
  const only = { 'coast.3p.attackFrom': 'coast-only', 'tail.3p.captures': 'non-coast-pieces' };

  it.each(COAST_PIECES)('%s on a4', (piece) => {
    const allowed = attacksFrom(rulesFor('draft-3p'), position(piece), 'a4');
    const coastOnly = attacksFrom(rulesFor('draft-3p', only), position(piece), 'a4');
    expect(allowed.some((at) => !coast.has(at))).toBe(true);
    expect(coastOnly).toEqual(allowed.filter((at) => coast.has(at)));
    expect(coastOnly.length).toBeGreaterThan(0);
  });

  it('off the Coast it attacks as usual', () => {
    const p = position('sun');
    const { a4, ...rest } = p;
    const off: Position = { ...rest, b4: a4! };
    expect(attacksFrom(rulesFor('draft-3p', only), off, 'b4')).toEqual(
      attacksFrom(rulesFor('draft-3p'), off, 'b4'),
    );
  });

  it('every Coast piece carries the rule, and no other piece does', () => {
    for (const p of pieceFiles as { id: string; attackOnly?: unknown }[]) {
      expect(p.attackOnly !== undefined, p.id).toBe(COAST_PIECES.includes(p.id));
    }
  });

  it('the attackOnly field takes a condition and square types the board has', () => {
    const moon = pieceFiles.find((p) => (p as { id: string }).id === 'moon') as Record<
      string,
      unknown
    >;
    expect(() => validatePiece(moon, set.board, registry)).not.toThrow();
    const when = { param: 'coast.3p.attackFrom', is: 'coast-only' };
    expect(() =>
      validatePiece({ ...moon, attackOnly: { when, on: ['no-such-type'] } }, set.board, registry),
    ).toThrow(RulesError);
    expect(() =>
      validatePiece(
        {
          ...moon,
          attackOnly: { when: { param: 'coast.3p.attackFrom', is: 'never' }, on: ['coast'] },
        },
        set.board,
        registry,
      ),
    ).toThrow(RulesError);
  });
});
