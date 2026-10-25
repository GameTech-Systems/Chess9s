// The rules a hot-seat game plays: the real board, pieces and a ruleset from rules/, validated
// and resolved by the engine when the game starts. Nothing is read from here but data.
import {
  resolveRuleset,
  validateBoardAndPieces,
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
}

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

/** Every ruleset in rules/rulesets/: the default first, then 2-player, then 3-player. */
export function listRulesets(): RulesetInfo[] {
  return files.map(infoOf);
}

/** The ruleset with this id, or undefined. */
export function findRuleset(id: string): RulesetInfo | undefined {
  const file = files.find((r) => r.id === id);
  return file && infoOf(file);
}

/** The default ruleset, as recorded with a game. */
export const ruleset: RulesetInfo = infoOf(files.find((r) => r.id === DEFAULT_RULESET_ID)!);

export function createRules(id: string = DEFAULT_RULESET_ID): MoveRules {
  const file = files.find((r) => r.id === id);
  if (!file) throw new Error(`Unknown ruleset: ${id}`);
  if (!infoOf(file).playable) throw new Error(`Ruleset ${id} is not playable yet`);
  const resolved = resolveRuleset(registry, file);
  const set = validateBoardAndPieces(board, Object.values(pieceFiles), registry as Registry);
  return { ...set, values: resolved.values, players: 2 };
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
  /** The ruleset sets a value other than the registry default. */
  changed: boolean;
  notes?: string | undefined;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Every live parameter for the ruleset's player count, in registry order, with the value the
 * ruleset plays. Read from the data only.
 */
export function rulesetSettings(id: string): Setting[] {
  const file = files.find((r) => r.id === id);
  if (!file) throw new Error(`Unknown ruleset: ${id}`);
  const { values } = resolveRuleset(registry, file);
  return (registry as Registry).parameters
    .filter((p) => p.status !== 'deprecated' && p.players.includes(file.players))
    .map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description ?? '',
      type: p.type,
      value: values[p.id] ?? null,
      defaultValue: p.default,
      options: p.options,
      changed: !same(values[p.id], p.default),
      notes: p.notes,
    }));
}
