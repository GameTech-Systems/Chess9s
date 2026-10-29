// The rules library (S51): board, pieces, registry, rulesets, archive and locks assembled from
// the files of rules/, given as input, so the web app (import.meta.glob) and the online server
// (a static index) read the same data the same way.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRules, type RulesFiles } from './data';
import { RulesError, type Ruleset } from './loader';
import type { Lock } from './locks';

const rulesDir = new URL('../../../../rules/', import.meta.url).pathname;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const path = join(dir, f);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files: RulesFiles = Object.fromEntries(
  walk(rulesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [relative(rulesDir, f), JSON.parse(readFileSync(f, 'utf8'))]),
);

const without = (all: RulesFiles, path: string): RulesFiles =>
  Object.fromEntries(Object.entries(all).filter(([p]) => p !== path));

/** standard-2p with an earlier version kept in the archive, whose lock lets light move first. */
function withArchive(): RulesFiles {
  const current = files['rulesets/standard-2p.json'] as Ruleset;
  const lock = files['locks/standard-2p@0.1.0.json'] as Lock;
  const old: Ruleset = { ...current, version: '0.0.9', status: 'deprecated' };
  const oldLock: Lock = {
    id: 'standard-2p',
    version: '0.0.9',
    values: { ...lock.values, 'turn.firstMove': 'light' },
  };
  return {
    ...files,
    'rulesets/archive/standard-2p@0.0.9.json': old,
    'locks/standard-2p@0.0.9.json': oldLock,
  };
}

describe('loadRules', () => {
  const data = loadRules(files);

  it('reads every current ruleset, its locks, and the archive', () => {
    expect(data.library.current.map((r) => r.id).sort()).toEqual(
      readdirSync(join(rulesDir, 'rulesets'))
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
        .sort(),
    );
    expect(data.library.locks.length).toBeGreaterThan(0);
    // draft-3p 0.2.0 was kept without a lock (S56): it is found, but it does not replay.
    expect(data.library.archived.map((r) => `${r.id}@${r.version}`).sort()).toEqual([
      'draft-3p@0.2.0',
      'draft-3p@0.3.0',
      'easy-3p@0.1.0',
      'standard-3p@0.1.0',
      'standard-3p@0.2.0',
    ]);
    expect(data.find('draft-3p', '0.2.0')?.archived).toBe(true);
    expect(() => data.values('draft-3p', '0.2.0')).toThrow(/no lock/);
  });

  it('replays the 3-player versions played before S68 from their locks: any legal move off the Coast', () => {
    for (const [id, version] of [
      ['draft-3p', '0.3.0'],
      ['standard-3p', '0.1.0'],
      ['easy-3p', '0.1.0'],
    ] as const) {
      expect(data.find(id, version)?.archived, id).toBe(true);
      expect(data.rules(id, version).values['coast.3p.exit'], id).toBe('any-legal-move');
      expect(data.rules(id).values['coast.3p.exit'], id).toBe('a5-first-then-any');
    }
  });

  it('finds a ruleset by id, and by id and version', () => {
    expect(data.find('standard-2p')?.ruleset.id).toBe('standard-2p');
    expect(data.find('standard-2p', '0.1.0')?.archived).toBe(false);
    expect(data.find('standard-2p', '9.9.9')).toBeUndefined();
    expect(data.find('nothing')).toBeUndefined();
  });

  it('gives the rules a game plays: board, pieces, resolved values, 2 players', () => {
    const rules = data.rules('draft-2p');
    expect(rules.players).toBe(2);
    expect(rules.board.id).toBe('standard-9x9');
    expect(Object.keys(rules.pieces)).toContain('king');
    expect(rules.values['turn.firstMove']).toBe('dark');
  });

  it('refuses an unknown ruleset', () => {
    expect(() => data.rules('nothing')).toThrow(RulesError);
    expect(() => data.values('nothing')).toThrow(RulesError);
  });

  it('gives the rules of a 3-player ruleset: three players, the 3-player values (S57)', () => {
    for (const id of ['standard-3p', 'draft-3p', 'easy-3p']) {
      const rules = data.rules(id);
      expect(rules.players, id).toBe(3);
      expect(rules.values['endings.3p'], id).toBeDefined();
    }
    expect(data.rules('easy-3p').values['endings.3p']).toBe('first-checkmate');
  });

  it('plays an archived version from its lock, not from the registry', () => {
    const archived = loadRules(withArchive());
    expect(archived.find('standard-2p', '0.0.9')?.archived).toBe(true);
    expect(archived.find('standard-2p')?.ruleset.version).toBe('0.1.0');
    expect(archived.rules('standard-2p', '0.0.9').values['turn.firstMove']).toBe('light');
    expect(archived.rules('standard-2p').values['turn.firstMove']).toBe('dark');
  });

  it('plays given values on the same board and pieces', () => {
    const values = { ...data.values('draft-2p'), 'turn.firstMove': 'light' };
    expect(data.rulesWith(values).values['turn.firstMove']).toBe('light');
  });

  it('ignores files it does not use (schemas)', () => {
    expect(Object.keys(files).some((f) => f.startsWith('schema/'))).toBe(true);
    expect(loadRules(without(files, 'schema/board.schema.json')).library.current).toHaveLength(data.library.current.length);
  });

  it('refuses files without a registry or a board', () => {
    expect(() => loadRules(without(files, 'parameters.json'))).toThrow(/parameters\.json/);
    expect(() => loadRules(without(files, 'boards/standard-9x9.json')).rules('draft-2p')).toThrow(/standard-9x9/);
  });
});
