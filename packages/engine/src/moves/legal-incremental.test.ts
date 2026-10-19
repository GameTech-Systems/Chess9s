// The fast legality test (S23) against the plain one it replaces: for every legal-move list
// along seeded random games, under every 2-player parameter at each option, the engine's
// legalMoves must equal "apply the move, then scan every other piece's attacks for check".
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, turnOptionsOf, type GameState } from '../game/game';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry } from '../rules/loader';
import { applyMove, inCheck, legalMoves, type TurnOptions } from './check';
import { castlePath, generateMoves, toNotation, type MoveRules, type Position } from './generate';

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
const base = read('rules/rulesets/draft-2p.json') as Record<string, unknown>;

/** The full scan legalMoves used before S23 (S16), kept here as the reference. */
function reference(
  rules: MoveRules,
  position: Position,
  side: string,
  { lost, passing, alsoMove = [], allow, inert, lifts }: TurnOptions,
): string[] {
  // Castling (S22a): not out of check, and not across a square where the King would be in check.
  const castles = (m: ReturnType<typeof generateMoves>[number]) =>
    !m.castle ||
    [m.from, ...castlePath(m)].every(
      (at) =>
        !inCheck(rules, applyMove(position, { from: m.from, to: at, piece: m.piece }), side, inert),
    );
  return [...new Set([side, ...alsoMove])]
    .flatMap((mover) =>
      generateMoves(rules, position, mover, lost, passing)
        .filter((m) => mover === side || position[m.captureAt ?? m.to]?.side !== side)
        .filter((m) => allow?.(m, mover) !== false)
        .filter(castles)
        .filter(
          (m) =>
            !inCheck(rules, applyMove(position, m), side, lifts?.(m, mover) ? undefined : inert),
        ),
    )
    .map(toNotation)
    .sort();
}

/** A seeded linear congruential source in [0, 1). */
const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const twoPlayer = registry.parameters.filter(
  (p) => p.players.includes(2) && p.status !== 'deprecated',
);
const cases = twoPlayer.flatMap((p) =>
  p.options.map((option) => [p.id, p.type === 'enumSet' ? [option] : option] as const),
);

describe('legalMoves against the full scan', () => {
  it.each(cases)('%s = %j', (id, option) => {
    const { values } = resolveRuleset(registry, { ...base, overrides: { [id]: option } });
    const rules: MoveRules = { ...set, values, players: 2 };
    const random = seeded(1 + id.length * 7919 + JSON.stringify(option).length * 31);
    let g: GameState = newGame(rules, { id: 'draft-2p', version: '0.2.0' });
    let plies = 0;
    for (; plies < 24 && g.result.status === 'ongoing'; plies++) {
      const fast = legalMoves(rules, g.position, g.turn, turnOptionsOf(g)).map(toNotation);
      expect(fast).toEqual(reference(rules, g.position, g.turn, turnOptionsOf(g)));
      // Prefer captures and checks now and then, so the games reach tactical positions.
      const sharp = g.legal.filter((m) => m.capture !== undefined);
      const pool = sharp.length > 0 && random() < 0.5 ? sharp : g.legal;
      g = playMove(g, pool[Math.floor(random() * pool.length)]!);
    }
    expect(plies).toBeGreaterThan(0);
  });
});
