// S62: the 3-player search (decision D59). Paranoid: the seat to move plays against the other two
// together. Each seat finds a mate in two the greedy player misses; the Dragon takes a King it may
// capture; the same seed gives the same moves. S68: the Dragon brings its pieces out through A5.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, type GameState } from '../game/game';
import {
  type GeneratedMove,
  type MoveRules,
  type PlacedPiece,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import { greedyMove } from './greedy';
import { COAST_STEP, DEVELOPED, evaluateFor, terminalFor, MATE } from './paranoid';
import { bestMove } from './search';

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

function rulesFor(id: string): MoveRules {
  const ruleset = read(`rules/rulesets/${id}.json`) as Ruleset;
  return { ...set, values: resolveRuleset(registry, ruleset).values, players: 3 };
}

const placed = (text: string): PlacedPiece => {
  const [side, piece] = text.split(' ');
  return { piece: piece!, side: side!, moved: true };
};

function from(id: string, turn: string, pieces: Record<string, string>): GameState {
  const position: Position = Object.fromEntries(
    Object.entries(pieces).map(([at, text]) => [at, placed(text)]),
  );
  return newGame(rulesFor(id), { id, version: '0' }, { position, turn });
}

/** Whether `move` wins for the side playing it whatever the next two seats reply. */
function forcesMateInTwo(state: GameState, move: GeneratedMove): boolean {
  const seat = state.turn;
  const won = (s: GameState) => s.result.status === 'win' && s.result.winner === seat;
  const after = playMove(state, move);
  if (won(after)) return true;
  if (after.result.status !== 'ongoing') return false;
  return after.legal.every((a) => {
    const s1 = playMove(after, a);
    if (s1.result.status !== 'ongoing') return won(s1);
    return s1.legal.every((b) => {
      const s2 = playMove(s1, b);
      if (s2.result.status !== 'ongoing') return won(s2);
      return s2.turn === seat && s2.legal.some((c) => won(playMove(s2, c)));
    });
  });
}

const search = (g: GameState) => bestMove(g, { depth: 4, nodes: 200_000 });

describe('each seat finds a mate in two the greedy player misses', () => {
  // Two pieces walk the King to the edge: the first cuts off a rank, the second mates on the next.
  // A pawn keeps the Tail (which moves like a Dragon Head in Good Practice) off the first rank.
  const cases: [string, string, Record<string, string>][] = [
    [
      'dark',
      'standard-3p',
      {
        b3: 'dark rook',
        c4: 'dark rook',
        b4: 'dark pawn',
        f9: 'dark king',
        i1: 'light king',
        a5: 'dragon dragon-tail',
      },
    ],
    [
      'light',
      'standard-3p',
      {
        b7: 'light rook',
        c6: 'light rook',
        b6: 'light pawn',
        f1: 'light king',
        i9: 'dark king',
        a5: 'dragon dragon-tail',
      },
    ],
    [
      'dragon',
      'easy-3p',
      {
        b3: 'dragon dark-dragon-head',
        c4: 'dragon light-dragon-head',
        a5: 'dragon dragon-tail',
        f9: 'dark king',
        e9: 'dark rook',
        g9: 'dark rook',
        e8: 'dark pawn',
        f8: 'dark pawn',
        g8: 'dark pawn',
        i1: 'light king',
      },
    ],
  ];

  it.each(cases)('%s (%s)', { timeout: 60_000 }, (seat, id, pieces) => {
    const g = from(id, seat, pieces);
    const found = search(g);
    expect(found.score).toBeGreaterThan(MATE - 10);
    expect(forcesMateInTwo(g, found.move!)).toBe(true);
    // No mate in one.
    expect(g.legal.some((m) => playMove(g, m).result.status === 'win')).toBe(false);
    const greedy = greedyMove(g)!;
    expect(forcesMateInTwo(g, greedy)).toBe(false);
  });
});

describe('the Dragon', () => {
  it('takes a King it may capture, before a Queen', () => {
    // Good Practice: Dragon attacks are not check, so the light King left on d2 may be taken.
    const g = from('standard-3p', 'dragon', {
      d4: 'dragon dark-dragon-head',
      a5: 'dragon dragon-tail',
      d2: 'light king',
      f4: 'light queen',
      i9: 'dark king',
      b9: 'dark rook',
    });
    const found = bestMove(g, { depth: 2, nodes: 100_000 });
    expect(found.move?.capture).toBe('king');
    expect(playMove(g, found.move!).seats['light']).toBe('out');
  });
});

describe('the same seed gives the same moves', () => {
  it('plays the same short game twice, every seat searching', () => {
    const play = (seed: number) => {
      let s = seed;
      const random = () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
      let g = newGame(rulesFor('standard-3p'), { id: 'standard-3p', version: '0' });
      for (let i = 0; i < 6 && g.result.status === 'ongoing'; i++) {
        g = playMove(g, bestMove(g, { depth: 1, nodes: 5_000, random }).move!);
      }
      return g.moves.map((m) => m.notation);
    };
    const a = play(7);
    expect(a).toHaveLength(6);
    expect(play(7)).toEqual(a);
  });
});

describe('the score', () => {
  const g = from('standard-3p', 'dark', {
    e3: 'dark rook',
    i9: 'dark king',
    b1: 'light king',
    b2: 'light pawn',
    a5: 'dragon dragon-tail',
    a8: 'dragon dark-dragon-head',
  });

  it("is each seat's own material less the others'", () => {
    const values = { rook: 500, pawn: 100, 'dark-dragon-head': 800 };
    expect(evaluateFor(g, 'dark', values)).toBe(500 - 100 - 800);
    expect(evaluateFor(g, 'light', values)).toBe(100 - 500 - 800);
  });

  it('is a win, a loss or a shared draw at the end', () => {
    expect(
      terminalFor(
        { ...g, result: { status: 'win', winner: 'dark', loser: 'light', reason: 'checkmate' } },
        'dark',
        3,
      ),
    ).toBe(MATE - 3);
    expect(
      terminalFor(
        { ...g, result: { status: 'win', winner: 'dark', loser: 'light', reason: 'checkmate' } },
        'dragon',
        3,
      ),
    ).toBe(-(MATE - 3));
    const draw = {
      ...g,
      result: { status: 'draw', reason: 'stalemate', between: ['dark', 'light'] },
    } as GameState;
    expect(terminalFor(draw, 'light', 2)).toBe(0);
    expect(terminalFor(draw, 'dragon', 2)).toBe(-(MATE - 2));
    expect(terminalFor({ ...g, seats: { ...g.seats, light: 'out' } }, 'light', 1)).toBe(
      -(MATE - 1),
    );
  });
});

describe('the Dragon brings its pieces out through A5 (S68, decision 0019)', () => {
  // Kings far away; the Moon (which has not left the Coast yet) somewhere on file A.
  const withMoon = (at: string, extra: Partial<PlacedPiece> = {}, id = 'standard-3p') => {
    const g = from(id, 'dragon', {
      i9: 'dark king',
      i1: 'light king',
      e5: 'dragon dragon-tail',
    });
    return { ...g, position: { ...g.position, [at]: { ...placed('dragon moon'), ...extra } } };
  };
  const values = { moon: 1000 };

  it('scores a Coast piece nearer A5 higher, and one that has left the Coast higher still', () => {
    const a2 = evaluateFor(withMoon('a2'), 'dragon', values);
    const a3 = evaluateFor(withMoon('a3'), 'dragon', values);
    const a5 = evaluateFor(withMoon('a5'), 'dragon', values);
    const out = evaluateFor(withMoon('b4', { left: ['coast'] }), 'dragon', values);
    const back = evaluateFor(withMoon('a3', { left: ['coast'] }), 'dragon', values);
    expect(a3 - a2).toBe(COAST_STEP);
    expect(a5 - a2).toBe(3 * COAST_STEP);
    expect(out - a5).toBe(DEVELOPED);
    // Back on the Coast after leaving it once, it may leave from anywhere: no way to walk.
    expect(back).toBe(out);
  });

  it('does not change how the Kinged players score the position', () => {
    for (const seat of ['dark', 'light']) {
      expect(evaluateFor(withMoon('a3'), seat, values)).toBe(
        evaluateFor(withMoon('b4', { left: ['coast'] }), seat, values),
      );
    }
  });

  it('plays as before S68 when Coast pieces may leave with any legal move', () => {
    const any = (at: string, extra: Partial<PlacedPiece> = {}) => {
      const g = withMoon(at, extra);
      const rules = {
        ...g.rules,
        values: { ...g.rules.values, 'coast.3p.exit': 'any-legal-move' },
      };
      return { ...g, rules };
    };
    expect(evaluateFor(any('a2'), 'dragon', values)).toBe(evaluateFor(any('a5'), 'dragon', values));
    expect(evaluateFor(any('a2'), 'dragon', values)).toBe(
      evaluateFor(any('b4', { left: ['coast'] }), 'dragon', values),
    );
  });

  it('the computer Dragon walks a piece out through A5 within eight turns', () => {
    // At least five Dragon moves: the Tail off A5, then the Sun or Moon three steps and out.
    for (const player of ['greedy', 'search'] as const) {
      let g = newGame(rulesFor('standard-3p'), { id: 'standard-3p', version: '0' });
      // Dark and light move a Knight on the far side to and fro, away from the Coast.
      const shuffle: Record<string, string[]> = {
        dark: ['h9-g7', 'g7-h9'],
        light: ['h1-g3', 'g3-h1'],
      };
      let rnd = 7;
      const random = () => (rnd = (rnd * 48271) % 2147483647) / 2147483647;
      for (let round = 0; round < 8; round++) {
        for (const side of ['dark', 'light']) {
          const n = shuffle[side]![round % 2]!;
          g = playMove(
            g,
            g.legal.find((m) => `${m.from}-${m.to}` === n)!,
          );
        }
        const m =
          player === 'greedy'
            ? greedyMove(g, { random })!
            : bestMove(g, { depth: 1, nodes: 20_000, random }).move!;
        g = playMove(g, m);
      }
      const out = Object.values(g.position).filter(
        (p) => p.side === 'dragon' && p.piece !== 'dragon-tail' && p.left?.includes('coast'),
      );
      expect(out.length, player).toBeGreaterThanOrEqual(1);
    }
  });
});
