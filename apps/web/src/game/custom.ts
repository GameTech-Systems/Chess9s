// The ruleset builder (S41): pure functions over a draft. The draft holds every value of a
// 2-player ruleset; a control changes one value through `builderReducer`, which accepts only
// what the registry lists as an option. A custom ruleset is saved in the player's browser only,
// as its name, the preset it started from and its full overrides (every value that differs from
// the registry default), so a saved game replays without anything else.
import { parameterInteractions, unbuiltFeatures, type ParamValue } from '@chess9s/engine';
import registry from '../../../../rules/parameters.json';
import type { Store } from './guest';
import {
  DEFAULT_RULESET_ID,
  createRulesFor,
  customInfo,
  customValues,
  listRulesets,
  overridesOf,
  rulesetValues,
  same,
  settingsFor,
  type CustomRuleset,
  type Setting,
} from './rules';

export type Values = Record<string, ParamValue>;
export type Option = string | number | boolean;

export const CUSTOMS_KEY = 'chess9s.rulesets';
export const MAX_NAME = 40;

/** What the player is editing. `id` is set when an already saved ruleset is being changed. */
export interface BuilderState {
  base: string;
  name: string;
  values: Values;
  id?: string;
}

export type BuilderAction =
  | { type: 'base'; base: string }
  | { type: 'name'; name: string }
  | { type: 'set'; id: string; value: ParamValue }
  | { type: 'step'; id: string; by: 1 | -1 }
  | { type: 'toggle'; id: string; option: Option };

/** The presets a draft can start from: the playable 2-player rulesets in rules/rulesets/. */
export const presets = () => listRulesets().filter((r) => r.playable && r.players === 2);

const isPreset = (id: string) => presets().some((r) => r.id === id);

/** A new draft from a preset, or the saved ruleset being edited. */
export function startBuilder(
  base: string = DEFAULT_RULESET_ID,
  saved?: CustomRuleset,
): BuilderState {
  if (saved) {
    return { base: saved.base, name: saved.name, values: customValues(saved), id: saved.id };
  }
  return { base, name: '', values: { ...rulesetValues(base) } };
}

const settingOf = (values: Values, id: string): Setting | undefined =>
  settingsFor(values).find((s) => s.id === id);

/** Which control a setting gets. Pawn safe zones are two switches; one-option settings are fixed. */
export type ControlKind = 'switch' | 'stepper' | 'choice' | 'multi' | 'safe-zones' | 'fixed';

export function controlKind(s: Setting): ControlKind {
  if (s.options.length < 2) return 'fixed';
  if (s.id === 'pawn.safeZones') return 'safe-zones';
  switch (s.type) {
    case 'boolean':
      return 'switch';
    case 'integer':
      return 'stepper';
    case 'enumSet':
      return 'multi';
    default:
      return 'choice';
  }
}

/** The two safe-zone switches: zones on or off, and (when on) on any colored square. */
export const safeZonesSwitches = (value: ParamValue): { on: boolean; any: boolean } => ({
  on: value !== 'off',
  any: value === 'any-colored-square',
});

export const safeZonesValue = ({ on, any }: { on: boolean; any: boolean }): string =>
  !on ? 'off' : any ? 'any-colored-square' : 'starting-file';

/** The options of an integer setting, lowest first (the registry lists some highest first). */
export const stepOptions = (s: Setting): number[] =>
  (s.options as number[]).slice().sort((a, b) => a - b);

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'base':
      if (!isPreset(action.base)) return state;
      return { ...state, base: action.base, values: { ...rulesetValues(action.base) } };
    case 'name':
      return { ...state, name: action.name };
    case 'set': {
      const s = settingOf(state.values, action.id);
      if (!s || s.type === 'enumSet' || !s.options.includes(action.value as Option)) return state;
      return { ...state, values: { ...state.values, [action.id]: action.value } };
    }
    case 'step': {
      const s = settingOf(state.values, action.id);
      if (!s || s.type !== 'integer') return state;
      const options = stepOptions(s);
      const at = options.indexOf(state.values[action.id] as number);
      const next = options[Math.min(options.length - 1, Math.max(0, at + action.by))]!;
      if (next === state.values[action.id]) return state;
      return { ...state, values: { ...state.values, [action.id]: next } };
    }
    case 'toggle': {
      const s = settingOf(state.values, action.id);
      if (!s || s.type !== 'enumSet' || !s.options.includes(action.option)) return state;
      const now = new Set(state.values[action.id] as Option[]);
      if (!now.delete(action.option)) now.add(action.option);
      // Keep the registry's order, so a set that is the default compares equal to it.
      const value = s.options.filter((o) => now.has(o));
      return { ...state, values: { ...state.values, [action.id]: value } };
    }
  }
}

