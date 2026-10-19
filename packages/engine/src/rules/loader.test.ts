import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RulesError,
  assertPlayable,
  resolveRuleset,
  validateRegistry,
  type Registry,
  type Ruleset,
} from './loader';

const read = <T>(p: string): T => JSON.parse(readFileSync(new URL(`../../../../${p}`, import.meta.url), 'utf8')) as T;
const registry = read<Registry>('rules/parameters.json');
const draft2p = read<Ruleset>('rules/rulesets/draft-2p.json');
const draft3p = read<Ruleset>('rules/rulesets/draft-3p.json');

const applicable = (players: 2 | 3) =>
  registry.parameters.filter((p) => p.players.includes(players) && p.status !== 'deprecated');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const withParam = (patch: Record<string, unknown>, id = 'test.param'): Registry => ({
  ...registry,
  parameters: [
    ...registry.parameters,
    {
      id,
      label: 'Test',
      piece: null,
      players: [2],
      type: 'integer',
      default: 1,
      options: [1, 2],
      status: 'proposed',
      ...patch,
    } as Registry['parameters'][number],
  ],
});

describe('validateRegistry', () => {
  it('accepts the shipped registry', () => {
    expect(() => validateRegistry(registry)).not.toThrow();
  });

  it('rejects a registry that fails the schema', () => {
    expect(() => validateRegistry({ version: '1', parameters: [{ id: 'x' }] })).toThrow(RulesError);
  });

  it('rejects a default that is not one of its options', () => {
    expect(() => validateRegistry(withParam({ default: 9 }))).toThrow(/default/);
  });

  it('rejects an enumSet default that is not a subset of its options', () => {
    expect(() =>
      validateRegistry(withParam({ type: 'enumSet', default: ['a', 'z'], options: ['a', 'b'] })),
    ).toThrow(/default/);
  });

  it('rejects duplicate ids', () => {
    const dup = withParam({}, 'king.range');
    expect(() => validateRegistry(dup)).toThrow(/duplicate/i);
  });
});

describe('resolveRuleset defaults', () => {
  it('resolves the 2-player draft with every applicable parameter at its default and no nulls', () => {
    const r = resolveRuleset(registry, draft2p);
    const ids = applicable(2).map((p) => p.id);
    expect(Object.keys(r.values).sort()).toEqual([...ids].sort());
    for (const p of applicable(2)) expect(r.values[p.id]).toEqual(p.default);
    expect(r.nulls).toEqual([]);
    expect(() => assertPlayable(r)).not.toThrow();
  });

  it('resolves the 3-player draft at defaults', () => {
    const r = resolveRuleset(registry, draft3p);
    for (const p of applicable(3)) expect(r.values[p.id]).toEqual(p.default);
    expect(r.nulls).toEqual([]);
  });

  it('never resolves deprecated parameters into a game', () => {
    const r2 = resolveRuleset(registry, draft2p);
    const r3 = resolveRuleset(registry, draft3p);
    for (const id of ['queen.enemyTerritoryEntry', 'dragons.2p.mode']) expect(r2.values).not.toHaveProperty(id);
    expect(r3.values).not.toHaveProperty('dragon.range');
  });

  it('leaves out parameters for the other player count', () => {
    expect(resolveRuleset(registry, draft2p).values).not.toHaveProperty('sunMoon.3p.range');
    expect(resolveRuleset(registry, draft3p).values).not.toHaveProperty('sunMoon.range');
  });

  it('records the decided D2/D6 values', () => {
    const v = resolveRuleset(registry, draft2p).values;
    expect(v['pawn.promotion.targets']).toEqual(['queen', 'rook', 'bishop', 'knight']);
    expect(v['sunMoon.capture']).toBe('any-move-square');
  });
});

