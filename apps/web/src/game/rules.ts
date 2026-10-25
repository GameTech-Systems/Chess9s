// The rules a hot-seat game plays: the real board, pieces and a ruleset from rules/, validated
// and resolved by the engine when the game starts. Nothing is read from here but data.
import {
  findRulesetVersion,
  resolveRuleset,
  resolveVersion,
  validateBoardAndPieces,
  type Lock,
  type MoveRules,
  type ParamValue,
  type Registry,
  type Ruleset,
} from '@chess9s/engine';
import board from '../../../../rules/boards/standard-9x9.json';
import registry from '../../../../rules/parameters.json';

const pieceFiles = import.meta.glob<unknown>('../../../../rules/pieces/*.json', {
  eager: true,
  import: 'default',
});

const rulesetFiles = import.meta.glob<Ruleset>('../../../../rules/rulesets/*.json', {
  eager: true,
  import: 'default',
});

// Earlier versions of a Candidate or Official ruleset (deprecated) and the locks they play from.
const archiveFiles = import.meta.glob<Ruleset>('../../../../rules/rulesets/archive/*.json', {
  eager: true,
  import: 'default',
});

const lockFiles = import.meta.glob<Lock>('../../../../rules/locks/*.json', {
  eager: true,
  import: 'default',
});

/** The ruleset a new game starts on until another is picked (owner, 24 Oct 2026). */
export const DEFAULT_RULESET_ID = 'standard-2p';

/** What the picker shows about a ruleset, and what is recorded with a game. */
export interface RulesetInfo {
  id: string;
  version: string;
  name: string;
  status: Ruleset['status'];
  players: 2 | 3;
  description: string;
  /** False while the engine cannot play the player count (it plays 2 players only). */
  playable: boolean;
  /** The ruleset a new game starts on. */
  isDefault: boolean;
  /** An earlier version, kept so games recorded under it replay; it plays from its lock's values. */
  archived?: true;
  /** A ruleset a player built, kept in their browser (not in rules/rulesets/). */
  custom?: true;
  /** A custom ruleset's full overrides: every value that differs from the registry default. */
  overrides?: Record<string, ParamValue>;
}

/** What is saved of a player's custom ruleset (S41). Its status is always `proposed`. */
export interface CustomRuleset {
  id: string;
  name: string;
  /** The preset it was started from (for the "what differs" list only). */
  base: string;
  overrides: Record<string, ParamValue>;
}

/** Custom rulesets have no versions of their own: a changed ruleset has different overrides. */
export const CUSTOM_VERSION = '1.0.0';

const customFile = (c: Pick<CustomRuleset, 'id' | 'name' | 'overrides'>): Ruleset => ({
  id: c.id,
  name: c.name,
  version: CUSTOM_VERSION,
  status: 'proposed',
  players: 2,
  description: 'A ruleset built by the player. Not fairness-checked; not a tournament ruleset.',
  overrides: c.overrides,
});

/** The picker's and the game's view of a custom ruleset. */
export const customInfo = (c: Pick<CustomRuleset, 'id' | 'name' | 'overrides'>): RulesetInfo => ({
  ...infoOf(customFile(c)),
  custom: true,
  overrides: { ...c.overrides },
});

const infoOf = (r: Ruleset): RulesetInfo => ({
  id: r.id,
  version: r.version,
  name: r.name,
  status: r.status,
  players: r.players,
  description: r.description ?? '',
  playable: r.players === 2,
  isDefault: r.id === DEFAULT_RULESET_ID,
});

// The default first, then by player count, then by name.
const files = Object.values(rulesetFiles).sort(
  (a, b) =>
    Number(b.id === DEFAULT_RULESET_ID) - Number(a.id === DEFAULT_RULESET_ID) ||
    a.players - b.players ||
    a.name.localeCompare(b.name),
);

const library = {
  current: files,
  archived: Object.values(archiveFiles),
  locks: Object.values(lockFiles),
};

/** The current version of every ruleset in rules/rulesets/: the default first, then 2-player, then 3-player. */
export function listRulesets(): RulesetInfo[] {
  return files.map(infoOf);
}

/**
 * The ruleset with this id, or undefined. Without a version, the current one; with one, that
 * exact version, which may be an archived one (not listed in the picker).
 */
export function findRuleset(id: string, version?: string): RulesetInfo | undefined {
  const file = findRulesetVersion(library, id, version);
  if (!file) return undefined;
  return library.archived.includes(file) ? { ...infoOf(file), archived: true } : infoOf(file);
}

/** The default ruleset, as recorded with a game. */
export const ruleset: RulesetInfo = infoOf(files.find((r) => r.id === DEFAULT_RULESET_ID)!);

function rulesOf(file: Ruleset): MoveRules {
  const resolved = resolveRuleset(registry, file);
  return rulesWith(resolved.values);
}