export interface Difference {
  id: string;
  label: string;
  /** The value in the starting preset, as players read it. */
  from: string;
  to: string;
}

/** Every setting whose value differs from the starting preset's, in registry order. */
export function differences(base: Values, values: Values): Difference[] {
  const was = new Map(settingsFor(base).map((s) => [s.id, s]));
  return settingsFor(values)
    .filter((s) => !same(s.value, was.get(s.id)?.value))
    .map((s) => ({
      id: s.id,
      label: s.label,
      from: was.get(s.id)?.valueLabel ?? 'Not set',
      to: s.valueLabel,
    }));
}

export interface Flag {
  a: string;
  b: string;
  aLabel: string;
  bLabel: string;
  /** The systems both settings affect. */
  shared: string[];
}

/**
 * Pairs of settings that share an `affects` system and have not been fairness-checked together:
 * both are off the registry default, and at least one differs from the starting preset (a preset's
 * own pairs were checked, or are flagged by its status).
 */
export function flaggedInteractions(base: Values, values: Values): Flag[] {
  const off = new Set(
    settingsFor(values)
      .filter((s) => s.changed)
      .map((s) => s.id),
  );
  const moved = new Set(differences(base, values).map((d) => d.id));
  const label = new Map(settingsFor(values).map((s) => [s.id, s.label]));
  return parameterInteractions(registry, 2)
    .filter((i) => off.has(i.a) && off.has(i.b) && (moved.has(i.a) || moved.has(i.b)))
    .map((i) => ({
      a: i.a,
      b: i.b,
      aLabel: label.get(i.a) ?? i.a,
      bLabel: label.get(i.b) ?? i.b,
      shared: i.shared,
    }));
}

/** Features a draft switches on that this build does not play yet. */
export function unbuiltIn(values: Values): string[] {
  const info = customInfo({ id: 'custom-draft', name: 'Draft', overrides: overridesOf(values) });
  return unbuiltFeatures(createRulesFor(info)).map((f) => f.label);
}

/** Why a name cannot be used, or null. */
export function nameProblem(name: string): string | null {
  const n = name.trim();
  if (n === '') return 'Give the ruleset a name.';
  if (n.length > MAX_NAME) return `A name is at most ${MAX_NAME} characters.`;
  return null;
}

/** The ruleset to save: proposed, named by the player, with the full overrides. */
export function customFrom(state: BuilderState, id: string): CustomRuleset {
  const problem = nameProblem(state.name);
  if (problem) throw new Error(problem);
  return { id, name: state.name.trim(), base: state.base, overrides: overridesOf(state.values) };
}

/** The lowest `custom-<n>` not in use. */
export function newCustomId(taken: string[]): string {
  let n = 1;
  while (taken.includes(`custom-${n}`)) n++;
  return `custom-${n}`;
}

const ID = /^custom-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** One saved entry if it is sound: its overrides resolve against the registry; else undefined. */
function sound(raw: unknown): CustomRuleset | undefined {
  if (!isRecord(raw) || !isRecord(raw.overrides)) return undefined;
  const { id, name, base } = raw;
  if (typeof id !== 'string' || !ID.test(id)) return undefined;
  if (typeof name !== 'string' || nameProblem(name) !== null) return undefined;
  const entry: CustomRuleset = {
    id,
    name,
    base: typeof base === 'string' && isPreset(base) ? base : DEFAULT_RULESET_ID,
    overrides: raw.overrides as Values,
  };
  try {
    customValues(entry);
  } catch {
    return undefined;
  }
  return entry;
}

/** The custom rulesets kept in this browser; anything damaged is left out. */
export function loadCustoms(store: Store | null): CustomRuleset[] {
  try {
    const raw = store?.getItem(CUSTOMS_KEY);
    if (!raw) return [];
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || saved.v !== 1 || !Array.isArray(saved.rulesets)) return [];
    const out: CustomRuleset[] = [];
    for (const item of saved.rulesets) {
      const c = sound(item);
      if (c && !out.some((o) => o.id === c.id)) out.push(c);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveCustoms(store: Store | null, list: CustomRuleset[]): void {
  try {
    if (!store) return;
    if (list.length === 0) store.removeItem(CUSTOMS_KEY);
    else store.setItem(CUSTOMS_KEY, JSON.stringify({ v: 1, rulesets: list }));
  } catch {
    // Storage blocked or full: the ruleset can still be played this visit, just not kept.
  }
}
