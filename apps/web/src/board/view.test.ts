import { describe, expect, it } from 'vitest';
import board from '../../../../rules/boards/standard-9x9.json';
import { validateBoard, type Board } from '@chess9s/engine';
import {
  PHI,
  edgeLabels,
  parseSquare,
  pawnColor,
  squareFill,
  tetrahedron,
  toScreen,
  viewRotation,
  type Rotation,
} from './view';

const rotations: Rotation[] = [0, 90, 180, 270];
const files = 'abcdefghi';

describe('toScreen', () => {
  it('draws the standard diagram for rotate 0: a9 top left, i1 bottom right', () => {
    expect(toScreen('a9', 0)).toEqual({ col: 0, row: 0 });
    expect(toScreen('i1', 0)).toEqual({ col: 8, row: 8 });
    expect(toScreen('a1', 0)).toEqual({ col: 0, row: 8 });
  });

  it('turns 180 for dark: rank 9 at the bottom, Coast on the right', () => {
    expect(toScreen('a9', 180)).toEqual({ col: 8, row: 8 });
    expect(toScreen('a1', 180)).toEqual({ col: 8, row: 0 });
    expect(toScreen('i9', 180)).toEqual({ col: 0, row: 8 });
  });

  it('turns 270 for the Dragon seat: Coast at the bottom, rank 9 on the left', () => {
    for (let r = 1; r <= 9; r++) expect(toScreen(`a${r}`, 270).row).toBe(8);
    for (const f of files) expect(toScreen(`${f}9`, 270).col).toBe(0);
    expect(toScreen('a9', 270)).toEqual({ col: 0, row: 8 });
  });

  it('turns 90 clockwise: Coast at the top, rank 1 on the left', () => {
    for (let r = 1; r <= 9; r++) expect(toScreen(`a${r}`, 90).row).toBe(0);
    for (const f of files) expect(toScreen(`${f}1`, 90).col).toBe(0);
  });

  it.each(rotations)('maps all 81 squares to 81 distinct cells at rotate %i', (rotate) => {
    const cells = new Set<string>();
    for (const f of files)
      for (let r = 1; r <= 9; r++) {
        const { col, row } = toScreen(`${f}${r}`, rotate);
        expect(col).toBeGreaterThanOrEqual(0);
        expect(col).toBeLessThanOrEqual(8);
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThanOrEqual(8);
        cells.add(`${col},${row}`);
      }
    expect(cells.size).toBe(81);
  });

  it('rejects squares off the board', () => {
    expect(() => parseSquare('j1')).toThrow();
    expect(() => parseSquare('a10')).toThrow();
    expect(() => parseSquare('a0')).toThrow();
  });
});

describe('edgeLabels', () => {
  it('rotate 0: files along the bottom, ranks up the left', () => {
    const l = edgeLabels(0);
    expect(l.bottom).toEqual('abcdefghi'.split(''));
    expect(l.left).toEqual('987654321'.split(''));
  });

  it('rotate 180: files reversed along the bottom, ranks 1 to 9 down the left', () => {
    const l = edgeLabels(180);
    expect(l.bottom).toEqual('ihgfedcba'.split(''));
    expect(l.left).toEqual('123456789'.split(''));
  });

  it('rotate 270: ranks along the bottom (9 on the left), files up the left edge with a at the bottom', () => {
    const l = edgeLabels(270);
    expect(l.bottom).toEqual('987654321'.split(''));
    expect(l.left).toEqual('ihgfedcba'.split(''));
  });

  it.each(rotations)('labels agree with toScreen at rotate %i', (rotate) => {
    const l = edgeLabels(rotate);
    for (const f of files)
      for (let r = 1; r <= 9; r++) {
        const { col, row } = toScreen(`${f}${r}`, rotate);
        if (row === 8) expect([f, String(r)]).toContain(l.bottom[col]);
        if (col === 0) expect([f, String(r)]).toContain(l.left[row]);
      }
  });
});

describe('squareFill', () => {
  it('colors unlisted squares like a chessboard with b1 black, kings on black, queens on white', () => {
    expect(squareFill({ at: 'b1', types: [] })).toBe('#000000');
    expect(squareFill({ at: 'c1', types: [] })).toBe('#ffffff');
    expect(squareFill({ at: 'f1', types: [] })).toBe('#000000');
    expect(squareFill({ at: 'e1', types: [] })).toBe('#ffffff');
    expect(squareFill({ at: 'f9', types: [] })).toBe('#000000');
    expect(squareFill({ at: 'e9', types: [] })).toBe('#ffffff');
  });

  it("uses a square's own color when the board data gives one", () => {
    expect(squareFill({ at: 'a3', types: ['coast'], color: '#1083f6' })).toBe('#1083f6');
  });
});

