// S56: 3-player rules (decision 0016), one position per numbered rule and per end-table row
// (test/fixtures/positions/three-player.json), on the real board and pieces.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import fixture from '../../test/fixtures/positions/three-player.json';
import { toNotation, type MoveRules, type PlacedPiece, type Position } from '../moves/generate';
import { validateBoardAndPieces } from '../rules/formats';
import { resolveRuleset, type Registry, type Ruleset } from '../rules/loader';
import { newGame, playMove, type GameState } from './game';
import type { Seats } from './three';

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

/** "<side> <piece>[ stone]" as a placed piece that has moved. */
function placed(text: string): PlacedPiece {
  const [side, piece, stone] = text.split(' ');
  return { piece: piece!, side: side!, moved: true, ...(stone === 'stone' && { stone: true }) };
}

const describePiece = (p: PlacedPiece | undefined) =>
  p && `${p.side} ${p.piece}${p.stone ? ' stone' : ''}`;

function play(g: GameState, notation: string): GameState {
  const move = g.legal.find((m) => toNotation(m) === notation);
  if (!move) {
    throw new Error(
      `${notation} is not legal for ${g.turn} (${JSON.stringify(g.result)}): ${g.legal.map(toNotation).join(' ')}`,
    );
  }
  return playMove(g, move);
}

interface Expect {
  legal?: string[];
  legalHas?: string[];
  legalLacks?: string[];
  checkers?: string[];
  result?: unknown;
  events?: unknown[];
  seats?: Seats;
  turn?: string;
  stones?: string[];
  empty?: string[];
  at?: Record<string, string>;
  next?: string[];
  nextTurn?: string;
}
interface Case {
  name: string;
  ruleset?: string;
  overrides?: Record<string, unknown>;
  turn: string;
  seats?: Seats;
  pieces: Record<string, string>;
  play?: string[];
  repeat?: { moves: string[]; times: number };
  after?: string[];
  expect: Expect;
}

function start(c: Case): GameState {
  const id = c.ruleset ?? 'standard-3p';
  const position: Position = Object.fromEntries(
    Object.entries(c.pieces).map(([at, text]) => [at, placed(text)]),
  );
  const seats: Seats = { dark: 'active', light: 'active', dragon: 'active', ...c.seats };
  return newGame(
    rulesFor(id, c.overrides),
    { id, version: '0' },
    { position, turn: c.turn, seats },
  );
}

describe.each((fixture.cases as Case[]).map((c) => [c.name, c] as const))('%s', (_name, c) => {
  it('plays out as decision 0016 says', () => {
    const repeated = Array.from({ length: c.repeat?.times ?? 0 }, () => c.repeat!.moves).flat();
    let g = [...(c.play ?? []), ...repeated, ...(c.after ?? [])].reduce(play, start(c));
    const e = c.expect;
    const legal = g.legal.map(toNotation);
    if (e.legal) expect(legal).toEqual(e.legal);
    for (const m of e.legalHas ?? []) expect(legal, m).toContain(m);
    for (const m of e.legalLacks ?? []) expect(legal, m).not.toContain(m);
    if (e.checkers) expect(g.checkers).toEqual(e.checkers);
    if (e.events) expect(g.moves.at(-1)?.events ?? []).toEqual(e.events);
    if (e.seats) expect(g.seats).toEqual(e.seats);
    if (e.turn) expect(g.turn).toBe(e.turn);
    for (const at of e.stones ?? []) expect(g.position[at]?.stone, at).toBe(true);
    for (const at of e.empty ?? []) expect(g.position[at], at).toBeUndefined();
    for (const [at, text] of Object.entries(e.at ?? {})) {
      expect(describePiece(g.position[at]), at).toBe(text);
    }
    if (e.next) g = e.next.reduce(play, g);
    if (e.nextTurn) expect(g.turn).toBe(e.nextTurn);
    if (e.result) expect(g.result).toEqual(e.result);
  });
});
