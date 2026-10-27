// The rules library (S51): the board, pieces, registry, rulesets, archived versions and locks
// assembled from the files of rules/, which the caller supplies keyed by their path under rules/
// ("parameters.json", "pieces/king.json", "rulesets/archive/x@1.0.0.json"). The web app feeds it
// from Vite's import.meta.glob, the online server from a static index (`pnpm rules:index`), so
// nothing here reads a file system. Files it does not use (the schemas) are ignored.
import type { MoveRules } from '../moves/generate';
import { validateBoardAndPieces, type BoardAndPieces } from './formats';
import { RulesError, type ParamValue, type Registry, type Ruleset } from './loader';
import { findRulesetVersion, resolveVersion, type Lock, type RulesetLibrary } from './locks';

/** Parsed JSON files of rules/, keyed by their path under rules/. */
export type RulesFiles = Readonly<Record<string, unknown>>;

/** The board every ruleset plays on (there is one board so far). */
export const BOARD_FILE = 'boards/standard-9x9.json';
const REGISTRY_FILE = 'parameters.json';

export interface RulesData {
  registry: Registry;
  library: RulesetLibrary;
  /** The ruleset with this id (and version), and whether it is an archived version. */
  find(id: string, version?: string): { ruleset: Ruleset; archived: boolean } | undefined;
  /** Every value of a ruleset, resolved; an archived version from its lock. */
  values(id: string, version?: string): Record<string, ParamValue>;
  /** The rules a game plays on a ruleset, for its own player count. Refuses an unknown ruleset. */
  rules(id: string, version?: string): MoveRules;
  /** The rules of a game with these values (a custom ruleset, already resolved); 2 players by default. */
  rulesWith(values: Record<string, ParamValue>, players?: 2 | 3): MoveRules;
}

const filesIn = <T>(files: RulesFiles, dir: RegExp): T[] =>
  Object.keys(files)
    .filter((path) => dir.test(path))
    .sort()
    .map((path) => files[path] as T);

const named = (id: string, version?: string) =>
  `${id}${version === undefined ? '' : ` ${version}`}`;

export function loadRules(files: RulesFiles): RulesData {
  const registry = files[REGISTRY_FILE] as Registry | undefined;
  if (!registry) throw new RulesError(`The rules files have no ${REGISTRY_FILE}`);
  const library: RulesetLibrary = {
    current: filesIn<Ruleset>(files, /^rulesets\/[^/]+\.json$/),
    archived: filesIn<Ruleset>(files, /^rulesets\/archive\/[^/]+\.json$/),
    locks: filesIn<Lock>(files, /^locks\/[^/]+\.json$/),
  };

  // Validated on the first game, so a broken file shows when a game starts, not on import.
  let set: BoardAndPieces | undefined;
  const boardAndPieces = (): BoardAndPieces => {
    if (set) return set;
    const board = files[BOARD_FILE];
    if (!board) throw new RulesError(`The rules files have no ${BOARD_FILE}`);
    set = validateBoardAndPieces(board, filesIn(files, /^pieces\/[^/]+\.json$/), registry);
    return set;
  };

  const find: RulesData['find'] = (id, version) => {
    const ruleset = findRulesetVersion(library, id, version);
    return ruleset && { ruleset, archived: library.archived.includes(ruleset) };
  };

  const values: RulesData['values'] = (id, version) => {
    if (!find(id, version)) throw new RulesError(`Unknown ruleset: ${named(id, version)}`);
    return resolveVersion(registry, library, id, version).values;
  };

  const rulesWith: RulesData['rulesWith'] = (v, players = 2) => ({
    ...boardAndPieces(),
    values: v,
    players,
  });

  return {
    registry,
    library,
    find,
    values,
    rulesWith,
    rules(id, version) {
      const found = find(id, version);
      if (!found) throw new RulesError(`Unknown ruleset: ${named(id, version)}`);
      return rulesWith(values(id, version), found.ruleset.players);
    },
  };
}
