import { describe, expect, it } from 'vitest';
import boardFixture from '../../test/fixtures/boards/neutral.json';
import registryFixture from '../../test/fixtures/parameters.json';
import guard from '../../test/fixtures/pieces/guard.json';
import hopper from '../../test/fixtures/pieces/hopper.json';
import leaper from '../../test/fixtures/pieces/leaper.json';
import slider from '../../test/fixtures/pieces/slider.json';
import stepper from '../../test/fixtures/pieces/stepper.json';
import { validateBoard, validateBoardAndPieces, validatePiece, type Board } from './formats';
import { RulesError, type Registry } from './loader';

type Json = Record<string, unknown>;

const clone = <T>(v: T): T => structuredClone(v);
const pieces = () => clone([guard, hopper, leaper, slider, stepper]) as Json[];
const board = () => clone(boardFixture) as Json;
const registry = () => clone(registryFixture) as unknown as Registry;
const validBoard = (): Board => {
  const b = board();
  validateBoard(b);
  return b;
};

/** The issues a RulesError carries, or a failure if nothing was thrown. */
function issuesOf(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(RulesError);
    return (e as RulesError).issues;
  }
  throw new Error('expected a RulesError');
}

const pieceIssues = (piece: Json) => issuesOf(() => validatePiece(piece, validBoard(), registry()));

describe('neutral fixture', () => {
  it('board passes the schema and the cross-checks', () => {
    expect(() => validateBoard(board())).not.toThrow();
  });

  it.each([guard, hopper, leaper, slider, stepper].map((p) => [p.id, p]))('piece %s passes', (_id, piece) => {
    expect(() => validatePiece(clone(piece), validBoard(), registry())).not.toThrow();
  });

  it('board and pieces pass together and come back indexed by id', () => {
    const set = validateBoardAndPieces(board(), pieces(), registry());
    expect(set.board.id).toBe('neutral-fixture');
    expect(Object.keys(set.pieces).sort()).toEqual(['guard', 'hopper', 'leaper', 'slider', 'stepper']);
  });

  it('is not the Chess Nines board: no square type is named after a real one', () => {
    const ids = (boardFixture.squareTypes as { id: string }[]).map((t) => t.id);
    for (const real of ['coast', 'center', 'safe-zone', 'ting-yang']) expect(ids).not.toContain(real);
  });
});

describe('board format', () => {
  it('accepts square colors and seat views, and rejects malformed ones', () => {
    const b = board();
    (b.squares as Json[])[0]!.color = '#1083f6';
    (b.sides as Json[])[0]!.view = { rotate: 270 };
    expect(() => validateBoard(b)).not.toThrow();
    (b.squares as Json[])[0]!.color = 'blue';
    expect(() => validateBoard(b)).toThrow(RulesError);
    (b.squares as Json[])[0]!.color = '#1083f6';
    (b.sides as Json[])[0]!.view = { rotate: 45 };
    expect(() => validateBoard(b)).toThrow(RulesError);
  });

  it('rejects a coordinate off the 9x9 board', () => {
    const b = board();
    (b.squares as Json[])[0]!.at = 'j1';
    expect(issuesOf(() => validateBoard(b)).join()).toMatch(/pattern/);
  });

  it('rejects a rank 0 in a setup', () => {
    const b = board();
    ((b.setups as Json[])[0]!.pieces as Json).light = { e0: 'guard' };
    expect(() => validateBoard(b)).toThrow(RulesError);
  });

  it('rejects a square listed twice', () => {
    const b = board();
    (b.squares as Json[]).push({ at: 'c4', types: ['gateway'] });
    expect(issuesOf(() => validateBoard(b))).toContain('squares: c4 is listed twice');
  });

  it('rejects an undeclared square type', () => {
    const b = board();
    (b.squares as Json[]).push({ at: 'a5', types: ['moat'] });
    expect(issuesOf(() => validateBoard(b))).toContain('squares: a5 has undeclared type moat');
  });

  it('rejects a duplicate square type id', () => {
    const b = board();
    (b.squareTypes as Json[]).push({ id: 'void', label: 'Again' });
    expect(issuesOf(() => validateBoard(b))).toContain('squareTypes: void is declared twice');
  });

  it('rejects a square owned by an undeclared side', () => {
    const b = board();
    (b.squares as Json[]).push({ at: 'a5', types: ['home'], side: 'blue' });
    expect(issuesOf(() => validateBoard(b))).toContain('squares: a5 belongs to undeclared side blue');
  });

  it('rejects a duplicate side id and a side named neutral', () => {
    const b = board();
    (b.sides as Json[]).push({ id: 'light' });
    expect(issuesOf(() => validateBoard(b))).toContain('sides: light is declared twice');
    const c = board();
    (c.sides as Json[]).push({ id: 'neutral' });
    expect(() => validateBoard(c)).toThrow(RulesError);
  });

  it('rejects two setups for the same player count', () => {
    const b = board();
    (b.setups as Json[]).push(clone((b.setups as Json[])[0]!));
    expect(issuesOf(() => validateBoard(b))).toContain('setups: more than one setup for 2 players');
  });

  it('rejects a setup for an undeclared side', () => {
    const b = board();
    ((b.setups as Json[])[0]!.pieces as Json).blue = { a5: 'slider' };
    expect(issuesOf(() => validateBoard(b))).toContain('setup 2p: undeclared side blue');
  });

  it('rejects a square used by two sides in one setup', () => {
    const b = board();
    ((b.setups as Json[])[0]!.pieces as Record<string, Json>).dark!.e1 = 'slider';
    expect(issuesOf(() => validateBoard(b))).toContain('setup 2p: e1 is used by light and dark');
  });

  it('rejects unknown fields', () => {
    const b = board();
    b.colour = 'green';
    expect(() => validateBoard(b)).toThrow(RulesError);
  });
});

