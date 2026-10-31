// S56: 3-player games from the start: each preset played to every end in its table (decision
// 0016), from recorded games (test/fixtures/games/three-player-ends.json), and a 3-player record
// round trip. The parameters at each option: three-params.test.ts. S68 recorded the games again
// once the Coast pieces' first way out through A5 was built (decision 0019), and S71 the Standard
// games once its pieces stopped attacking from the Coast (decision 0020); the earlier games replay
// under the archived versions they were played under.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import before from '../../test/fixtures/games/three-player-ends-before-s68.json';
import beforeS71 from '../../test/fixtures/games/three-player-ends-before-s71.json';
import ends from '../../test/fixtures/games/three-player-ends.json';
import { loadRules, type RulesFiles } from '../rules/data';
import { toNotation, type MoveRules } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import { gameRecord, newGame, playMove, type GameRecord, type GameState } from './game';

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

interface Recorded {
  ruleset: string;
  rows: string[];
  moves: string[];
  result: GameState['result'];
  events: unknown[];
}

const replay = (id: string, moves: string[]): GameState =>
  moves.reduce(
    (g, notation) => {
      const move = g.legal.find((m) => toNotation(m) === notation);
      if (!move) throw new Error(`${notation} is not legal for ${g.turn} after ${g.moves.length}`);
      return playMove(g, move);
    },
    newGame(rulesFor(id), { id, version: ruleset(id).version }),
  );

describe('each preset plays from the start to every end in its table', () => {
  const games = ends.games as Recorded[];
  const rows: Record<string, string[]> = {
    'standard-3p': FULL_ROWS(),
    'draft-3p': FULL_ROWS(),
    'easy-3p': [
      'kinged-checkmates-king',
      'kinged-checkmates-tail',
      'dragon-checkmates-king',
      'draw',
    ],
    // S74, decision 0021. The Light-Handed Tail is never checkmated: no tail-stone row.
    'heavy-3p': FULL_ROWS(),
    'light-3p': FULL_ROWS().filter((r) => r !== 'tail-stone'),
  };

  it.each(Object.entries(rows))('%s has a recorded game for every row', (id, want) => {
    expect(
      games
        .filter((g) => g.ruleset === id)
        .flatMap((g) => g.rows)
        .sort(),
    ).toEqual([...want].sort());
  });

  // A long recorded game (S71's Standard draw is 386 plies) takes over 5 s to replay on CI.
  it.each(games.map((g) => [`${g.ruleset} ${g.rows.join(', ')}`, g] as const))(
    '%s',
    (_name, game) => {
      const g = replay(game.ruleset, game.moves);
      expect(g.result).toEqual(game.result);
      expect(g.moves.flatMap((m) => m.events ?? [])).toEqual(game.events);
    },
    30_000,
  );
});

describe('the Heavy-Handed and Light-Handed games end as decision 0021 says', () => {
  const games = (ends.games as Recorded[]).filter((g) => g.ruleset.match(/^(heavy|light)-3p$/));
  type Ev = { kind: string; at?: string; by?: string; lost?: true };

  it.each(games.map((g) => [`${g.ruleset} ${g.rows.join(', ')}`, g] as const))(
    '%s: the Tail turns to stone where it stands, and the Dragon that plays on loses its turn',
    (_name, game) => {
      const g = replay(game.ruleset, game.moves);
      for (let i = 0; i < g.moves.length; i++) {
        const move = g.moves[i]!;
        for (const e of (move.events ?? []) as Ev[]) {
          if (e.kind !== 'tail-stone') continue;
          // Where it stands: nothing moved onto the stone's square with this move.
          expect(move.to, `${i}`).not.toBe(e.at);
          const out = (move.events as Ev[]).some((x) => x.kind === 'dragon-out');
          const lostTurn = g.moves
            .slice(i, i + 3)
            .some((m) =>
              ((m.events ?? []) as Ev[]).some((x) => x.kind === 'turn-skipped' && x.lost),
            );
          expect(lostTurn, `${i}`).toBe(!out && game.ruleset === 'heavy-3p');
        }
      }
    },
    30_000,
  );

  it('heavy-3p: the Dragon is out only once the four are captured and the Tail is in stone', () => {
    for (const game of games.filter((g) => g.ruleset === 'heavy-3p')) {
      const g = replay(game.ruleset, game.moves);
      const at = g.moves.findIndex((m) => (m.events ?? []).some((e) => e.kind === 'dragon-out'));
      const won = g.result.status === 'win' && g.result.loser === 'dragon';
      if (at < 0 && !won) continue;
      const end = at < 0 ? g : replay(game.ruleset, game.moves.slice(0, at + 1));
      const pieces = Object.values(end.position).filter(
        (p) => p.side === 'dragon' && p.piece !== 'dragon-tail' && p.stone !== true,
      );
      expect(pieces).toEqual([]);
      const tail = Object.values(end.position).find((p) => p.piece === 'dragon-tail')!;
      expect(tail.stone).toBe(true);
    }
  });

  it('light-3p: the Tail is never checkmated; it turns to stone only with the Dragon out', () => {
    for (const game of games.filter((g) => g.ruleset === 'light-3p')) {
      const g = replay(game.ruleset, game.moves);
      for (const m of g.moves) {
        const kinds = (m.events ?? []).map((e) => e.kind);
        if (kinds.includes('tail-stone')) expect(kinds).toContain('dragon-out');
      }
    }
  });
});

