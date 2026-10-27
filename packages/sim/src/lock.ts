// The ruleset lock script (S45): writes a lock for a Candidate or Official ruleset, records new
// parameters in an existing lock, and keeps the current file of a ruleset as an archived version.
// It never overwrites a lock or an archived file, and never changes a value a lock already holds.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  RulesError,
  describeProblem,
  diffLock,
  isLocked,
  lockOf,
  resolveRuleset,
  type Lock,
  type Ruleset,
} from '@chess9s/engine';
import { loadLibrary } from './load';

const LOCK_SCHEMA = '../schema/lock.schema.json';
const RULESET_SCHEMA = '../../schema/ruleset.schema.json';

const writeJson = (path: string, data: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
};

function currentOf(root: string, id: string) {
  const { registry, library } = loadLibrary(root);
  const ruleset = library.current.find((r) => r.id === id);
  if (!ruleset) throw new RulesError(`No ruleset ${id} in rules/rulesets`);
  const known = Object.fromEntries(library.current.map((r) => [r.id, r]));
  return { library, ruleset, resolved: resolveRuleset(registry, ruleset, known) };
}

const lockPath = (root: string, r: Pick<Ruleset, 'id' | 'version'>) =>
  join(root, 'rules/locks', `${r.id}@${r.version}.json`);

/** Write the lock of a Candidate or Official ruleset's current version; refuses to overwrite one. */
export function writeLock(root: string, id: string): string {
  const { ruleset, resolved } = currentOf(root, id);
  if (!isLocked(ruleset)) {
    throw new RulesError(
      `Ruleset ${id} is ${ruleset.status}: only a candidate or official ruleset is locked`,
    );
  }
  const path = lockPath(root, ruleset);
  if (existsSync(path))
    throw new RulesError(`Lock ${path} already exists; a lock is never overwritten`);
  const { id: lockId, version, values } = lockOf(resolved);
  writeJson(path, { $schema: LOCK_SCHEMA, id: lockId, version, values });
  return path;
}

/**
 * Record parameters that are new since the lock was written, at their current value. Refuses when
 * any locked value changed or was lost: recording a new key never changes a locked value.
 */
export function addLockKeys(root: string, id: string): { path: string; added: string[] } {
  const { library, ruleset, resolved } = currentOf(root, id);
  const lock = library.locks.find((l) => l.id === id && l.version === ruleset.version);
  const path = lockPath(root, ruleset);
  if (!lock) throw new RulesError(`Ruleset ${id} ${ruleset.version} has no lock`);
  const problems = diffLock(lock, resolved);
  const broken = problems.filter((p) => p.kind !== 'new');
  if (broken.length > 0) {
    throw new RulesError(
      'A locked value changed',
      broken.map((p) => describeProblem(lock, p)),
    );
  }
  const added = problems.map((p) => p.key);
  if (added.length > 0) {
    const values: Lock['values'] = { ...lock.values };
    for (const key of added) values[key] = resolved.values[key]!;
    writeJson(path, { ...lock, values });
  }
  return { path, added };
}

/** The note an archived version carries when it was kept without a lock. */
export const UNLOCKED_NOTE =
  'Kept without a lock: it was never a Candidate or Official, so it does not replay.';

/**
 * Keep the current file of a ruleset as an archived version before its version is bumped: copies it
 * to rules/rulesets/archive/<id>@<version>.json with status `deprecated`. A Candidate or Official
 * version must be locked already, so the archived version plays from its lock; an earlier status
 * has no lock and is kept with UNLOCKED_NOTE (S56: draft-3p 0.2.0, experimental).
 */
export function archiveRuleset(root: string, id: string): string {
  const { library, ruleset } = currentOf(root, id);
  const locked = library.locks.some((l) => l.id === id && l.version === ruleset.version);
  if (isLocked(ruleset) && !locked) {
    throw new RulesError(`Ruleset ${id} ${ruleset.version} has no lock; write it first`);
  }
  const path = join(root, 'rules/rulesets/archive', `${id}@${ruleset.version}.json`);
  if (existsSync(path)) throw new RulesError(`Archived file ${path} already exists`);
  writeJson(path, {
    ...ruleset,
    $schema: RULESET_SCHEMA,
    status: 'deprecated',
    ...(!locked && { notes: UNLOCKED_NOTE }),
  });
  return path;
}
