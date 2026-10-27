// The rules a hot-seat game plays: the real board, pieces and a ruleset from rules/, validated
// and resolved by the engine when the game starts. Nothing is read from here but data.
import {
  loadRules,
  resolveRuleset,
  type MoveRules,
  type ParamValue,
  type Registry,
  type Ruleset,
} from '@chess9s/engine';
import registry from '../../../../rules/parameters.json';

// Every rules file a game reads, keyed by its path under rules/, for the shared rules library
// (S51). The schemas are left out: the build has already checked the data against them.
const RULES = '../../../../rules/';
const ruleFiles = import.meta.glob<unknown>(
  [
    '../../../../rules/parameters.json',
    '../../../../rules/boards/*.json',
    '../../../../rules/pieces/*.json',
    '../../../../rules/rulesets/**/*.json',
    '../../../../rules/locks/*.json',
  ],
  { eager: true, import: 'default' },
);

const data = loadRules(
  Object.fromEntries(
    Object.entries(ruleFiles).map(([path, file]) => [path.slice(RULES.length), file]),
  ),
);

/** The ruleset a new game starts on until another is picked (owner, 24 Oct 2026). */
export const DEFAULT_RULESET_ID = 'standard-2p';
/** The ruleset that starts 3-player games (D63, owner, 26 Oct 2026). */
export const DEFAULT_3P_RULESET_ID = 'standard-3p';

/** What the picker shows about a ruleset, and what is recorded with a game. */
export interface RulesetInfo {
  id: string;
  version: string;
  name: string;
  status: Ruleset['status'];
  players: 2 | 3;
  description: string;
  /** The engine plays it in hot-seat: every bundled ruleset, 2 or 3 players. */
  playable: boolean;
  /** An online room can play it: 2 players only until S63 adds the 3-seat room. */
  online: boolean;
  /** The ruleset a new game starts on. */
  isDefault: boolean;
  /** Set on the preset that is the default for its player count (2 or 3 players). */
  defaultFor?: 2 | 3;
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
  /** 2 when absent: rulesets saved before 3-player rulesets could be built (S64). */
  players?: 2 | 3;
  overrides: Record<string, ParamValue>;
}

/** Custom rulesets have no versions of their own: a changed ruleset has different overrides. */
export const CUSTOM_VERSION = '1.0.0';

const customFile = (c: Pick<CustomRuleset, 'id' | 'name' | 'overrides' | 'players'>): Ruleset => ({
  id: c.id,
  name: c.name,
  version: CUSTOM_VERSION,
  status: 'proposed',
  players: c.players ?? 2,
  description: 'A ruleset built by the player. Not fairness-checked; not a tournament ruleset.',
  overrides: c.overrides,
});

/** The picker's and the game's view of a custom ruleset. */
export const customInfo = (
  c: Pick<CustomRuleset, 'id' | 'name' | 'overrides' | 'players'>,
): RulesetInfo => ({
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
  playable: true,
  online: r.players === 2,
  isDefault: r.id === DEFAULT_RULESET_ID,
  ...(r.id === DEFAULT_RULESET_ID && { defaultFor: 2 as const }),
  ...(r.id === DEFAULT_3P_RULESET_ID && { defaultFor: 3 as const }),
});

// The 2-player default first, then by player count with each count's default first, then by name.
const isFirst = (r: Ruleset) => r.id === DEFAULT_RULESET_ID || r.id === DEFAULT_3P_RULESET_ID;
const files = [...data.library.current].sort(
  (a, b) =>
    a.players - b.players ||
    Number(isFirst(b)) - Number(isFirst(a)) ||
    a.name.localeCompare(b.name),
);

/** The current version of every ruleset in rules/rulesets/: 2-player, then 3-player, each with its default first. */
export function listRulesets(): RulesetInfo[] {
  return files.map(infoOf);
}

/**
 * The ruleset with this id, or undefined. Without a version, the current one; with one, that
 * exact version, which may be an archived one (not listed in the picker).
 */
export function findRuleset(id: string, version?: string): RulesetInfo | undefined {
  const found = data.find(id, version);
  if (!found) return undefined;
  return found.archived ? { ...infoOf(found.ruleset), archived: true } : infoOf(found.ruleset);
}

/** The default ruleset, as recorded with a game. */
export const ruleset: RulesetInfo = infoOf(files.find((r) => r.id === DEFAULT_RULESET_ID)!);

const rulesOf = (file: Ruleset): MoveRules =>
  data.rulesWith(resolveRuleset(registry, file).values, file.players);

/** The rules of a bundled ruleset: the current version, or an archived one from its lock. */
export const createRules = (id: string = DEFAULT_RULESET_ID, version?: string): MoveRules =>
  data.rules(id, version);

/** The rules of a ruleset as the game records it: a bundled id, or a custom ruleset's overrides. */
export function createRulesFor(
  ref: Pick<RulesetInfo, 'id' | 'name' | 'overrides'> & { version?: string },
): MoveRules {
  return ref.overrides
    ? rulesOf(customFile({ ...ref, overrides: ref.overrides }))
    : createRules(ref.id, ref.version);
}

/** Every value of a bundled ruleset, resolved (an archived version from its lock). */
export const rulesetValues = (id: string, version?: string): Record<string, ParamValue> =>
  data.values(id, version);

/** The values a custom ruleset plays: the registry defaults with its overrides. */
export const customValues = (c: Pick<CustomRuleset, 'id' | 'name' | 'overrides' | 'players'>) =>
  resolveRuleset(registry, customFile(c)).values;

/** The registry defaults that the given values differ from: a custom ruleset's overrides. */
export function overridesOf(
  values: Record<string, ParamValue>,
  players: 2 | 3 = 2,
): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const p of (registry as Registry).parameters) {
    if (p.status === 'deprecated' || !p.players.includes(players) || !(p.id in values)) continue;
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
  id:
    | string
    | (Pick<RulesetInfo, 'id' | 'name' | 'overrides'> & {
        version?: string;
        players?: 2 | 3;
      }),
): Setting[] {
  if (typeof id !== 'string' && id.overrides)
    return settingsFor(customValues({ ...id, overrides: id.overrides }), id.players ?? 2);
  const key = typeof id === 'string' ? id : id.id;
  const version = typeof id === 'string' ? undefined : id.version;
  const found = data.find(key, version);
  if (!found)
    throw new Error(`Unknown ruleset: ${key}${version === undefined ? '' : ` ${version}`}`);
  return settingsFor(rulesetValues(key, version), found.ruleset.players);
}
