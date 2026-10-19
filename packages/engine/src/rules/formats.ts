// Board and piece formats: validates board and piece data against the JSON
// Schemas in rules/schema/, then checks what a schema can't: unique ids,
// declared square types and sides, parameter references, and setups that only
// place known pieces. Pure: callers pass parsed JSON, nothing is read here.
// Format: docs/decisions/0007-board-and-piece-formats.md.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import boardSchema from '../../../../rules/schema/board.schema.json';
import pieceSchema from '../../../../rules/schema/piece.schema.json';
import { RulesError, validateRegistry, type Parameter, type Registry } from './loader';

/** Setup key for pieces that belong to no side. */
export const NEUTRAL = 'neutral';

export interface SquareType {
  id: string;
  label: string;
  description?: string;
}

export interface Square {
  /** File a to i, rank 1 to 9, such as "e5". */
  at: string;
  types: string[];
  side?: string;
  label?: string;
}

export interface Side {
  id: string;
  /** Up is toward rank 9. A side without one can't hold forward-relative pieces. */
  forward?: 'up' | 'down';
}

export interface Setup {
  players: 2 | 3;
  /** Side id (or NEUTRAL) to square to piece id. */
  pieces: Record<string, Record<string, string>>;
  notes?: string;
}

export interface Board {
  $schema?: string;
  id: string;
  name: string;
  version: string;
  description?: string;
  squareTypes: SquareType[];
  squares: Square[];
  sides: Side[];
  setups: Setup[];
  source?: string;
  notes?: string;
}

export interface ParamRef {
  param: string;
}

export type Flag = boolean | ParamRef;
export type Scalar = string | number | boolean;

export type Direction =
  | 'orthogonal'
  | 'diagonal'
  | 'forward'
  | 'backward'
  | 'sideways'
  | 'forward-diagonal'
  | 'backward-diagonal';

export type Condition =
  | { param: string; is: Scalar }
  | { param: string; in: Scalar[] }
  | { param: string; has: Scalar }
  | { players: (2 | 3)[] }
  | { from: string }
  | { firstMove: boolean }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] };

export interface SquareRule {
  type: string;
  stop?: Flag;
  pass?: Flag;
  when?: Condition;
  notes?: string;
}

export interface Move {
  directions?: Direction[];
  /** [files, ranks] per step; positive ranks are toward the side's forward. */
  vectors?: [number, number][];
  symmetry?: 'none' | 'mirror' | 'all';
  targets?: string[];
  /** Omitted means unlimited. */
  range?: number | ParamRef;
  jump?: Flag;
  capture?: 'move-or-capture' | 'move-only' | 'capture-only';
  squares?: SquareRule[];
  when?: Condition;
  notes?: string;
}

export interface Piece {
  $schema?: string;
  id: string;
  name: string;
  letter: string;
  description?: string;
  royal?: boolean;
  capturable?: Flag;
  givesCheck?: Flag;
  moves: Move[];
  squares?: SquareRule[];
  promotion?: { to: string[] | ParamRef; when?: Condition };
  source?: string;
  notes?: string;
}

