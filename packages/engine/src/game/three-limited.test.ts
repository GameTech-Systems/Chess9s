// S79: decision 0022 (D80). Heavy-Handed Dragon, Limited and Light-Handed Dragon, Limited: the
// 0.1.0 rulesets with dragonHead.range 4, built as data with no engine change. The Light-Handed
// Tail moves like a Dragon Head and reads the same parameter, so it is capped at 4 too.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toNotation, type MoveRules, type PlacedPiece, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import games from '../../test/fixtures/games/three-player-limited.json';
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

function rulesFor(id: string): MoveRules {
  return { ...set, values: resolveRuleset(registry, ruleset(id)).values, players: 3 };
}

const piece = (side: string, name: string, left = false): PlacedPiece => ({
  piece: name,
  side,
  moved: true,
  ...(left && { left: ['coast'] }),
});

/** The dragon's moves from `from`, with one piece of the Dragon on that square. */
function movesOf(id: string, name: string, from: string, extra: Position = {}): string[] {
  const position: Position = {
    f1: piece('light', 'king'),
    f9: piece('dark', 'king'),
    ...extra,
    [from]: piece('dragon', name, true),
  };
  const g = newGame(rulesFor(id), { id, version: '0' }, { position, turn: 'dragon' });
  return g.legal
    .map(toNotation)
    .filter((m) => m.startsWith(from))
    .map((m) => m.slice(from.length + 1));
}

const TAIL: Position = { i5: piece('dragon', 'dragon-tail') };

describe('the Limited rulesets (D80)', () => {
  it.each([
    ['heavy-limited-3p', 'heavy-3p', 'Heavy-Handed Dragon, Limited'],
    ['light-limited-3p', 'light-3p', 'Light-Handed Dragon, Limited'],
  ])('%s is %s with dragonHead.range 4', (id, base, name) => {
    const r = ruleset(id);
    expect(r.name).toBe(name);
    expect(r.version).toBe('0.1.0');
    expect(r.status).toBe('experimental');
    expect(r.overrides).toEqual({
      ...ruleset(base).overrides,
      'dragonHead.range': 4,
      'tail.3p.range': 4,
    });
    const v = rulesFor(id).values;
    const b = rulesFor(base).values;
    const changed = Object.keys(v).filter((k) => JSON.stringify(v[k]) !== JSON.stringify(b[k]));
    expect(changed.sort()).toEqual(['dragonHead.range', 'tail.3p.range']);
    expect(v['dragonHead.range']).toBe(4);
    expect(v['tail.3p.range']).toBe(4);
    expect(b['dragonHead.range']).toBe(8);
    expect(unbuiltFeatures(rulesFor(id))).toEqual([]);
  });

  it.each(['heavy-limited-3p', 'light-limited-3p'])('%s: a Dragon Head slides 4 squares', (id) => {
    const m = movesOf(id, 'light-dragon-head', 'c3', TAIL);
    expect(m).toEqual(expect.arrayContaining(['c4', 'c5', 'c6', 'c7', 'g7', 'g3', 'c1']));
    expect(m).not.toContain('c8');
    expect(m).not.toContain('h8');
    expect(m).not.toContain('h3');
  });

  it.each(['heavy-3p', 'light-3p'])('%s: the same Head slides on past 4', (id) => {
    const m = movesOf(id, 'light-dragon-head', 'c3', TAIL);
    expect(m).toEqual(expect.arrayContaining(['c8', 'h8', 'h3']));
  });

  it('light-limited-3p: the Tail moves like a Head, so it is capped at 4 too', () => {
    const head = { a7: piece('dragon', 'light-dragon-head', true) };
    const m = movesOf('light-limited-3p', 'dragon-tail', 'c3', head);
    expect(m).toEqual(expect.arrayContaining(['c4', 'c7', 'g7', 'g3']));
    expect(m).not.toContain('c8');
    expect(m).not.toContain('h8');
    expect(movesOf('light-3p', 'dragon-tail', 'c3', head)).toEqual(
      expect.arrayContaining(['c8', 'h8']),
    );
  });

  it('heavy-limited-3p: the Tail moves like a Head, so it is capped at 4 too', () => {
    const head = { a7: piece('dragon', 'light-dragon-head', true) };
    const m = movesOf('heavy-limited-3p', 'dragon-tail', 'c3', head);
    expect(m).not.toContain('c8');
    expect(m).toContain('c7');
  });
});

// S81: the owner's call on the S80 screens (D81): Heavy-Handed with the Heads, and so the Tail,
// capped at 3. A new ruleset beside heavy-limited-3p, so both stay playable and comparable.
describe('Heavy-Handed Dragon, Limited to 3 (D81)', () => {
  const id = 'heavy-limited3-3p';

  it('is heavy-3p with dragonHead.range 3', () => {
    const r = ruleset(id);
    expect(r.name).toBe('Heavy-Handed Dragon, Limited to 3');
    expect(r.version).toBe('0.1.0');
    expect(r.status).toBe('experimental');
    expect(r.overrides).toEqual({
      ...ruleset('heavy-3p').overrides,
      'tail.3p.range': 3,
      'dragonHead.range': 3,
    });
    const v = rulesFor(id).values;
    const b = rulesFor('heavy-3p').values;
    const changed = Object.keys(v).filter((k) => JSON.stringify(v[k]) !== JSON.stringify(b[k]));
    expect(changed.sort()).toEqual(['dragonHead.range', 'tail.3p.range']);
    expect(v['dragonHead.range']).toBe(3);
    expect(unbuiltFeatures(rulesFor(id))).toEqual([]);
  });

  it('a Dragon Head slides 3 squares', () => {
    const m = movesOf(id, 'light-dragon-head', 'c3', TAIL);
    expect(m).toEqual(expect.arrayContaining(['c4', 'c5', 'c6', 'f6', 'f3', 'c1']));
    expect(m).not.toContain('c7');
    expect(m).not.toContain('g7');
    expect(m).not.toContain('g3');
  });

  it('the Tail moves like a Head, so it is capped at 3 too', () => {
    const head = { a7: piece('dragon', 'light-dragon-head', true) };
    const m = movesOf(id, 'dragon-tail', 'c3', head);
    expect(m).toEqual(expect.arrayContaining(['c4', 'c6', 'f6', 'f3']));
    expect(m).not.toContain('c7');
    expect(m).not.toContain('g7');
  });
});

describe('recorded games of the Limited rulesets play to their end', () => {
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
});
