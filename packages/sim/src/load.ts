// Rules data from the repository's rules/ directory: the parameter registry, the board and
// pieces, and the named rulesets, resolved into what the engine plays.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveRuleset,
  resolveVersion,
  RulesError,
  validateBoardAndPieces,
  type BoardAndPieces,
  type Lock,
  type MoveRules,
  type Registry,
  type Ruleset,
  type RulesetLibrary,
} from '@chess9s/engine';

export interface RulesSource {
  registry: Registry;
  set: BoardAndPieces;
  /** The current version of each ruleset, by id. */
  rulesets: Record<string, Ruleset>;
  /** Earlier versions kept in rules/rulesets/archive/ (deprecated; they play from their locks). */
  archived: Ruleset[];
  /** rules/locks/: the resolved values of each Candidate or Official version. */
  locks: Lock[];
}

const readJson = (root: string, path: string): unknown =>
  JSON.parse(readFileSync(join(root, path), 'utf8'));
const jsonIn = (root: string, dir: string): unknown[] =>
  (existsSync(join(root, dir)) ? readdirSync(join(root, dir)) : [])
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(root, `${dir}/${f}`));

/** The registry and the rulesets with their archive and locks: all a lock check needs. */
export function loadLibrary(root: string): { registry: Registry; library: RulesetLibrary } {
  const registry = readJson(root, 'rules/parameters.json') as Registry;
  const library: RulesetLibrary = {
    current: jsonIn(root, 'rules/rulesets') as Ruleset[],
    archived: jsonIn(root, 'rules/rulesets/archive') as Ruleset[],
    locks: jsonIn(root, 'rules/locks') as Lock[],
  };
  return { registry, library };
}

export function loadSource(root: string): RulesSource {
  const { registry, library } = loadLibrary(root);
  const set = validateBoardAndPieces(
    readJson(root, 'rules/boards/standard-9x9.json'),
    jsonIn(root, 'rules/pieces'),
    registry,
  );
  const rulesets: Record<string, Ruleset> = {};
  for (const rs of library.current) rulesets[rs.id] = rs;
  return { registry, set, rulesets, archived: [...library.archived], locks: [...library.locks] };
}

/**
 * A ruleset with `overrides` on top of its own, resolved for the engine. With a `version` that is
 * no longer current, the archived version plays from its lock's values (no overrides allowed).
 */
export function rulesFor(
  source: RulesSource,
  id: string,
  overrides: Record<string, unknown> = {},
  version?: string,
): { rules: MoveRules; ruleset: { id: string; version: string } } {
  const base = source.rulesets[id];
  if (version !== undefined && base?.version !== version) {
    if (Object.keys(overrides).length > 0) {
      throw new RulesError(`Ruleset ${id} ${version} is archived: its values are locked`);
    }
    const library = {
      current: Object.values(source.rulesets),
      archived: source.archived,
      locks: source.locks,
    };
    const { values, ruleset } = resolveVersion(source.registry, library, id, version);
    return {
      rules: { ...source.set, values, players: ruleset.players },
      ruleset: { id, version },
    };
  }
  if (!base) throw new RulesError(`No ruleset ${id} in rules/rulesets`);
  const { values } = resolveRuleset(
    source.registry,
    { ...base, overrides: { ...base.overrides, ...overrides } },
    source.rulesets,
  );
  return {
    rules: { ...source.set, values, players: base.players },
    ruleset: { id, version: base.version },
  };
}
