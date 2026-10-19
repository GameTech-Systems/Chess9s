// Attack maps, check, legal moves, checkmate and stalemate (S16) on the real
// board, driven by data. Every position in
// test/fixtures/positions/check-mate.json runs at each king.range option, and
// the check flags (king.canJump, coastPieces.2p.giveCheck, tail.canCheck,
// tail.2p.canCapture) and draw.stalemate are set to every option. Expected
// results were worked out from docs/RULES.md by plain geometry, not from the
// engine. The Coast is treated as open: opening it is game state (S17).
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixtures from '../../test/fixtures/positions/check-mate.json';
import { NEUTRAL, validateBoardAndPieces } from '../rules/formats';
import { RulesError, resolveRuleset, type Registry } from '../rules/loader';
import { applyMove, attackMap, checkers, gameStatus, inCheck, legalMoves } from './check';
import {
  attacksFrom,
  generateMoves,
  startPosition,
  toNotation,
  type MoveRules,
  type Position,
} from './generate';

interface Case {
  name: string;
  overrides: Record<string, unknown>;
  side: string;
  alsoMove?: string[];
  pieces: Position;
  checkers: string[];
  legal: string[];
  status: 'ongoing' | 'checkmate' | 'stalemate';
  stalemate?: string;
}

interface AttackCase {
  name: string;
  overrides: Record<string, unknown>;
  side: string;
  pieces: Position;
  expected: string[];
}

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = () => read('rules/parameters.json') as Registry;
const pieceFiles = readdirSync(root + 'rules/pieces').filter((f) => f.endsWith('.json'));
const set = validateBoardAndPieces(
  read('rules/boards/standard-9x9.json'),
  pieceFiles.map((f) => read(`rules/pieces/${f}`)),
  registry(),
);

function rulesFor(players: 2 | 3, overrides: Record<string, unknown> = {}): MoveRules {
  const base = read(`rules/rulesets/draft-${players}p.json`) as Record<string, unknown>;
  const { values } = resolveRuleset(registry(), { ...base, overrides });
  return { ...set, values, players };
}

const cases = fixtures.cases as Case[];
const attackCases = fixtures.attackMaps as AttackCase[];

describe('fixture positions: check, checkmate, stalemate', () => {
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const rules = rulesFor(2, c.overrides);
    const status = gameStatus(rules, c.pieces, c.side, { alsoMove: c.alsoMove ?? [] });
    expect(status.checkers).toEqual(c.checkers);
    expect(status.inCheck).toBe(c.checkers.length > 0);
    expect(inCheck(rules, c.pieces, c.side)).toBe(c.checkers.length > 0);
    expect(status.legal.map(toNotation)).toEqual([...c.legal].sort());
    expect(status.result).toBe(c.status);
    expect(status.stalemate).toBe(c.stalemate);
  });
});

describe('fixture positions: attack maps', () => {
  it.each(attackCases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(attackMap(rulesFor(2, c.overrides), c.pieces, c.side)).toEqual(c.expected);
  });
});

describe('fixture coverage', () => {
  // Parameters whose options change what counts as check or how a game ends.
  const swept = [
    'king.range',
    'king.canJump',
    'coastPieces.2p.giveCheck',
    'tail.canCheck',
    'tail.2p.canCapture',
    'draw.stalemate',
  ];
  const options = (id: string) => registry().parameters.find((p) => p.id === id)!.options;

  it('every position runs at every king.range option', () => {
    const byPosition = new Map<string, Set<unknown>>();
    for (const c of cases) {
      const position = JSON.stringify([
        c.side,
        c.pieces,
        c.alsoMove,
        { ...c.overrides, 'king.range': 0 },
      ]);
      if (!byPosition.has(position)) byPosition.set(position, new Set());
      byPosition.get(position)!.add(c.overrides['king.range']);
    }
    for (const ranges of byPosition.values())
      expect([...ranges].sort()).toEqual(options('king.range'));
  });

  it.each(swept)('%s is set to every option somewhere', (id) => {
    const used = new Set(
      [...cases, ...attackCases].map((c) =>
        Object.hasOwn(c.overrides, id)
          ? c.overrides[id]
          : registry().parameters.find((p) => p.id === id)!.default,
      ),
    );
    for (const o of options(id)) expect(used.has(o), `${id}=${JSON.stringify(o)}`).toBe(true);
  });

  it('the fixtures hold checkmate, stalemate and escapes, at each draw.stalemate ruling', () => {
    expect(new Set(cases.map((c) => c.status))).toEqual(
      new Set(['ongoing', 'checkmate', 'stalemate']),
    );
    expect(new Set(cases.flatMap((c) => c.stalemate ?? []))).toEqual(
      new Set(options('draw.stalemate')),
    );
  });

  it('every check flag in the piece data reads a parameter swept here', () => {
    const flags = Object.values(set.pieces).flatMap((p) =>
      typeof p.givesCheck === 'object' ? [p.givesCheck.param] : [],
    );
    for (const id of flags) {
      const p = registry().parameters.find((x) => x.id === id)!;
      // The 3-player flag is not yet expressible (see the Dragon Head notes).
      if (p.players.includes(2)) expect(swept, id).toContain(id);
    }
  });
});