describe('piece format: moves', () => {
  it('rejects a move with two kinds', () => {
    const p = clone(slider) as Json;
    p.moves = [{ directions: ['orthogonal'], vectors: [[1, 2]] }];
    expect(pieceIssues(p).length).toBeGreaterThan(0);
  });

  it('rejects a move with no kind', () => {
    const p = clone(slider) as Json;
    p.moves = [{ range: 2 }];
    expect(pieceIssues(p).length).toBeGreaterThan(0);
  });

  it('rejects range 0, a zero vector, and an unknown direction', () => {
    for (const move of [
      { directions: ['orthogonal'], range: 0 },
      { vectors: [[0, 0]] },
      { directions: ['north'] },
    ]) {
      const p = clone(slider) as Json;
      p.moves = [move];
      expect(pieceIssues(p).length).toBeGreaterThan(0);
    }
  });

  it('rejects symmetry without vectors and range on a targets move', () => {
    for (const move of [
      { directions: ['orthogonal'], symmetry: 'all' },
      { targets: ['gateway'], range: 1 },
    ]) {
      const p = clone(slider) as Json;
      p.moves = [move];
      expect(pieceIssues(p).length).toBeGreaterThan(0);
    }
  });

  it('rejects targets of an undeclared square type', () => {
    const p = clone(hopper) as Json;
    (p.moves as Json[])[0]!.targets = ['harbour'];
    expect(pieceIssues(p)).toContain('hopper: moves[0].targets uses undeclared square type harbour');
  });

  it('rejects an empty moves list', () => {
    const p = clone(slider) as Json;
    p.moves = [];
    expect(pieceIssues(p).length).toBeGreaterThan(0);
  });
});

describe('piece format: parameters and conditions', () => {
  it('rejects a reference to an unknown parameter', () => {
    const p = clone(guard) as Json;
    (p.moves as Json[])[0]!.range = { param: 'guard.reach' };
    expect(pieceIssues(p)).toContain('guard: moves[0].range refers to unknown parameter guard.reach');
  });

  it('rejects a reference to a deprecated parameter', () => {
    const p = clone(guard) as Json;
    (p.moves as Json[])[0]!.jump = { param: 'fixture.retired' };
    expect(pieceIssues(p)).toContain('guard: moves[0].jump refers to deprecated parameter fixture.retired');
  });

  it('rejects a parameter of the wrong type', () => {
    const p = clone(guard) as Json;
    (p.moves as Json[])[0]!.range = { param: 'guard.canJump' };
    expect(pieceIssues(p)).toContain('guard: moves[0].range needs an integer parameter, guard.canJump is boolean');
    const q = clone(stepper) as Json;
    q.promotion = { to: { param: 'guard.range' } };
    expect(pieceIssues(q)).toContain('stepper: promotion.to needs an enumSet parameter, guard.range is integer');
  });

  it('rejects a condition value that is not an option', () => {
    const p = clone(slider) as Json;
    (p.squares as Json[])[1]!.when = { param: 'gate.occupants', is: 'nobody' };
    expect(pieceIssues(p)).toContain('slider: squares[1].when: "nobody" is not an option of gate.occupants');
    const q = clone(guard) as Json;
    (q.squares as Json[])[0]!.when = { param: 'gate.occupants', in: ['any', 'nobody'] };
    expect(pieceIssues(q)).toContain('guard: squares[0].when: "nobody" is not an option of gate.occupants');
  });

  it('rejects has on a parameter that is not an enumSet, and is on one that is', () => {
    const p = clone(guard) as Json;
    (p.squares as Json[])[0]!.when = { param: 'gate.occupants', has: 'any' };
    expect(pieceIssues(p)).toContain('guard: squares[0].when: has needs an enumSet parameter, gate.occupants is enum');
    const q = clone(guard) as Json;
    (q.squares as Json[])[1]!.when = { param: 'gate.passThrough', is: 'guard' };
    expect(pieceIssues(q)).toContain('guard: squares[1].when: is/in need a single-value parameter, gate.passThrough is enumSet');
  });

  it('checks conditions nested in not, all and any', () => {
    const p = clone(stepper) as Json;
    (p.moves as Json[])[1]!.when = { all: [{ firstMove: true }, { not: { any: [{ param: 'nope.nope', is: true }] } }] };
    expect(pieceIssues(p)).toContain('stepper: moves[1].when refers to unknown parameter nope.nope');
  });

  it('rejects a from condition on an undeclared square type', () => {
    const p = clone(stepper) as Json;
    (p.moves as Json[])[3]!.when = { from: 'harbour' };
    expect(pieceIssues(p)).toContain('stepper: moves[3].when uses undeclared square type harbour');
  });

  it('rejects a condition with an unknown shape', () => {
    const p = clone(stepper) as Json;
    (p.moves as Json[])[3]!.when = { side: 'light' };
    expect(pieceIssues(p).length).toBeGreaterThan(0);
  });
});

