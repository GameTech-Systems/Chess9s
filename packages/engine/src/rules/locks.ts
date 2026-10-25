// Ruleset locks and kept versions (S45). A lock holds every resolved value of one version of a
// Candidate or Official ruleset, so a registry edit cannot silently change it, and an old version
// that was replaced by a newer one (an archived ruleset) still plays exactly as it did, from its
// lock's values. Pure: callers pass parsed JSON, nothing is read here.
import {
  RulesError,
  resolveRuleset,
  type ParamValue,
  type Registry,
  type ResolvedRuleset,
  type Ruleset,
} from './loader';

export interface Lock {
  $schema?: string;
  id: string;
  version: string;
  notes?: string;
  /** Every non-deprecated parameter of the ruleset's player count, as the ruleset resolved it. */
  values: Record<string, ParamValue>;
}

/** The rulesets in rules/: current versions, archived (deprecated) versions, and their locks. */
export interface RulesetLibrary {
  current: readonly Ruleset[];
  archived: readonly Ruleset[];
  locks: readonly Lock[];
}

export type LockProblem =
  | { kind: 'changed'; key: string; locked: ParamValue; now: ParamValue }
  | { kind: 'lost'; key: string; locked: ParamValue }
  | { kind: 'new'; key: string; now: ParamValue };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const show = (v: unknown) => JSON.stringify(v);

/** Candidate and Official rulesets are locked; earlier statuses may still change freely. */
export const isLocked = (ruleset: Pick<Ruleset, 'status'>): boolean =>
  ruleset.status === 'candidate' || ruleset.status === 'official';

/** The lock of a resolved ruleset: its id, version and every resolved value. */
export function lockOf(resolved: ResolvedRuleset): Lock {
  const { id, version } = resolved.ruleset;
  return { id, version, values: { ...resolved.values } };
}

/** How a ruleset's resolved values differ from its lock; empty when they match exactly. */
export function diffLock(lock: Lock, resolved: ResolvedRuleset): LockProblem[] {
  const problems: LockProblem[] = [];
  for (const [key, locked] of Object.entries(lock.values)) {
    if (!(key in resolved.values)) problems.push({ kind: 'lost', key, locked });
    else if (!same(locked, resolved.values[key])) {
      problems.push({ kind: 'changed', key, locked, now: resolved.values[key]! });
    }
  }
  for (const [key, now] of Object.entries(resolved.values)) {
    if (!(key in lock.values)) problems.push({ kind: 'new', key, now });
  }
  return problems;
}

/** A problem as one line that names the ruleset and version. */
export function describeProblem(lock: Pick<Lock, 'id' | 'version'>, p: LockProblem): string {
  const who = `${lock.id} ${lock.version}`;
  switch (p.kind) {
    case 'changed':
      return `${who}: ${p.key} was ${show(p.locked)}, now ${show(p.now)}`;
    case 'lost':
      return `${who}: ${p.key} (${show(p.locked)}) is no longer a live parameter`;
    case 'new':
      return `${who}: ${p.key} is new (${show(p.now)}), not in the lock`;
  }
}

/**
 * An archived ruleset as its lock says it played: the lock's values, not today's registry
 * defaults or the file's overrides. The lock must cover every live parameter, so a parameter added
 * since is recorded in the lock first (the lock test fails until it is). Keys the registry has
 * since deprecated stay, so the game still replays as it was.
 */
export function resolveLocked(registry: Registry, ruleset: Ruleset, lock: Lock): ResolvedRuleset {
  if (lock.id !== ruleset.id || lock.version !== ruleset.version) {
    throw new RulesError(
      `Lock ${lock.id} ${lock.version} does not belong to ruleset ${ruleset.id} ${ruleset.version}`,
    );
  }
  const missing = registry.parameters
    .filter((p) => p.status !== 'deprecated' && p.players.includes(ruleset.players) && !(p.id in lock.values))
    .map((p) => p.id);
  if (missing.length > 0) {
    throw new RulesError(`Lock ${lock.id} ${lock.version} does not record parameters`, missing);
  }
  const values = { ...lock.values };
  const nulls = Object.keys(values).filter((k) => values[k] === null);
  return { ruleset, values, nulls };
}

/**
 * The ruleset with this id and version. Without a version, the current one. A version that is no
 * longer current is found among the archived ones.
 */
export function findRulesetVersion(
  library: Pick<RulesetLibrary, 'current' | 'archived'>,
  id: string,
  version?: string,
): Ruleset | undefined {
  const current = library.current.find((r) => r.id === id);
  if (current && (version === undefined || current.version === version)) return current;
  if (version === undefined) return undefined;
  return library.archived.find((r) => r.id === id && r.version === version);
}

/**
 * Resolve a ruleset version: the current version from the registry (a lock test keeps that equal to
 * its lock), an archived version from its lock.
 */
export function resolveVersion(
  registry: Registry,
  library: RulesetLibrary,
  id: string,
  version?: string,
): ResolvedRuleset {
  const ruleset = findRulesetVersion(library, id, version);
  if (!ruleset) {
    throw new RulesError(`No ruleset ${id}${version === undefined ? '' : ` ${version}`}`);
  }
  if (library.current.includes(ruleset)) {
    const known = Object.fromEntries(library.current.map((r) => [r.id, r]));
    return resolveRuleset(registry, ruleset, known);
  }
  const lock = library.locks.find((l) => l.id === id && l.version === ruleset.version);
  if (!lock) throw new RulesError(`Archived ruleset ${id} ${ruleset.version} has no lock`);
  return resolveLocked(registry, ruleset, lock);
}
