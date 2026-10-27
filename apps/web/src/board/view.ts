// Pure view logic for the board renderer: seat rotation, edge labels, square
// colors and the tetrahedron on the Center square. Display only; no rule is
// read from here. Board data: rules/boards/standard-9x9.json.
import type { Board, Side, Square } from '@chess9s/engine';

export type Rotation = 0 | 90 | 180 | 270;

export const FILES = 'abcdefghi';
export const SIZE = 9;

/** The golden ratio. */
export const PHI = (1 + Math.sqrt(5)) / 2;

const BLACK = '#000000';
const WHITE = '#ffffff';

/** What the board shows besides the pieces in a game. */
export interface Highlights {
  /** The selected piece's square. */
  selected?: string;
  /** Squares the selected piece may move to; `capture` marks those holding a piece to take. */
  targets: { at: string; capture: boolean }[];
  /** The squares of the last move, from and to. */
  lastMove?: [string, string];
  /** Squares of the Kings in check. */
  check: string[];
  /** Squares of the side to move's pieces that the other side attacks (play aid). */
  danger?: string[];
  /** 3-player play aid: Kings a Dragon piece attacks without check (the Dragon may capture them). */
  exposed?: string[];
  /** Squares of the pieces that have a legal move. */
  movable: string[];
}

/** File index 0 to 8 and rank 1 to 9 from a square name such as "e5". */
export function parseSquare(at: string): { file: number; rank: number } {
  const m = /^([a-i])([1-9])$/.exec(at);
  if (!m) throw new Error(`Not a square on the 9x9 board: ${at}`);
  return { file: FILES.indexOf(m[1]!), rank: Number(m[2]) };
}

/** A seat's clockwise turn of the standard diagram; no view means the standard diagram. */
export function viewRotation(side: Side | undefined): Rotation {
  return side?.view?.rotate ?? 0;
}

/**
 * Screen cell (col, row; 0,0 is top left) of a square. The standard diagram
 * has rank 9 on top and the Coast (file a) on the left; `rotate` turns it
 * clockwise.
 */
export function toScreen(at: string, rotate: Rotation): { col: number; row: number } {
  const { file, rank } = parseSquare(at);
  const x = file;
  const y = SIZE - rank;
  const max = SIZE - 1;
  switch (rotate) {
    case 0:
      return { col: x, row: y };
    case 90:
      return { col: max - y, row: x };
    case 180:
      return { col: max - x, row: max - y };
    case 270:
      return { col: y, row: max - x };
  }
}

/**
 * Coordinate labels along the bottom edge (left to right) and the left edge
 * (top to bottom). Files run along the bottom when the board is upright or
 * turned 180; turned 90 or 270 they run up the left edge instead.
 */
export function edgeLabels(rotate: Rotation): { bottom: string[]; left: string[] } {
  const at = (col: number, row: number): { file: string; rank: string } => {
    for (const f of FILES)
      for (let r = 1; r <= SIZE; r++) {
        const s = toScreen(`${f}${r}`, rotate);
        if (s.col === col && s.row === row) return { file: f, rank: String(r) };
      }
    throw new Error('unreachable');
  };
  const filesOnBottom = rotate === 0 || rotate === 180;
  const pick = (cell: { file: string; rank: string }, wantFile: boolean) =>
    wantFile ? cell.file : cell.rank;
  return {
    bottom: Array.from({ length: SIZE }, (_, c) => pick(at(c, SIZE - 1), filesOnBottom)),
    left: Array.from({ length: SIZE }, (_, r) => pick(at(0, r), !filesOnBottom)),
  };
}

/** The square's own color if the board data gives one, else the chessboard checker (b1 black). */
export function squareFill(square: Square): string {
  if (square.color) return square.color;
  const { file, rank } = parseSquare(square.at);
  return (file + rank) % 2 === 0 ? BLACK : WHITE;
}

/** The name the rules give the E-file pawns (docs/RULES.md, `queen.pawnSwap`). */
const CENTER_PAWN = 'Green';

/**
 * A pawn's identifying color, drawn as a ring on its token so a player can see which colored
 * square is its safe zone. It is the color of its own side's colored square in the file it
 * started on (B2 red for light's B pawn, B8 pink for dark's), green for the E-file pawns (the
 * Center's color), and none for the I-file pawns, which have no color. `home` is the square the
 * pawn started on: a pawn that captures onto another file keeps its color. Display only.
 */
export function pawnColor(
  board: Board,
  side: string,
  home: string | undefined,
): { name: string; color: string } | undefined {
  const file = home?.[0];
  if (!file) return undefined;
  const own = board.squares.find(
    (sq) => sq.at[0] === file && sq.side === side && sq.types.includes('safe-zone'),
  );
  if (own?.color) return { name: own.label ?? own.at, color: own.color };
  const center = board.squares.find((sq) => sq.at[0] === file && sq.types.includes('center'));
  if (center?.color) return { name: CENTER_PAWN, color: center.color };
  return undefined;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The tetrahedron drawn on the Center square, seen from above (decision D36;
 * a symbol, not a rule). Its base is three corners of a cube, so equilateral.
 * One base side is parallel to the Coast column and the opposite vertex
 * points at Ting Yang, which is +x in the standard diagram. The apex stands
 * over the middle of the base. Coordinates are relative to the square's
 * center, `cell` is the square's side.
 *
 * Provisional: the owner asked for a size that is "Phi significant"; the base
 * side is phi/2 of the square (about 0.81), which keeps the shape inside it.
 */
export function tetrahedron(cell: number): { base: [Point, Point, Point]; apex: Point } {
  const side = (PHI / 2) * cell;
  const height = (side * Math.sqrt(3)) / 2;
  const left = -height / 3;
  return {
    base: [
      { x: left, y: -side / 2 },
      { x: left, y: side / 2 },
      { x: (2 * height) / 3, y: 0 },
    ],
    apex: { x: 0, y: 0 },
  };
}
