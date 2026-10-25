// Finding a ruleset by id and version (S45). The real rules/ has no archived version yet, so these
// cover the current-version side; replaying an archived version from its lock is tested in the
// engine (locks.test.ts) and in packages/sim (locks.test.ts).
import { describe, expect, it } from 'vitest';
import {
  createRules,
  createRulesFor,
  findRuleset,
  listRulesets,
  rulesetSettings,
  rulesetValues,
} from './rules';

describe('rulesets by id and version', () => {
  const standard = findRuleset('standard-2p')!;

  it('finds the current version with or without its version', () => {
    expect(findRuleset('standard-2p', standard.version)).toEqual(standard);
    expect(standard.archived).toBeUndefined();
  });

  it('finds no version that is neither current nor archived', () => {
    expect(findRuleset('standard-2p', '0.0.1')).toBeUndefined();
    expect(() => createRules('standard-2p', '0.0.1')).toThrow(/standard-2p 0\.0\.1/);
    expect(() => rulesetValues('standard-2p', '0.0.1')).toThrow(/0\.0\.1/);
    expect(() => rulesetSettings({ ...standard, version: '0.0.1' })).toThrow(/0\.0\.1/);
  });

  it('plays the same rules by id alone, by id and version, and from a recorded ref', () => {
    const values = createRules('standard-2p').values;
    expect(createRules('standard-2p', standard.version).values).toEqual(values);
    expect(createRulesFor(standard).values).toEqual(values);
    expect(rulesetValues('standard-2p', standard.version)).toEqual(values);
  });

  it('lists current versions only, none of them archived', () => {
    expect(listRulesets().some((r) => r.archived)).toBe(false);
  });
});