describe('resolveRuleset options', () => {
  const cases: [string, unknown][] = applicable(2).flatMap((p) =>
    p.type === 'enumSet' ? p.options.map((o): [string, unknown] => [p.id, [o]]) : p.options.map((o): [string, unknown] => [p.id, o]),
  );

  it.each(cases)('2-player override %s = %j resolves', (id: string, value: unknown) => {
    const rs: Ruleset = { ...draft2p, overrides: { [id]: value } };
    expect(resolveRuleset(registry, rs).values[id]).toEqual(value);
  });

  it('every option of every 3-player parameter resolves', () => {
    for (const p of applicable(3)) {
      for (const o of p.type === 'enumSet' ? (p.options as unknown[]).map((x) => [x]) : p.options) {
        const rs: Ruleset = { ...draft3p, overrides: { [p.id]: o } };
        expect(same(resolveRuleset(registry, rs).values[p.id], o)).toBe(true);
      }
    }
  });
});

describe('resolveRuleset overrides', () => {
  const ov = (overrides: Record<string, unknown>): Ruleset => ({ ...draft2p, overrides });

  it('rejects an unknown parameter', () => {
    expect(() => resolveRuleset(registry, ov({ 'nope.nothing': 1 }))).toThrow(/unknown/i);
  });

  it('rejects a value that is not an option', () => {
    expect(() => resolveRuleset(registry, ov({ 'king.range': 9 }))).toThrow(/option/);
    expect(() => resolveRuleset(registry, ov({ 'pawn.promotion.targets': ['queen', 'king'] }))).toThrow(/option/);
  });

  it('rejects an override of a deprecated parameter', () => {
    expect(() => resolveRuleset(registry, ov({ 'dragons.2p.mode': 'removed' }))).toThrow(/deprecated/);
  });

  it('rejects an override for another player count', () => {
    expect(() => resolveRuleset(registry, ov({ 'sunMoon.3p.range': 1 }))).toThrow(/players/);
  });

  it('applies extends before the ruleset’s own overrides', () => {
    const base: Ruleset = { ...draft2p, id: 'base', overrides: { 'king.range': 1, 'king.canJump': true } };
    const child: Ruleset = { ...draft2p, id: 'child', extends: 'base', overrides: { 'king.range': 3 } };
    const r = resolveRuleset(registry, child, { base });
    expect(r.values['king.range']).toBe(3);
    expect(r.values['king.canJump']).toBe(true);
  });

  it('rejects a missing or cyclic extends', () => {
    expect(() => resolveRuleset(registry, { ...draft2p, extends: 'ghost' })).toThrow(/extends/);
    const a: Ruleset = { ...draft2p, id: 'a', extends: 'b' };
    const b: Ruleset = { ...draft2p, id: 'b', extends: 'a' };
    expect(() => resolveRuleset(registry, a, { a, b })).toThrow(/cycle/i);
  });

  it('rejects a ruleset that fails the schema', () => {
    expect(() => resolveRuleset(registry, { ...draft2p, version: 'one' })).toThrow(RulesError);
  });
});

describe('null parameters', () => {
  const nullReg = withParam({ default: null, options: [1, 2] });

  it('resolves but reports a null default for the ruleset’s players', () => {
    const r = resolveRuleset(nullReg, draft2p);
    expect(r.values['test.param']).toBeNull();
    expect(r.nulls).toEqual(['test.param']);
  });

  it('refuses to start a game that depends on a null parameter', () => {
    expect(() => assertPlayable(resolveRuleset(nullReg, draft2p))).toThrow(/test\.param/);
  });

  it('plays once an override supplies the value', () => {
    const r = resolveRuleset(nullReg, { ...draft2p, overrides: { 'test.param': 2 } });
    expect(r.nulls).toEqual([]);
    expect(() => assertPlayable(r)).not.toThrow();
  });

  it('ignores a null parameter that is not for this player count', () => {
    const r = resolveRuleset(nullReg, draft3p);
    expect(r.nulls).toEqual([]);
  });

  it('ignores a deprecated null parameter', () => {
    const r = resolveRuleset(withParam({ default: null, status: 'deprecated' }), draft2p);
    expect(r.nulls).toEqual([]);
  });
});