describe('attack maps', () => {
  const rules = rulesFor(2);

  it('include squares of the side’s own pieces (defended) and stop at the first piece in a line', () => {
    const pieces: Position = {
      b1: { piece: 'rook', side: 'light', moved: true },
      b3: { piece: 'pawn', side: 'light', moved: true },
    };
    expect(attacksFrom(rules, pieces, 'b1')).toEqual([
      'b2',
      'b3',
      'c1',
      'd1',
      'e1',
      'f1',
      'g1',
      'h1',
      'i1',
    ]);
  });

  it('leave out move-only steps: a pawn attacks its forward diagonals, not the square ahead', () => {
    const pieces: Position = { d3: { piece: 'pawn', side: 'light', moved: true } };
    expect(attacksFrom(rules, pieces, 'd3')).toEqual(['c4', 'e4']);
  });

  it('do not need the lost pieces even when a promotion would', () => {
    const r = rulesFor(2, { 'pawn.promotion.targets': ['captured-piece'] });
    const pieces: Position = {
      d8: { piece: 'pawn', side: 'light', moved: true },
      e9: { piece: 'king', side: 'dark', moved: true },
      a1: { piece: 'king', side: 'light', moved: true },
    };
    expect(attacksFrom(r, pieces, 'd8')).toEqual(['c9', 'e9']);
    expect(checkers(r, pieces, 'dark')).toEqual(['d8']);
    expect(() => legalMoves(r, pieces, 'light')).toThrow(RulesError);
    const promotions = legalMoves(r, pieces, 'light', { lost: { light: ['rook'] } })
      .map(toNotation)
      .filter((m) => m.includes('='));
    expect(promotions).toEqual(['d8-d9=rook', 'd8xe9=rook']);
  });

  it('are empty for an empty square and for a side with no pieces', () => {
    expect(attacksFrom(rules, {}, 'e1')).toEqual([]);
    expect(attackMap(rules, {}, 'light')).toEqual([]);
  });
});

describe('check', () => {
  it('comes from any other side, the neutral Tail included', () => {
    const rules = rulesFor(2, { 'tail.canCheck': true, 'tail.2p.canCapture': true });
    const pieces: Position = {
      i5: { piece: 'king', side: 'light', moved: true },
      a5: { piece: 'dragon-tail', side: NEUTRAL },
      e1: { piece: 'king', side: 'dark', moved: true },
    };
    expect(checkers(rules, pieces, 'light')).toEqual(['a5']);
    expect(checkers(rules, pieces, 'dark')).toEqual([]);
  });

  it('is never given by a side to itself, and a side without a royal piece is never in check', () => {
    const rules = rulesFor(2);
    const pieces: Position = {
      e1: { piece: 'king', side: 'light', moved: true },
      e2: { piece: 'rook', side: 'light', moved: true },
      e4: { piece: 'rook', side: 'dark', moved: true },
    };
    expect(inCheck(rules, pieces, 'light')).toBe(false);
    expect(inCheck(rules, pieces, 'dark')).toBe(false);
  });

  it('counts every royal piece: a side is in check when any of them is attacked', () => {
    const rules = rulesFor(2);
    const pieces: Position = {
      b1: { piece: 'king', side: 'light', moved: true },
      h1: { piece: 'king', side: 'light', moved: true },
      h4: { piece: 'rook', side: 'dark', moved: true },
    };
    expect(checkers(rules, pieces, 'light')).toEqual(['h4']);
  });

  it('is refused, not guessed, for a 3-player Coast piece whose flag names a 2-player parameter', () => {
    const rules = rulesFor(3);
    const pieces: Position = {
      f1: { piece: 'king', side: 'light', moved: true },
      f3: { piece: 'light-dragon-head', side: 'dragon', moved: true },
    };
    expect(() => checkers(rules, pieces, 'light')).toThrow(/coastPieces\.2p\.giveCheck/);
  });
});

