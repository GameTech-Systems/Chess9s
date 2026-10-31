// S56: the 3-player data of decision 0016. Registry 0.3.0 with its six parameters, the three
// 3-player rulesets (Good Practice, Standard, Easy Start), the kept 0.2.0 file, and the loader's
// refusal of a first-checkmate ending without Dragon check (`requires`). S68 (decision 0019):
// registry 0.4.0, new versions of the three rulesets, and their earlier versions kept with locks.
// S71 (decision 0020): registry 0.5.0, standard-3p 0.3.0, and standard-3p 0.2.0 kept with a lock.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RulesError, resolveRuleset, validateRegistry, type Registry, type Ruleset } from './loader';

const root = new URL('../../../../', import.meta.url).pathname;
const read = <T>(p: string): T => JSON.parse(readFileSync(root + p, 'utf8')) as T;
const registry = read<Registry>('rules/parameters.json');
const ruleset = (id: string) => read<Ruleset>(`rules/rulesets/${id}.json`);
const param = (id: string) => registry.parameters.find((p) => p.id === id);

const NEW: [string, string, unknown, unknown[]][] = [
  ['endings.3p', 'Turns and draws', 'stones-and-duel', ['stones-and-duel', 'first-checkmate']],
  ['dragon.3p.lastKing', 'Dragon Heads', 'checkmate', ['checkmate', 'capture']],
  ['tail.3p.mateTiming', 'Dragon Tail', 'after-move', ['after-move', 'dragon-turn']],
  ['draw.3p.threefoldRepetition', 'Turns and draws', true, [true, false]],
  ['draw.3p.fiftyMove', 'Turns and draws', true, [true, false]],
  ['check.3p.exposedKing', 'King', 'not-allowed', ['not-allowed', 'counts-as-checkmate']],
];

describe('registry 0.3.0 (decision 0016), 0.4.0 (decision 0019), 0.5.0 (decision 0020) and 0.6.0 (decision 0021)', () => {
  it('has version 0.6.0', () => {
    expect(registry.version).toBe('0.6.0');
  });

  it.each(NEW)('%s: group, default, options, 3 players, experimental', (id, group, def, options) => {
    const p = param(id);
    expect(p, id).toBeDefined();
    expect(p!.group).toBe(group);
    expect(p!.default).toEqual(def);
    expect(p!.options).toEqual(options);
    expect(p!.players).toEqual([3]);
    expect(p!.status).toBe('experimental');
    expect(p!.source).toMatch(/decision 0016/);
  });

  it('endings.3p = first-checkmate requires dragon.3p.givesCheck on', () => {
    expect(param('endings.3p')!.requires).toEqual({
      'first-checkmate': { 'dragon.3p.givesCheck': true },
    });
  });
});

const resolve = (id: string, overrides: Record<string, unknown> = {}) => {
  const rs = ruleset(id);
  return resolveRuleset(registry, { ...rs, overrides: { ...rs.overrides, ...overrides } }).values;
};

