// S56: every 3-player parameter at its default and each option, in a seeded game from the start
// of Good Practice (draft-3p) that ends. The rules themselves: three.test.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MoveRules } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import { newGame, playMove, type GameState } from './game';

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

function rulesFor(id: string, overrides: Record<string, unknown> = {}): MoveRules {
  const base = ruleset(id);
  const values = resolveRuleset(registry, {
    ...base,
    overrides: { ...base.overrides, ...overrides },
  }).values;
  return { ...set, values, players: 3 };
}

/** A seeded game: a random legal move each turn, a capture most of the time when there is one. */
function seeded(rules: MoveRules, seed: number, most = 1500): GameState {
  let x = (seed * 7919) % 2147483647;
  const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647;
  let g = newGame(rules, { id: 'draft-3p', version: ruleset('draft-3p').version });
  while (g.result.status === 'ongoing' && g.moves.length < most) {
    const captures = g.legal.filter((m) => m.capture !== undefined);
    const pool = captures.length > 0 && rnd() < 0.7 ? captures : g.legal;
    g = playMove(g, pool[Math.floor(rnd() * pool.length)]!);
  }
  return g;
}

const threeOnly = registry.parameters.filter(
  (p) => p.status !== 'deprecated' && p.players.length === 1 && p.players[0] === 3,
);
const cases = threeOnly.flatMap((p) =>
  p.options.map((o) => [p.id, o, o === p.default ? 'default' : 'option'] as const),
);

describe('every 3-player parameter at its default and each option, in a game that ends', () => {
  it('covers the six parameters of decision 0016', () => {
    const ids = threeOnly.map((p) => p.id);
    for (const id of [
      'endings.3p',
      'dragon.3p.lastKing',
      'tail.3p.mateTiming',
      'draw.3p.threefoldRepetition',
      'draw.3p.fiftyMove',
      'check.3p.exposedKing',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it.each(cases)('%s = %j (%s)', (id, option) => {
    const p = threeOnly.find((q) => q.id === id)!;
    const rules = rulesFor('draft-3p', { ...p.requires?.[String(option)], [id]: option });
    const g = seeded(rules, 1);
    expect(g.result.status, `${g.moves.length} moves`).not.toBe('ongoing');
  });
});
