import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RulesError, resolveRuleset, type Registry, type Ruleset } from './loader';
import {
  describeProblem,
  diffLock,
  findRulesetVersion,
  isLocked,
  lockOf,
  resolveLocked,
  resolveVersion,
  type Lock,
  type RulesetLibrary,
} from './locks';
import { checkLockSchema } from './schema-check';

const read = <T>(p: string): T =>
  JSON.parse(readFileSync(new URL(`../../../../${p}`, import.meta.url), 'utf8')) as T;
const registry = read<Registry>('rules/parameters.json');
const standard = read<Ruleset>('rules/rulesets/standard-2p.json');

const withDefault = (id: string, value: unknown): Registry => ({
  ...registry,
  parameters: registry.parameters.map((p) => (p.id === id ? { ...p, default: value } : p)) as Registry['parameters'],
});

const lockStandard = (): Lock => lockOf(resolveRuleset(registry, standard));

describe('lockOf', () => {
  it('records the id, version and every resolved value', () => {
    const resolved = resolveRuleset(registry, standard);
    const lock = lockOf(resolved);
    expect(lock.id).toBe('standard-2p');
    expect(lock.version).toBe('0.1.0');
    expect(lock.values).toEqual(resolved.values);
    expect(lock.values['king.range']).toBe(1);
  });

  it('fits the lock schema', () => {
    expect(checkLockSchema(lockStandard())).toBe(true);
  });

  it('is refused by the schema without values', () => {
    const noValues: Partial<Lock> = lockStandard();
    delete noValues.values;
    expect(checkLockSchema(noValues)).toBe(false);
  });
});

describe('diffLock', () => {
  it('finds nothing when the ruleset still resolves to the lock', () => {
    expect(diffLock(lockStandard(), resolveRuleset(registry, standard))).toEqual([]);
  });

  it('names a changed value (an override edited)', () => {
    const lock = lockStandard();
    const edited = resolveRuleset(registry, { ...standard, overrides: { 'king.range': 2 } });
    const problems = diffLock(lock, edited);
    expect(problems).toEqual([{ kind: 'changed', key: 'king.range', locked: 1, now: 2 }]);
    expect(describeProblem(lock, problems[0]!)).toBe('standard-2p 0.1.0: king.range was 1, now 2');
  });

  it('names a changed value when a registry default it inherits is edited', () => {
    const lock = lockStandard();
    const edited = resolveRuleset(withDefault('king.canJump', true), standard);
    expect(diffLock(lock, edited)).toEqual([
      { kind: 'changed', key: 'king.canJump', locked: false, now: true },
    ]);
  });

  it('does not see a registry default edit that the ruleset overrides', () => {
    // standard-2p sets king.range itself, so only rulesets that inherit it move with the default.
    expect(diffLock(lockStandard(), resolveRuleset(withDefault('king.range', 3), standard))).toEqual([]);
    const draft = read<Ruleset>('rules/rulesets/draft-2p.json');
    const draftLock = lockOf(resolveRuleset(registry, draft));
    const problems = diffLock(draftLock, resolveRuleset(withDefault('king.range', 3), draft));
    expect(problems.map((p) => describeProblem(draftLock, p))).toEqual(['draft-2p 0.2.0: king.range was 2, now 3']);
  });

  it('names a lost key (the parameter was deprecated)', () => {
    const lock = lockStandard();
    const deprecated: Registry = {
      ...registry,
      parameters: registry.parameters.map((p) =>
        p.id === 'king.canJump' ? { ...p, status: 'deprecated' } : p,
      ) as Registry['parameters'],
    };
    expect(diffLock(lock, resolveRuleset(deprecated, standard))).toEqual([
      { kind: 'lost', key: 'king.canJump', locked: false },
    ]);
  });

  it('names a new key until the lock records it, and recording it changes no locked value', () => {
    const lock = lockStandard();
    const extra: Registry = {
      ...registry,
      parameters: [
        ...registry.parameters,
        {
          id: 'test.newKey',
          label: 'Test',
          piece: null,
          players: [2],
          type: 'integer',
          default: 1,
          options: [1, 2],
          status: 'proposed',
        },
      ] as Registry['parameters'],
    };
    const now = resolveRuleset(extra, standard);
    const problems = diffLock(lock, now);
    expect(problems).toEqual([{ kind: 'new', key: 'test.newKey', now: 1 }]);
    expect(describeProblem(lock, problems[0]!)).toBe('standard-2p 0.1.0: test.newKey is new (1), not in the lock');
    const recorded: Lock = { ...lock, values: { ...lock.values, 'test.newKey': 1 } };
    expect(diffLock(recorded, now)).toEqual([]);
    for (const [k, v] of Object.entries(lock.values)) expect(recorded.values[k]).toEqual(v);
  });

  it('compares set values by content', () => {
    const lock = lockStandard();
    const key = Object.keys(lock.values).find((k) => Array.isArray(lock.values[k]))!;
    expect(key).toBeDefined();
    const copy = JSON.parse(JSON.stringify(lock)) as Lock;
    expect(diffLock(copy, resolveRuleset(registry, standard))).toEqual([]);
  });
});