describe('seat views in the real board data', () => {
  it('validates, and each seat has the owner-decided view (D34: dark turned 180)', () => {
    validateBoard(board);
    const b = board as unknown as Board;
    const rotate = (id: string) => viewRotation(b.sides.find((s) => s.id === id));
    expect(rotate('light')).toBe(0);
    expect(rotate('dark')).toBe(180);
    expect(rotate('dragon')).toBe(270);
  });

  it('falls back to 0 when a seat has no view', () => {
    expect(viewRotation(undefined)).toBe(0);
    expect(viewRotation({ id: 'x' })).toBe(0);
  });
});

describe('tetrahedron on the Center square (D36)', () => {
  const t = tetrahedron(1);

  it('has a base side parallel to the Coast column (vertical in the standard diagram)', () => {
    const [a, b] = t.base;
    expect(a.x).toBeCloseTo(b.x, 10);
    expect(a.y).not.toBeCloseTo(b.y, 3);
  });

  it('is an equilateral base (three cube corners), opposite vertex pointing toward Ting Yang (+x)', () => {
    const [a, b, c] = t.base;
    const d = (p: typeof a, q: typeof a) => Math.hypot(p.x - q.x, p.y - q.y);
    expect(d(a, b)).toBeCloseTo(d(b, c), 10);
    expect(d(b, c)).toBeCloseTo(d(c, a), 10);
    expect(c.x).toBeGreaterThan(a.x);
    expect(c.y).toBeCloseTo(0, 10);
  });

  it('centres the apex on the base and on the square', () => {
    const [a, b, c] = t.base;
    expect(t.apex.x).toBeCloseTo((a.x + b.x + c.x) / 3, 10);
    expect(t.apex.y).toBeCloseTo((a.y + b.y + c.y) / 3, 10);
    expect(t.apex.x).toBeCloseTo(0, 10);
    expect(t.apex.y).toBeCloseTo(0, 10);
  });

  it('sizes the base side as phi over two of the square (provisional)', () => {
    const [a, b] = t.base;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(PHI / 2, 10);
    expect(PHI).toBeCloseTo((1 + Math.sqrt(5)) / 2, 12);
  });

  it('scales with the square size', () => {
    const [a, b] = tetrahedron(40).base;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(40 * (PHI / 2), 8);
  });

  it('fits inside one square', () => {
    for (const p of [...t.base, t.apex]) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('pawnColor', () => {
  validateBoard(board);
  const data = board as unknown as Board;

  it("is the color of the side's own colored square in the pawn's starting file", () => {
    expect(pawnColor(data, 'light', 'b2')).toEqual({ name: 'Red', color: '#ff000e' });
    expect(pawnColor(data, 'dark', 'b8')).toEqual({ name: 'Pink', color: '#f440ad' });
    expect(pawnColor(data, 'light', 'h2')).toEqual({ name: 'Violet', color: '#760c7b' });
    expect(pawnColor(data, 'dark', 'c8')).toEqual({ name: 'Burnt orange', color: '#db7209' });
  });

  it("is green for the E-file pawns, the Center square's color", () => {
    const e5 = data.squares.find((s) => s.at === 'e5')!;
    expect(pawnColor(data, 'light', 'e2')).toEqual({ name: 'Green', color: e5.color });
    expect(pawnColor(data, 'dark', 'e8')).toEqual({ name: 'Green', color: e5.color });
  });

  it('is none for the I-file pawns and for an unknown start', () => {
    expect(pawnColor(data, 'light', 'i2')).toBeUndefined();
    expect(pawnColor(data, 'dark', 'i8')).toBeUndefined();
    expect(pawnColor(data, 'light', undefined)).toBeUndefined();
  });

  it('gives each side 7 distinct colors across its 8 pawns', () => {
    for (const side of ['light', 'dark']) {
      const rank = side === 'light' ? 2 : 8;
      const colors = [...'bcdefghi']
        .map((f) => pawnColor(data, side, `${f}${rank}`)?.color)
        .filter(Boolean);
      expect(new Set(colors).size).toBe(7);
    }
  });
});
