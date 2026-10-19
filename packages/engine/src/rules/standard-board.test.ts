// The real Chess Nines board and pieces (S10, unverified seeds): they pass the
// format checks, both draft rulesets play from the start positions, and a few
// hand-checked positions match docs/RULES.md.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  generateMoves,
  movesFrom,
  startPosition,
  toNotation,
  type MoveRules,
  type Position,
} from '../moves/generate';
import { validateBoardAndPieces, type Piece } from './formats';
import { resolveRuleset, type Registry } from './loader';

const root = new URL('../../../../', import.meta.url).pathname;
const read = (path: string): unknown => JSON.parse(readFileSync(root + path, 'utf8'));
const registry = () => read('rules/parameters.json') as Registry;
const pieceFiles = readdirSync(root + 'rules/pieces').filter((f) => f.endsWith('.json'));
const set = validateBoardAndPieces(
  read('rules/boards/standard-9x9.json'),
  pieceFiles.map((f) => read(`rules/pieces/${f}`)),
  registry(),
);
const board = set.board;

function rulesFor(players: 2 | 3, overrides: Record<string, unknown> = {}): MoveRules {
  const base = read(`rules/rulesets/draft-${players}p.json`) as Record<string, unknown>;
  const { values } = resolveRuleset(registry(), { ...base, overrides });
  return { ...set, values, players };
}

const sidesFor = (players: 2 | 3) => (players === 2 ? ['dark', 'light', 'neutral'] : ['dark', 'light', 'dragon']);
const lone = (at: string, piece: string, side: string): Position => ({ [at]: { piece, side, moved: true } });
const from = (rules: MoveRules, position: Position, at: string) => movesFrom(rules, position, at).map(toNotation);