describe('isLocked', () => {
  it('is true for Candidate and Official rulesets only', () => {
    const status = (s: Ruleset['status']) => isLocked({ ...standard, status: s });
    expect(status('candidate')).toBe(true);
    expect(status('official')).toBe(true);
    expect(status('proposed')).toBe(false);
    expect(status('experimental')).toBe(false);
    expect(status('deprecated')).toBe(false);
  });
});

describe('resolveLocked', () => {
  const old: Ruleset = { ...standard, version: '0.0.9', status: 'deprecated', overrides: { 'king.range': 4 } };
  const oldLock: Lock = {
    id: 'standard-2p',
    version: '0.0.9',
    values: { ...lockStandard().values, 'king.range': 3 },
  };

  it('plays from the lock, not from the registry or the file overrides', () => {
    const resolved = resolveLocked(registry, old, oldLock);
    expect(resolved.values['king.range']).toBe(3);
    expect(resolved.values).toEqual(oldLock.values);
    expect(resolved.ruleset).toBe(old);
    expect(resolved.nulls).toEqual([]);
  });

  it('refuses a lock for another id or version', () => {
    expect(() => resolveLocked(registry, old, { ...oldLock, version: '0.1.0' })).toThrow(RulesError);
    expect(() => resolveLocked(registry, old, { ...oldLock, id: 'draft-2p' })).toThrow(RulesError);
  });

  it('refuses a lock that lacks a live parameter', () => {
    const values = { ...oldLock.values };
    delete values['king.range'];
    expect(() => resolveLocked(registry, old, { ...oldLock, values })).toThrow(/king\.range/);
  });

  it('keeps a key the registry has since deprecated, so the game replays as it was', () => {
    const deprecated: Registry = {
      ...registry,
      parameters: registry.parameters.map((p) =>
        p.id === 'king.canJump' ? { ...p, status: 'deprecated' } : p,
      ) as Registry['parameters'],
    };
    expect(resolveLocked(deprecated, old, oldLock).values['king.canJump']).toBe(false);
  });
});

describe('resolveVersion / findRulesetVersion', () => {
  const old: Ruleset = { ...standard, version: '0.0.9', status: 'deprecated' };
  const oldLock: Lock = { id: 'standard-2p', version: '0.0.9', values: { ...lockStandard().values, 'king.range': 3 } };
  const lib: RulesetLibrary = { current: [standard], archived: [old], locks: [oldLock] };

  it('finds the current version by id alone or by id and version', () => {
    expect(findRulesetVersion(lib, 'standard-2p')).toBe(standard);
    expect(findRulesetVersion(lib, 'standard-2p', '0.1.0')).toBe(standard);
  });

  it('finds an archived version only by its version', () => {
    expect(findRulesetVersion(lib, 'standard-2p', '0.0.9')).toBe(old);
    expect(findRulesetVersion(lib, 'standard-2p', '0.0.1')).toBeUndefined();
    expect(findRulesetVersion(lib, 'nope')).toBeUndefined();
  });

  it('resolves the current version from the registry and an archived one from its lock', () => {
    expect(resolveVersion(registry, lib, 'standard-2p').values['king.range']).toBe(1);
    expect(resolveVersion(registry, lib, 'standard-2p', '0.0.9').values['king.range']).toBe(3);
  });

  it('refuses an unknown version and an archived version with no lock', () => {
    expect(() => resolveVersion(registry, lib, 'standard-2p', '0.0.1')).toThrow(/standard-2p 0\.0\.1/);
    expect(() => resolveVersion(registry, { ...lib, locks: [] }, 'standard-2p', '0.0.9')).toThrow(/no lock/);
  });
});