describe('piece format: square rules and promotion', () => {
  it('rejects a square rule for an undeclared type', () => {
    const p = clone(slider) as Json;
    (p.squares as Json[])[0]!.type = 'harbour';
    expect(pieceIssues(p)).toContain('slider: squares[0] uses undeclared square type harbour');
  });

  it('checks per-move square rules too', () => {
    const p = clone(hopper) as Json;
    ((p.moves as Json[])[1]!.squares as Json[])[0]!.type = 'harbour';
    expect(pieceIssues(p)).toContain('hopper: moves[1].squares[0] uses undeclared square type harbour');
  });

  it('rejects a square rule that says nothing', () => {
    const p = clone(slider) as Json;
    p.squares = [{ type: 'void' }];
    expect(pieceIssues(p).length).toBeGreaterThan(0);
  });

  it('rejects a promotion with an empty list (decision 2026-10-19)', () => {
    const p = clone(stepper) as Json;
    p.promotion = { to: [] };
    expect(() => validatePiece(p, validBoard(), registry())).toThrow(/fails its schema/);
  });

  it('accepts a fixed promotion list with a condition', () => {
    const p = clone(stepper) as Json;
    p.promotion = { to: ['slider'], when: { players: [2] } };
    expect(() => validatePiece(p, validBoard(), registry())).not.toThrow();
  });
});

describe('board and pieces together', () => {
  it('rejects a setup that places an unknown piece', () => {
    const b = board();
    ((b.setups as Json[])[0]!.pieces as Record<string, Json>).light!.b1 = 'wizard';
    expect(issuesOf(() => validateBoardAndPieces(b, pieces(), registry()))).toContain(
      'setup 2p: b1 places unknown piece wizard',
    );
  });

  it('rejects a duplicate piece id', () => {
    const list = [...pieces(), clone(slider) as Json];
    expect(issuesOf(() => validateBoardAndPieces(board(), list, registry()))).toContain('slider: piece id is used twice');
  });

  it('rejects a promotion to an unknown piece', () => {
    const list = pieces();
    list.find((p) => p.id === 'stepper')!.promotion = { to: ['wizard'] };
    expect(issuesOf(() => validateBoardAndPieces(board(), list, registry()))).toContain(
      'stepper: promotion.to names unknown piece wizard',
    );
  });

  it('rejects a forward-relative piece placed for a side with no forward direction', () => {
    const b = board();
    ((b.setups as Json[])[1]!.pieces as Record<string, Json>).third!.a5 = 'stepper';
    expect(issuesOf(() => validateBoardAndPieces(b, pieces(), registry()))).toContain(
      'setup 3p: a5 places stepper for third, which has no forward direction',
    );
    const c = board();
    ((c.setups as Json[])[0]!.pieces as Record<string, Json>).neutral!.a5 = 'stepper';
    expect(issuesOf(() => validateBoardAndPieces(c, pieces(), registry()))).toContain(
      'setup 2p: a5 places stepper for neutral, which has no forward direction',
    );
  });

  it('allows symmetric vectors for a side with no forward direction', () => {
    const b = board();
    ((b.setups as Json[])[1]!.pieces as Record<string, Json>).third!.a5 = 'leaper';
    expect(() => validateBoardAndPieces(b, pieces(), registry())).not.toThrow();
  });

  it('ignores moves and promotions that apply only to other player counts', () => {
    const list = pieces();
    const stepperPiece = list.find((p) => p.id === 'stepper')!;
    for (const m of stepperPiece.moves as Json[]) m.when = { all: [{ players: [2] }, ...(m.when ? [m.when] : [])] };
    stepperPiece.promotion = { ...(stepperPiece.promotion as Json), when: { players: [2] } };
    const b = board();
    ((b.setups as Json[])[1]!.pieces as Record<string, Json>).third!.a5 = 'stepper';
    expect(() => validateBoardAndPieces(b, list, registry())).not.toThrow();
    stepperPiece.promotion = { ...(stepperPiece.promotion as Json), when: { any: [{ players: [2] }, { players: [3] }] } };
    expect(issuesOf(() => validateBoardAndPieces(b, list, registry()))).toContain(
      'setup 3p: a5 places stepper for third, which has no forward direction',
    );
  });

  it('validates the registry it is given', () => {
    const r = registry() as unknown as Json;
    delete ((r.parameters as Json[])[0] as Json).default;
    expect(() => validateBoardAndPieces(board(), pieces(), r)).toThrow(RulesError);
  });
});