function rulesWith(values: Record<string, ParamValue>): MoveRules {
  const set = validateBoardAndPieces(board, Object.values(pieceFiles), registry as Registry);
  return { ...set, values, players: 2 };
}

/** The rules of a bundled ruleset: the current version, or an archived one from its lock. */
export function createRules(id: string = DEFAULT_RULESET_ID, version?: string): MoveRules {
  const file = findRulesetVersion(library, id, version);
  if (!file) throw new Error(`Unknown ruleset: ${id}${version === undefined ? '' : ` ${version}`}`);
  if (!infoOf(file).playable) throw new Error(`Ruleset ${id} is not playable yet`);
  if (library.archived.includes(file))
    return rulesWith(resolveVersion(registry as Registry, library, id, version).values);
  return rulesOf(file);
}

/** The rules of a ruleset as the game records it: a bundled id, or a custom ruleset's overrides. */
export function createRulesFor(
  ref: Pick<RulesetInfo, 'id' | 'name' | 'overrides'> & { version?: string },
): MoveRules {
  return ref.overrides
    ? rulesOf(customFile({ ...ref, overrides: ref.overrides }))
    : createRules(ref.id, ref.version);
}

/** Every value of a bundled ruleset, resolved (an archived version from its lock). */
export function rulesetValues(id: string, version?: string): Record<string, ParamValue> {
  if (!findRulesetVersion(library, id, version)) {
    throw new Error(`Unknown ruleset: ${id}${version === undefined ? '' : ` ${version}`}`);
  }
  return resolveVersion(registry as Registry, library, id, version).values;
}

/** The values a custom ruleset plays: the registry defaults with its overrides. */
export const customValues = (c: Pick<CustomRuleset, 'id' | 'name' | 'overrides'>) =>
  resolveRuleset(registry, customFile(c)).values;

/** The registry defaults that the given values differ from: a custom ruleset's overrides. */
export function overridesOf(values: Record<string, ParamValue>): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of (registry as Registry).parameters) {
    if (p.status === 'deprecated' || !p.players.includes(2) || !(p.id in values)) continue;
    if (!same(values[p.id], p.default)) out[p.id] = values[p.id]!;
  }
  return out;
}

/** One parameter as a ruleset plays it, for the rules screen and page. */
export interface Setting {
  id: string;
  label: string;
  description: string;
  type: string;
  value: ParamValue;
  /** The registry's default (rules/parameters.json). */
  defaultValue: ParamValue;
  options: (string | number | boolean)[];
  /** The registry group it is listed under. */
  group: string;
  /** The value as players read it, from the registry's option labels. */
  valueLabel: string;
  /** The default as players read it. */
  defaultLabel: string;
  /** The ruleset sets a value other than the registry default. */
  changed: boolean;
  /** The parameter's option labels, keyed by String(option). */
  optionLabels: Record<string, string>;
  /** The systems it affects (docs/RULES-FRAMEWORK.md). */
  affects: string[];
  notes?: string | undefined;
}

/** One value as players read it: its option label, a list for sets, "Not set" for null. */
function labelOf(p: Registry['parameters'][number], value: ParamValue | undefined): string {
  if (value === null || value === undefined) return 'Not set';
  const name = (v: string | number | boolean) => p.optionLabels?.[String(v)] ?? String(v);
  if (Array.isArray(value)) return value.length === 0 ? 'None' : value.map(name).join(', ');
  return name(value as string | number | boolean);
}

export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Every live parameter for a player count, in registry order, with the given values. */
export function settingsFor(values: Record<string, ParamValue>, players: 2 | 3 = 2): Setting[] {
  return (registry as Registry).parameters
    .filter((p) => p.status !== 'deprecated' && p.players.includes(players))
    .map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description ?? '',
      type: p.type,
      value: values[p.id] ?? null,
      defaultValue: p.default,
      options: p.options,
      group: p.group ?? 'Other',
      valueLabel: labelOf(p, values[p.id]),
      defaultLabel: labelOf(p, p.default),
      changed: !same(values[p.id], p.default),
      optionLabels: p.optionLabels ?? {},
      affects: p.affects ?? [],
      notes: p.notes,
    }));
}

/**
 * Every live parameter for the ruleset's player count, in registry order, with the value the
 * ruleset plays. Read from the data only. A custom ruleset is given as its info.
 */
export function rulesetSettings(
  id: string | (Pick<RulesetInfo, 'id' | 'name' | 'overrides'> & { version?: string }),
): Setting[] {
  if (typeof id !== 'string' && id.overrides)
    return settingsFor(customValues({ ...id, overrides: id.overrides }));
  const key = typeof id === 'string' ? id : id.id;
  const version = typeof id === 'string' ? undefined : id.version;
  const file = findRulesetVersion(library, key, version);
  if (!file)
    throw new Error(`Unknown ruleset: ${key}${version === undefined ? '' : ` ${version}`}`);
  return settingsFor(rulesetValues(key, version), file.players);
}
