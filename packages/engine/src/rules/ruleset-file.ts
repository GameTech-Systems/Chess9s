// A ruleset file from outside the repository (S42, S43): one a player exported from the builder,
// or one submitted for tournament consideration. The web app loads it and the sim checks it, both
// here, so a file is read with the same strictness everywhere: size-capped, checked key by key,
// 2-player only unless the caller accepts 3 (the web builder does, D64), no `extends`, and every override resolved against the registry (no new
// parameters). The file's own id and status are never trusted: a file is always `proposed`.
import { RulesError, resolveRuleset, type ParamValue, type Ruleset } from './loader';

export const MAX_RULESET_FILE_BYTES = 20_000;
/** The id a file is resolved under; a file's own id is ignored. */
const FILE_ID = 'ruleset-file';
const DEFAULT_VERSION = '1.0.0';

const FILE_KEYS = new Set([
  '$schema',
  'id',
  'name',
  'version',
  'status',
  'players',
  'description',
  'overrides',
]);

export type RulesetFile =
  | {
      ok: true;
      name: string;
      version: string;
      players: 2 | 3;
      overrides: Record<string, ParamValue>;
      /** Every parameter of the file's player count, resolved. */
      values: Record<string, ParamValue>;
    }
  | { ok: false; problem: string };

const refuse = (problem: string): RulesetFile => ({ ok: false, problem });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A name and overrides, resolved for a game of `players`, or why they cannot be used. */
export function resolveFileOverrides(
  registry: unknown,
  name: string,
  overrides: Record<string, unknown>,
  version = DEFAULT_VERSION,
  players: 2 | 3 = 2,
): RulesetFile {
  const ruleset: Ruleset = {
    id: FILE_ID,
    name,
    version,
    status: 'proposed',
    players,
    overrides,
  };
  try {
    const { values } = resolveRuleset(registry, ruleset);
    return { ok: true, name, version, players, overrides: overrides as Record<string, ParamValue>, values };
  } catch (e) {
    const detail =
      e instanceof RulesError
        ? e.issues.map((i) => i.replace(new RegExp(`^${FILE_ID}: `), '')).join('; ')
        : 'it could not be read';
    return refuse(`These settings do not fit this game: ${detail}.`);
  }
}

/**
 * A ruleset file's name, overrides and resolved values, or why it cannot be used. Only the
 * player counts in `accept` are read (2-player by default: tournament files, the sim).
 */
export function readRulesetFile(
  text: string,
  registry: unknown,
  accept: readonly (2 | 3)[] = [2],
): RulesetFile {
  if (new TextEncoder().encode(text).length > MAX_RULESET_FILE_BYTES) {
    return refuse(
      `The file is too large for a ruleset (over ${MAX_RULESET_FILE_BYTES / 1000} KB).`,
    );
  }
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return refuse('This is not a ruleset file: it is not valid JSON.');
  }
  if (!isRecord(file)) return refuse('This is not a ruleset file.');
  if ('extends' in file) return refuse('A ruleset file cannot use “extends”.');
  const stray = Object.keys(file).find((k) => !FILE_KEYS.has(k));
  if (stray) return refuse(`The file has a field a ruleset does not have: “${stray}”.`);
  const players = accept.find((n) => n === file.players);
  if (players === undefined) {
    return refuse(
      accept.length === 1
        ? `Only ${accept[0]}-player rulesets can be loaded.`
        : 'Only 2-player and 3-player rulesets can be loaded.',
    );
  }
  if (typeof file.name !== 'string' || file.name.trim() === '') {
    return refuse('The ruleset has no name.');
  }
  const version = file.version ?? DEFAULT_VERSION;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    return refuse('The file’s version must look like 1.0.0.');
  }
  if (!isRecord(file.overrides)) return refuse('The file has no “overrides” object.');
  if (Object.keys(file.overrides).includes('__proto__')) {
    return refuse('The file names a setting this game does not have: “__proto__”.');
  }
  return resolveFileOverrides(registry, file.name.trim(), file.overrides, version, players);
}