function FULL_ROWS(): string[] {
  return [
    'kinged-checkmates-king',
    'dragon-captures-king',
    'duel-dragon-wins',
    'duel-kinged-wins',
    'tail-stone',
    'dragon-out',
    'draw-both-kings',
    'draw-duel',
  ];
}

describe('a 3-player game record', () => {
  it('round-trips: saved as JSON and replayed, it gives the same game', () => {
    const recorded = (ends.games as Recorded[]).find((g) => g.events.length > 1)!;
    const g = replay(recorded.ruleset, recorded.moves);
    const record = JSON.parse(JSON.stringify(gameRecord(g))) as GameRecord;
    expect(record.players).toBe(3);
    expect(record.turnOrder).toEqual(['dark', 'light', 'dragon']);
    const again = replay(record.ruleset.id, record.moves);
    expect(again.result).toEqual(record.result);
    expect(again.order).toEqual(record.turnOrder);
    expect(gameRecord(again)).toEqual(record);
  });
});

describe('games recorded before S68 and S71 replay under the versions they were played under', () => {
  // The rules files as the web app and the online server load them, archive and locks included.
  const rulesDir = root + 'rules/';
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const path = join(dir, f);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  const files: RulesFiles = Object.fromEntries(
    walk(rulesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [relative(rulesDir, f), JSON.parse(readFileSync(f, 'utf8'))]),
  );
  const data = loadRules(files);
  const old = [...before.games, ...beforeS71.games] as (Recorded & { version: string })[];

  it('covers every preset at its pre-S68 version, and Standard at its pre-S71 version', () => {
    expect([...new Set(old.map((g) => `${g.ruleset}@${g.version}`))].sort()).toEqual([
      'draft-3p@0.3.0',
      'easy-3p@0.1.0',
      'standard-3p@0.1.0',
      'standard-3p@0.2.0',
    ]);
  });

  it.each(old.map((g) => [`${g.ruleset}@${g.version} ${g.rows.join(', ')}`, g] as const))(
    '%s',
    (_name, game) => {
      const play = (rules: MoveRules) =>
        game.moves.reduce(
          (g, notation) => {
            const move = g.legal.find((m) => toNotation(m) === notation);
            if (!move) throw new Error(`${notation} is not legal after ${g.moves.length}`);
            return playMove(g, move);
          },
          newGame(rules, { id: game.ruleset, version: game.version }),
        );
      const g = play(data.rules(game.ruleset, game.version));
      expect(g.result).toEqual(game.result);
      expect(g.moves.flatMap((m) => m.events ?? [])).toEqual(game.events);
    },
    30_000,
  );

  it('most of them are not legal under the current versions (the A5 exit, no attacks from the Coast)', () => {
    const illegal = old.filter((game) => {
      try {
        game.moves.reduce(
          (g, notation) => {
            const move = g.legal.find((m) => toNotation(m) === notation);
            if (!move) throw new Error(notation);
            return playMove(g, move);
          },
          newGame(data.rules(game.ruleset), { id: game.ruleset, version: 'current' }),
        );
        return false;
      } catch {
        return true;
      }
    });
    expect(illegal.length).toBeGreaterThan(old.length / 2);
  });
});