export interface BoardAndPieces {
  board: Board;
  pieces: Record<string, Piece>;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const checkBoardSchema = ajv.compile(boardSchema);
const checkPieceSchema = ajv.compile(pieceSchema);

const schemaIssues = (errors: typeof checkBoardSchema.errors): string[] =>
  (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`);

const isRef = (v: unknown): v is ParamRef => typeof v === 'object' && v !== null && 'param' in v;

/** Validate a board against its schema, then check ids, square types, sides and setups. */
export function validateBoard(board: unknown): asserts board is Board {
  if (!checkBoardSchema(board)) {
    throw new RulesError('Board fails its schema', schemaIssues(checkBoardSchema.errors));
  }
  const b = board as unknown as Board;
  const issues: string[] = [];
  const declared = (list: { id: string }[], what: string): Set<string> => {
    const ids = new Set<string>();
    for (const { id } of list) {
      if (ids.has(id)) issues.push(`${what}: ${id} is declared twice`);
      ids.add(id);
    }
    return ids;
  };
  const types = declared(b.squareTypes, 'squareTypes');
  const sides = declared(b.sides, 'sides');

  const listed = new Set<string>();
  for (const sq of b.squares) {
    if (listed.has(sq.at)) issues.push(`squares: ${sq.at} is listed twice`);
    listed.add(sq.at);
    for (const t of sq.types) if (!types.has(t)) issues.push(`squares: ${sq.at} has undeclared type ${t}`);
    if (sq.side !== undefined && !sides.has(sq.side)) {
      issues.push(`squares: ${sq.at} belongs to undeclared side ${sq.side}`);
    }
  }

  const counts = new Set<number>();
  for (const setup of b.setups) {
    const where = `setup ${setup.players}p`;
    if (counts.has(setup.players)) issues.push(`setups: more than one setup for ${setup.players} players`);
    counts.add(setup.players);
    const usedBy = new Map<string, string>();
    for (const [side, placed] of Object.entries(setup.pieces)) {
      if (side !== NEUTRAL && !sides.has(side)) issues.push(`${where}: undeclared side ${side}`);
      for (const at of Object.keys(placed)) {
        const other = usedBy.get(at);
        if (other !== undefined) issues.push(`${where}: ${at} is used by ${other} and ${side}`);
        else usedBy.set(at, side);
      }
    }
  }
  if (issues.length > 0) throw new RulesError(`Board ${b.id} is inconsistent`, issues);
}

const typeLabel: Record<Parameter['type'], string> = {
  integer: 'an integer',
  boolean: 'a boolean',
  enum: 'an enum',
  enumSet: 'an enumSet',
};

/** Validate one piece against its schema, then check its references to the board and registry. */
export function validatePiece(piece: unknown, board: Board, registry: Registry): asserts piece is Piece {
  if (!checkPieceSchema(piece)) {
    throw new RulesError('Piece fails its schema', schemaIssues(checkPieceSchema.errors));
  }
  const p = piece as unknown as Piece;
  const params = new Map(registry.parameters.map((x) => [x.id, x]));
  const types = new Set(board.squareTypes.map((t) => t.id));
  const issues: string[] = [];
  const issue = (msg: string) => issues.push(`${p.id}: ${msg}`);

  const param = (path: string, id: string): Parameter | undefined => {
    const found = params.get(id);
    if (!found) issue(`${path} refers to unknown parameter ${id}`);
    else if (found.status === 'deprecated') issue(`${path} refers to deprecated parameter ${id}`);
    else return found;
    return undefined;
  };
  const ref = (path: string, value: unknown, type: Parameter['type']) => {
    if (!isRef(value)) return;
    const found = param(path, value.param);
    if (found && found.type !== type) {
      issue(`${path} needs ${typeLabel[type]} parameter, ${found.id} is ${found.type}`);
    }
  };
  const squareType = (path: string, id: string) => {
    if (!types.has(id)) issue(`${path} uses undeclared square type ${id}`);
  };
  const option = (path: string, found: Parameter, value: Scalar) => {
    if (!found.options.includes(value)) issue(`${path}: ${JSON.stringify(value)} is not an option of ${found.id}`);
  };
  const condition = (path: string, c: Condition) => {
    if ('not' in c) condition(path, c.not);
    else if ('all' in c) for (const x of c.all) condition(path, x);
    else if ('any' in c) for (const x of c.any) condition(path, x);
    else if ('from' in c) squareType(path, c.from);
    else if ('param' in c) {
      const found = param(path, c.param);
      if (!found) return;
      if ('has' in c) {
        if (found.type !== 'enumSet') issue(`${path}: has needs an enumSet parameter, ${found.id} is ${found.type}`);
        else option(path, found, c.has);
      } else if (found.type === 'enumSet') {
        issue(`${path}: is/in need a single-value parameter, ${found.id} is enumSet`);
      } else {
        for (const v of 'is' in c ? [c.is] : c.in) option(path, found, v);
      }
    }
  };
  const squareRules = (path: string, rules: SquareRule[] = []) =>
    rules.forEach((r, i) => {
      squareType(`${path}[${i}]`, r.type);
      ref(`${path}[${i}].stop`, r.stop, 'boolean');
      ref(`${path}[${i}].pass`, r.pass, 'boolean');
      if (r.when) condition(`${path}[${i}].when`, r.when);
    });

  ref('capturable', p.capturable, 'boolean');
  ref('givesCheck', p.givesCheck, 'boolean');
  p.moves.forEach((m, i) => {
    const path = `moves[${i}]`;
    for (const t of m.targets ?? []) squareType(`${path}.targets`, t);
    ref(`${path}.range`, m.range, 'integer');
    ref(`${path}.jump`, m.jump, 'boolean');
    squareRules(`${path}.squares`, m.squares);
    if (m.when) condition(`${path}.when`, m.when);
  });
  squareRules('squares', p.squares);
  if (p.promotion) {
    ref('promotion.to', p.promotion.to, 'enumSet');
    if (p.promotion.when) condition('promotion.when', p.promotion.when);
  }
  if (issues.length > 0) throw new RulesError(`Piece ${p.id} is inconsistent`, issues);
}

const RELATIVE_DIRECTIONS = new Set<Direction>(['forward', 'backward', 'forward-diagonal', 'backward-diagonal']);

/** Whether the piece's movement depends on which way its side faces. */
function needsForward(p: Piece): boolean {
  if (p.promotion) return true;
  return p.moves.some((m) => {
    if (m.directions?.some((d) => RELATIVE_DIRECTIONS.has(d))) return true;
    if (!m.vectors || m.symmetry === 'all') return false;
    const steps = m.symmetry === 'mirror' ? m.vectors.flatMap(([f, r]) => [[f, r], [-f, r]]) : m.vectors;
    const set = new Set(steps.map(([f, r]) => `${f},${r}`));
    return steps.some(([f, r]) => !set.has(`${f},${-r!}`));
  });
}

/**
 * Validate a board, its pieces and the registry they refer to, then check
 * that setups place only known pieces, promotions name known pieces, and
 * forward-relative pieces start only for sides with a forward direction.
 */
export function validateBoardAndPieces(board: unknown, pieces: unknown[], registry: unknown): BoardAndPieces {
  validateRegistry(registry);
  validateBoard(board);
  const byId: Record<string, Piece> = {};
  const issues: string[] = [];
  for (const piece of pieces) {
    validatePiece(piece, board, registry);
    if (byId[piece.id]) issues.push(`${piece.id}: piece id is used twice`);
    byId[piece.id] = piece;
  }
  for (const p of Object.values(byId)) {
    const to = p.promotion?.to;
    if (Array.isArray(to)) {
      for (const id of to) if (!byId[id]) issues.push(`${p.id}: promotion.to names unknown piece ${id}`);
    }
  }
  const facing = new Map(board.sides.map((s) => [s.id, s.forward]));
  for (const setup of board.setups) {
    for (const [side, placed] of Object.entries(setup.pieces)) {
      for (const [at, id] of Object.entries(placed)) {
        const p = byId[id];
        if (!p) issues.push(`setup ${setup.players}p: ${at} places unknown piece ${id}`);
        else if (facing.get(side) === undefined && needsForward(p)) {
          issues.push(`setup ${setup.players}p: ${at} places ${id} for ${side}, which has no forward direction`);
        }
      }
    }
  }
  if (issues.length > 0) throw new RulesError(`Board ${board.id} and its pieces are inconsistent`, issues);
  return { board, pieces: byId };
}
