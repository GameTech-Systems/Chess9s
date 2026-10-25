// A ruleset file from outside the repository (S43): the web builder loads it and the sim checks
// it, both through readRulesetFile, so a file is read with the same strictness everywhere.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Registry } from './loader';
import { MAX_RULESET_FILE_BYTES, readRulesetFile } from './ruleset-file';

const registry = JSON.parse(
  readFileSync(new URL('../../../../rules/parameters.json', import.meta.url), 'utf8'),
) as Registry;

const good = {
  id: 'custom-1',
  name: 'Mine',
  version: '1.0.0',
  status: 'proposed',
  players: 2,
  description: 'A ruleset built by a player.',
  overrides: { 'king.range': 1, 'castling.enabled': true },
};
const read = (file: unknown) => readRulesetFile(JSON.stringify(file), registry);
const refused = (r: ReturnType<typeof readRulesetFile>) => {
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.problem;
};

describe('readRulesetFile', () => {
  it('reads a 2-player ruleset file: its name, overrides and every resolved value', () => {
    const r = read(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.name).toBe('Mine');
    expect(r.overrides).toEqual(good.overrides);
    expect(r.values['king.range']).toBe(1);
    expect(r.values['castling.enabled']).toBe(true);
    expect(r.version).toBe('1.0.0');
  });

  it('reads a file with no version as 1.0.0', () => {
    const { version: _, ...rest } = good;
    const r = read(rest);
    expect(r.ok && r.version).toBe('1.0.0');
  });

  it('ignores the file’s own id and status', () => {
    const r = read({ ...good, id: 'standard-2p', status: 'official' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r).not.toHaveProperty('id');
  });

  it('refuses broken and hostile files with a clear message', () => {
    const bad = (patch: object) => refused(read({ ...good, ...patch }));
    expect(refused(readRulesetFile('{nope', registry))).toMatch(/not a ruleset file/i);
    expect(refused(readRulesetFile('[]', registry))).toMatch(/not a ruleset file/i);
    expect(refused(readRulesetFile('x'.repeat(MAX_RULESET_FILE_BYTES + 1), registry))).toMatch(
      /too large/i,
    );
    expect(bad({ overrides: { 'made.up': true } })).toMatch(/made\.up/);
    expect(bad({ overrides: { 'king.range': 99 } })).toMatch(/king\.range/);
    const proto = JSON.stringify(good).replace('"overrides":{', '"overrides":{"__proto__":{"x":1},');
    expect(refused(readRulesetFile(proto, registry))).toMatch(/__proto__/);
    expect(bad({ extends: 'standard-2p' })).toMatch(/extends/);
    expect(bad({ extra: 1 })).toMatch(/extra/);
    expect(bad({ players: 3 })).toMatch(/2-player/);
    expect(bad({ name: 7 })).toMatch(/name/i);
    expect(bad({ name: '  ' })).toMatch(/name/i);
    expect(bad({ overrides: [] })).toMatch(/overrides/);
    expect(bad({ version: 'v2' })).toMatch(/version/);
  });

  it('refuses a 3-player setting in a 2-player file', () => {
    const threeOnly = registry.parameters.find(
      (p) => !p.players.includes(2) && p.status !== 'deprecated',
    );
    if (!threeOnly) return;
    expect(refused(read({ ...good, overrides: { [threeOnly.id]: threeOnly.default } }))).toContain(
      threeOnly.id,
    );
  });
});