describe('standard board data', () => {
  it('has the 11 pieces of rule set v0.2', () => {
    expect(Object.keys(set.pieces).sort()).toEqual([
      'bishop',
      'dark-dragon-head',
      'dragon-tail',
      'king',
      'knight',
      'light-dragon-head',
      'moon',
      'pawn',
      'queen',
      'rook',
      'sun',
    ]);
  });

  it('places the special squares from the owner board (S34 coordinates)', () => {
    const at = (type: string) =>
      board.squares
        .filter((s) => s.types.includes(type))
        .map((s) => s.at)
        .sort();
    expect(at('coast')).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']);
    expect(at('void')).toEqual(['b5', 'c5', 'd5', 'f5', 'g5', 'h5']);
    expect(at('center')).toEqual(['e5']);
    expect(at('ting-yang')).toEqual(['i5']);
    expect(at('tail-square')).toEqual(['a5', 'e5', 'i5']);
    expect(at('safe-zone')).toEqual(['b2', 'b8', 'c3', 'c7', 'd4', 'd6', 'f4', 'f6', 'g3', 'g7', 'h2', 'h8']);
  });

  it('gives every colored square a side by its half of the board', () => {
    for (const s of board.squares.filter((x) => x.types.includes('safe-zone'))) {
      expect(s.side).toBe(Number(s.at[1]) < 5 ? 'light' : 'dark');
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('starts 2-player games as a mirror image across rank 5', () => {
    const start = startPosition(board, 2);
    const mirror = (at: string) => `${at[0]}${10 - Number(at[1])}`;
    for (const [at, p] of Object.entries(start)) {
      if (p.side === 'neutral') continue;
      const other = start[mirror(at)]!;
      expect(other.side).toBe(p.side === 'light' ? 'dark' : 'light');
      const coast = ['sun', 'moon', 'light-dragon-head', 'dark-dragon-head'];
      if (!coast.includes(p.piece)) expect(other.piece).toBe(p.piece);
    }
    expect(start.f1).toEqual({ piece: 'king', side: 'light', home: 'f1' });
    expect(start.e9).toEqual({ piece: 'queen', side: 'dark', home: 'e9' });
    expect(start.a5).toEqual({ piece: 'dragon-tail', side: 'neutral', home: 'a5' });
  });

  it('switches the Sun and Moon and gives the Coast to the Dragon in 3-player games', () => {
    const start = startPosition(board, 3);
    expect(start.a8).toEqual({ piece: 'sun', side: 'dragon', home: 'a8' });
    expect(start.a2).toEqual({ piece: 'moon', side: 'dragon', home: 'a2' });
    for (const r of [1, 5, 9]) expect(start[`a${r}`]!.side).toBe('dragon');
  });
});

describe.each([2, 3] as const)('start position, %i players', (players) => {
  it.each(sidesFor(players))('%s has moves under the draft ruleset', (side) => {
    const rules = rulesFor(players);
    expect(generateMoves(rules, startPosition(board, players), side).length).toBeGreaterThan(0);
  });
});

describe('hand-checked moves (docs/RULES.md)', () => {
  const rules = rulesFor(2);

  it('the Tail jumps from a5 to e5 or i5 and never captures', () => {
    expect(from(rules, startPosition(board, 2), 'a5')).toEqual(['a5-e5', 'a5-i5']);
  });

  it('the Queen stops on a5, passes over an empty e5, and avoids the void', () => {
    expect(from(rules, lone('a1', 'queen', 'light'), 'a1')).toContain('a1-a5');
    expect(from(rules, lone('a1', 'queen', 'light'), 'a1')).toContain('a1-i9');
    expect(from(rules, lone('a1', 'queen', 'light'), 'a1')).not.toContain('a1-e5');
    expect(from(rules, lone('e4', 'queen', 'light'), 'e4').filter((m) => /[a-i]5$/.test(m))).toEqual([]);
    expect(from(rules, lone('e4', 'queen', 'light'), 'e4')).toContain('e4-e9');
  });

  it('Rooks and Bishops stop before e5 and never enter the Coast', () => {
    expect(from(rules, lone('c3', 'bishop', 'light'), 'c3')).toEqual(['c3-b2', 'c3-b4', 'c3-d2', 'c3-d4', 'c3-e1']);
    expect(from(rules, lone('d5', 'rook', 'light'), 'd5')).not.toContain('d5-f5');
    expect(from(rules, lone('d5', 'rook', 'light'), 'd5')).not.toContain('d5-a5');
  });

  it('a pawn on e4 is blocked by the center', () => {
    expect(from(rules, lone('e4', 'pawn', 'light'), 'e4')).toEqual([]);
  });

  it('a Dragon Head may stand on e5', () => {
    expect(from(rules, lone('d4', 'light-dragon-head', 'light'), 'd4')).toContain('d4-e5');
  });
});

/** Every parameter the pieces read, at every option, still generates moves without error. */
function paramsIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => paramsIn(v, found));
  else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.param === 'string') found.add(o.param);
    Object.values(o).forEach((v) => paramsIn(v, found));
  }
  return found;
}

describe('every referenced parameter at every option', () => {
  const ids = [...paramsIn(Object.values(set.pieces) as Piece[])].sort();
  const cases = registry()
    .parameters.filter((p) => ids.includes(p.id))
    .flatMap((p) =>
      p.players.flatMap((players) =>
        (p.type === 'enumSet' ? [p.default, ...p.options.map((o) => [o])] : p.options).map(
          (option) => [p.id, players as 2 | 3, option] as const,
        ),
      ),
    );

  it.each(cases)('%s (%i players) = %j', (id, players, option) => {
    const rules = rulesFor(players, { [id]: option });
    const probes: Position = {
      ...startPosition(board, players),
      e4: { piece: 'queen', side: 'light', moved: true },
      d4: { piece: players === 2 ? 'sun' : 'moon', side: players === 2 ? 'light' : 'dragon', moved: true },
    };
    for (const side of sidesFor(players)) expect(() => generateMoves(rules, probes, side)).not.toThrow();
  });
});