describe('applyMove', () => {
  const start: Position = {
    d8: { piece: 'pawn', side: 'light', moved: true },
    e9: { piece: 'rook', side: 'dark', moved: false },
    e1: { piece: 'king', side: 'light' },
  };

  it('moves, captures and promotes without touching the original position', () => {
    const before = structuredClone(start);
    const next = applyMove(start, {
      from: 'd8',
      to: 'e9',
      piece: 'pawn',
      capture: 'rook',
      promotion: 'queen',
    });
    expect(next).toEqual({
      e9: { piece: 'queen', side: 'light', moved: true },
      e1: { piece: 'king', side: 'light' },
    });
    expect(start).toEqual(before);
    expect(applyMove(start, { from: 'e1', to: 'e2', piece: 'king' }).e2).toEqual({
      piece: 'king',
      side: 'light',
      moved: true,
    });
  });

  it('refuses a move from an empty square or of the wrong piece', () => {
    expect(() => applyMove(start, { from: 'a1', to: 'a2', piece: 'king' })).toThrow(RulesError);
    expect(() => applyMove(start, { from: 'e1', to: 'e2', piece: 'queen' })).toThrow(RulesError);
  });
});

describe('legal moves', () => {
  it('from the start position equal the pseudo-legal ones for both sides, at every king.range', () => {
    for (const range of [1, 2, 3, 4]) {
      const rules = rulesFor(2, { 'king.range': range });
      const start = startPosition(set.board, 2);
      for (const side of ['light', 'dark']) {
        expect(legalMoves(rules, start, side), `${side} ${range}`).toEqual(
          generateMoves(rules, start, side),
        );
        expect(gameStatus(rules, start, side).result).toBe('ongoing');
      }
    }
  });

  it('include another side’s pieces only when alsoMove names that side', () => {
    const rules = rulesFor(2);
    const start = startPosition(set.board, 2);
    const own = legalMoves(rules, start, 'light').map(toNotation);
    const withTail = legalMoves(rules, start, 'light', { alsoMove: [NEUTRAL] }).map(toNotation);
    expect(own).not.toContain('a5-e5');
    expect(withTail).toEqual([...own, 'a5-e5', 'a5-i5'].sort());
  });

  it('never move the side’s own pieces twice when alsoMove repeats the side', () => {
    const rules = rulesFor(2);
    const start = startPosition(set.board, 2);
    expect(legalMoves(rules, start, 'light', { alsoMove: ['light'] })).toEqual(
      legalMoves(rules, start, 'light'),
    );
  });
});

describe('stalemate ruling', () => {
  const boxed: Position = {
    i9: { piece: 'king', side: 'dark', moved: true },
    h7: { piece: 'rook', side: 'light', moved: true },
    b8: { piece: 'rook', side: 'light', moved: true },
    b1: { piece: 'king', side: 'light', moved: true },
  };

  it.each(['draw', 'loss-for-stalemated', 'win-for-stalemated'])(
    'reads draw.stalemate = %s',
    (option) => {
      const status = gameStatus(
        rulesFor(2, { 'king.range': 1, 'draw.stalemate': option }),
        boxed,
        'dark',
      );
      expect(status.result).toBe('stalemate');
      expect(status.stalemate).toBe(option);
    },
  );

  it('is not read while the game goes on or ends in checkmate', () => {
    const rules = rulesFor(2, { 'king.range': 2 });
    expect(gameStatus(rules, boxed, 'dark').stalemate).toBeUndefined();
  });
});
