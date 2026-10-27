// S58: the greedy 3-player player (decision D59): a winning move first, then a King capture, then
// the biggest free capture; the same seed gives the same moves; bots finish games in every preset.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newGame, playMove, type GameState } from '../game/game';
import { toNotation, type MoveRules, type PlacedPiece, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import { greedyMove } from './greedy';

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

function rulesFor(id: string, overrides: Record<string, unknown> = {}): MoveRules {
  const base = read(`rules/rulesets/${id}.json`) as Ruleset;
  const ruleset = { ...base, overrides: { ...base.overrides, ...overrides } };
  return { ...set, values: resolveRuleset(registry, ruleset).values, players: 3 };
}

const placed = (text: string): PlacedPiece => {
  const [side, piece] = text.split(' ');
  return { piece: piece!, side: side!, moved: true };
};

function from(
  id: string,
  turn: string,
  pieces: Record<string, string>,
  overrides: Record<string, unknown> = {},
): GameState {
  const position: Position = Object.fromEntries(
    Object.entries(pieces).map(([at, text]) => [at, placed(text)]),
  );
  return newGame(rulesFor(id, overrides), { id, version: '0' }, { position, turn });
}

const pick = (g: GameState) => {
  const move = greedyMove(g);
  return move && toNotation(move);
};

/** The game after the move the greedy player picks. */
const after = (g: GameState): GameState => playMove(g, greedyMove(g)!);

describe('a winning move first', () => {
  it('dark checkmates the light King, though a capture is on offer', () => {
    const g = after(
      from('standard-3p', 'dark', {
        c3: 'dark rook',
        e9: 'dark king',
        i1: 'light king',
        h2: 'light pawn',
        i2: 'light pawn',
        d3: 'light pawn',
        a5: 'dragon dragon-tail',
      }),
    );
    expect(g.result).toEqual({
      status: 'win',
      winner: 'dark',
      loser: 'light',
      reason: 'checkmate',
    });
  });

  it('light checkmates the dark King, though a capture is on offer', () => {
    const g = after(
      from('standard-3p', 'light', {
        c7: 'light rook',
        e1: 'light king',
        i9: 'dark king',
        h8: 'dark pawn',
        i8: 'dark pawn',
        d7: 'dark pawn',
        a5: 'dragon dragon-tail',
      }),
    );
    expect(g.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dark',
      reason: 'checkmate',
    });
  });

  it('the Dragon checkmates a King in Easy Start, where that wins', () => {
    const g = after(
      from('easy-3p', 'dragon', {
        i1: 'light king',
        h2: 'light pawn',
        i2: 'light pawn',
        c3: 'dragon dark-dragon-head',
        e9: 'dark king',
        a5: 'dragon dragon-tail',
      }),
    );
    expect(g.result).toEqual({
      status: 'win',
      winner: 'dragon',
      loser: 'light',
      reason: 'checkmate',
    });
  });

  it('a Kinged player checkmates the Tail in Easy Start', () => {
    const g = after(
      from('easy-3p', 'light', {
        c3: 'light rook',
        d1: 'light king',
        b9: 'dark king',
        e5: 'dragon dragon-tail',
        a5: 'dragon sun',
        i5: 'dragon light-dragon-head',
      }),
    );
    expect(g.result).toEqual({
      status: 'win',
      winner: 'light',
      loser: 'dragon',
      reason: 'checkmate',
    });
  });
});

describe('a King capture next', () => {
  it('the Dragon takes a King it may capture rather than a queen', () => {
    const g = from('standard-3p', 'dragon', {
      f2: 'light king',
      f9: 'dark king',
      h4: 'dragon light-dragon-head',
      e7: 'dark queen',
      a5: 'dragon dragon-tail',
    });
    expect(g.legal.map(toNotation)).toEqual(expect.arrayContaining(['h4xf2', 'h4xe7']));
    expect(pick(g)).toBe('h4xf2');
  });

  it('the Dragon checkmating a King (Dragon check on) counts as taking it', () => {
    const g = after(
      from(
        'standard-3p',
        'dragon',
        {
          i1: 'light king',
          h2: 'light pawn',
          i2: 'light pawn',
          c3: 'dragon dark-dragon-head',
          f9: 'dark king',
          d4: 'dark queen',
          a5: 'dragon dragon-tail',
        },
        { 'dragon.3p.givesCheck': true },
      ),
    );
    expect(g.moves.at(-1)?.events).toEqual([
      { kind: 'king-captured', side: 'light', how: 'checkmate' },
    ]);
  });
});

describe('the biggest free capture', () => {
  it('takes the undefended queen rather than the pawn', () => {
    const g = from('standard-3p', 'light', {
      f1: 'light king',
      f9: 'dark king',
      c4: 'light rook',
      c8: 'dark queen',
      g4: 'dark pawn',
      a5: 'dragon dragon-tail',
    });
    expect(g.legal.map(toNotation)).toEqual(expect.arrayContaining(['c4xc8', 'c4xg4']));
    expect(pick(g)).toBe('c4xc8');
  });

  it('does not take a guarded pawn with the rook when a free pawn is on offer', () => {
    const g = from('standard-3p', 'light', {
      f1: 'light king',
      f9: 'dark king',
      c4: 'light rook',
      g4: 'dark pawn',
      c7: 'dark pawn',
      b8: 'dark pawn',
      a5: 'dragon dragon-tail',
    });
    expect(g.legal.map(toNotation)).toEqual(expect.arrayContaining(['c4xc7', 'c4xg4']));
    expect(pick(g)).toBe('c4xg4');
  });
});

describe('the same seed gives the same moves', () => {
  const seeded = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const play = (seed: number, plies: number) => {
    const random = seeded(seed);
    let g = newGame(rulesFor('standard-3p'), { id: 'standard-3p', version: '0' });
    while (g.result.status === 'ongoing' && g.moves.length < plies) {
      g = playMove(g, greedyMove(g, { random })!);
    }
    return g.moves.map((m) => m.notation);
  };

  it('twice over', () => {
    expect(play(7, 30)).toEqual(play(7, 30));
  });

  it('and another seed may play differently', () => {
    expect(play(7, 30)).not.toEqual(play(8, 30));
  });
});

describe('bots finish games from the start', () => {
  it.each(['standard-3p', 'draft-3p', 'easy-3p'])(
    '%s',
    (id) => {
      const random = (() => {
        let n = 0;
        return () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648;
      })();
      let g = newGame(rulesFor(id), { id, version: '0' });
      let plies = 0;
      while (g.result.status === 'ongoing' && plies++ < 1500) {
        const move = greedyMove(g, { random });
        expect(move, `${id} ply ${plies}`).toBeDefined();
        g = playMove(g, move!);
      }
      expect(g.result.status).not.toBe('ongoing');
    },
    120_000,
  );
});

it('refuses a 2-player game', () => {
  const rules = { ...rulesFor('standard-3p'), players: 2 as const };
  expect(() =>
    greedyMove({ rules, result: { status: 'ongoing' }, legal: [{}] } as never),
  ).toThrow();
});