describe('the 3-player rulesets', () => {
  it('draft-3p 0.4.0 (Good Practice) plays every parameter at its default', () => {
    const rs = ruleset('draft-3p');
    expect([rs.version, rs.status, rs.players]).toEqual(['0.4.0', 'experimental', 3]);
    expect(rs.overrides).toEqual({});
  });

  it('standard-3p 0.3.0 (Standard) sets king.range = 1 and the Coast rule of decision 0020', () => {
    const rs = ruleset('standard-3p');
    expect([rs.version, rs.status, rs.players]).toEqual(['0.3.0', 'experimental', 3]);
    expect(rs.overrides).toEqual({
      'king.range': 1,
      'coast.3p.attackFrom': 'blocked',
      'coast.3p.capturable': true,
    });
  });

  it('keeps standard-3p 0.2.0, played before S71, with a lock: attacks from the Coast, no capture there', () => {
    const old = read<Ruleset>('rules/rulesets/archive/standard-3p@0.2.0.json');
    expect([old.version, old.status, old.overrides]).toEqual([
      '0.2.0',
      'deprecated',
      { 'king.range': 1 },
    ]);
    const lock = read<{ values: Record<string, unknown> }>('rules/locks/standard-3p@0.2.0.json');
    expect(lock.values).toEqual(resolveRuleset(registry, old).values);
    expect(lock.values['coast.3p.attackFrom']).toBe('allowed');
    expect(lock.values['coast.3p.capturable']).toBe(false);
  });

  it('easy-3p 0.2.0 (Easy Start) has the overrides of decision 0016', () => {
    const rs = ruleset('easy-3p');
    expect([rs.version, rs.status, rs.players]).toEqual(['0.2.0', 'experimental', 3]);
    expect(rs.overrides).toEqual({
      'king.range': 1,
      'castling.enabled': true,
      'queen.canCrossVoid': true,
      'queen.canStandOnVoid': true,
      'pawn.safeZones': 'off',
      'pawn.canEnterCenter': true,
      'center.occupants': 'any',
      'center.passThrough': param('center.passThrough')!.options,
      'coast.3p.capturable': true,
      'dragon.3p.givesCheck': true,
      'tail.3p.movement': 'two-player-path',
      'tail.3p.captures': 'none',
      'endings.3p': 'first-checkmate',
    });
    expect(() => resolve('easy-3p')).not.toThrow();
  });

  it('keeps draft-3p 0.2.0 in the archive, deprecated and unlocked (it was experimental)', () => {
    const path = 'rules/rulesets/archive/draft-3p@0.2.0.json';
    expect(existsSync(root + path)).toBe(true);
    const old = read<Ruleset>(path);
    expect([old.id, old.version, old.status]).toEqual(['draft-3p', '0.2.0', 'deprecated']);
    expect(existsSync(root + 'rules/locks/draft-3p@0.2.0.json')).toBe(false);
  });

  it.each([
    ['draft-3p', '0.3.0'],
    ['standard-3p', '0.1.0'],
    ['easy-3p', '0.1.0'],
  ])(
    'keeps %s %s, played before coast.3p.exit was built, with a lock of any-legal-move',
    (id, version) => {
      const old = read<Ruleset>(`rules/rulesets/archive/${id}@${version}.json`);
      expect([old.id, old.version, old.status]).toEqual([id, version, 'deprecated']);
      const lock = read<{ values: Record<string, unknown> }>(`rules/locks/${id}@${version}.json`);
      const asPlayed = resolveRuleset(registry, {
        ...old,
        overrides: { ...old.overrides, 'coast.3p.exit': 'any-legal-move' },
      }).values;
      expect(lock.values).toEqual(asPlayed);
    },
  );
});

describe('requires', () => {
  it('refuses endings.3p = first-checkmate without dragon.3p.givesCheck', () => {
    expect(() => resolve('draft-3p', { 'endings.3p': 'first-checkmate' })).toThrow(
      /endings\.3p.*dragon\.3p\.givesCheck/,
    );
    expect(() =>
      resolve('draft-3p', { 'endings.3p': 'first-checkmate', 'dragon.3p.givesCheck': true }),
    ).not.toThrow();
    expect(() => resolve('easy-3p', { 'dragon.3p.givesCheck': false })).toThrow(RulesError);
  });

  const withRequires = (requires: unknown): Registry => ({
    ...registry,
    parameters: registry.parameters.map((p) =>
      p.id === 'endings.3p' ? ({ ...p, requires } as typeof p) : p,
    ),
  });

  it('rejects a registry whose requires names an unknown option, parameter or value', () => {
    expect(() => validateRegistry(withRequires({ nope: { 'dragon.3p.givesCheck': true } }))).toThrow(
      /not an option/,
    );
    expect(() => validateRegistry(withRequires({ 'first-checkmate': { 'no.such': true } }))).toThrow(
      /unknown parameter/,
    );
    expect(() =>
      validateRegistry(withRequires({ 'first-checkmate': { 'dragon.3p.givesCheck': 'yes' } })),
    ).toThrow(/not an option/);
  });
});
