// The ruleset builder (S41, S64): pure functions over a draft. The draft holds every value of a
// 2- or 3-player ruleset (which one follows the preset it started from); a control changes one value through `builderReducer`, which accepts only
// what the registry lists as an option. A custom ruleset is saved in the player's browser only,
// as its name, the preset it started from and its full overrides (every value that differs from
// the registry default), so a saved game replays without anything else.
import { parameterInteractions, unbuiltFeatures, type ParamValue } from '@chess9s/engine';
import registry from '../../../../rules/parameters.json';
import type { Store } from './guest';
import {
  DEFAULT_3P_RULESET_ID,
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
  /** The player count of the ruleset being built: that of its starting preset. */
  players: 2 | 3;
  name: string;
  values: Values;
  id?: string;
}

export type BuilderAction =
  | { type: 'base'; base: string }
  | { type: 'name'; name: string }
  | { type: 'set'; id: string; value: ParamValue }
  | { type: 'step'; id: string; by: 1 | -1 }
  | { type: 'toggle'; id: string; option: Option }
  /** A draft that was loaded from a file or a link, already checked. */
  | { type: 'replace'; state: BuilderState };

/** The presets a draft can start from: the playable rulesets in rules/rulesets/ (all 2 players if none is given). */
export const presets = (players: 2 | 3 = 2) =>
  listRulesets().filter((r) => r.playable && r.players === players);

const allPresets = () => listRulesets().filter((r) => r.playable);

const presetOf = (id: string) => allPresets().find((r) => r.id === id);

/** A new draft from a preset, or the saved ruleset being edited. */
export function startBuilder(
  base: string = DEFAULT_RULESET_ID,
  saved?: CustomRuleset,
): BuilderState {
  if (saved) {
    return {
      base: saved.base,
      players: saved.players ?? 2,
      name: saved.name,
      values: customValues(saved),
      id: saved.id,
    };
  }
  return {
    base,
    players: presetOf(base)?.players ?? 2,
    name: '',
    values: { ...rulesetValues(base) },
  };
}

const settingOf = (state: BuilderState, id: string): Setting | undefined =>
  settingsFor(state.values, state.players).find((s) => s.id === id);

type Registered = { id: string; requires?: Record<string, Record<string, ParamValue>> };
const registered = (id: string) =>
  (registry as { parameters: Registered[] }).parameters.find((p) => p.id === id);

/**
 * What a value needs: `requires` in the registry names settings that must take a value for an
 * option to be allowed (the loader refuses a ruleset without them).
 */
const needs = (id: string, value: ParamValue): Record<string, ParamValue> =>
  registered(id)?.requires?.[String(value)] ?? {};

/** The settings a draft holds in place because another one in it needs them, with the reason. */
export function heldSettings(values: Values): { id: string; by: string; label: string }[] {
  const out: { id: string; by: string; label: string }[] = [];
  const label = new Map(settingsFor(values, 3).map((s) => [s.id, s.label]));
  for (const p of (registry as { parameters: Registered[] }).parameters) {
    for (const [option, req] of Object.entries(p.requires ?? {})) {
      if (!(p.id in values) || String(values[p.id]) !== option) continue;
      for (const id of Object.keys(req)) out.push({ id, by: p.id, label: label.get(p.id) ?? p.id });
    }
  }
  return out;
}

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
    case 'replace':
      return action.state;
    case 'base':
      return presetOf(action.base)
        ? {
            ...state,
            base: action.base,
            players: presetOf(action.base)!.players,
            values: { ...rulesetValues(action.base) },
          }
        : state;
    case 'name':
      return { ...state, name: action.name };
    case 'set': {
      const s = settingOf(state, action.id);
      if (!s || s.type === 'enumSet' || !s.options.includes(action.value as Option)) return state;
      // A setting another one needs stays put (the control is disabled and says why).
      const held = heldSettings(state.values).find((h) => h.id === action.id);
      if (held && !same(needs(held.by, state.values[held.by]!)[action.id], action.value)) {
        return state;
      }
      // An option that needs other settings switches them on, so the draft stays one the engine accepts.
      return {
        ...state,
        values: { ...state.values, ...needs(action.id, action.value), [action.id]: action.value },
      };
    }
    case 'step': {
      const s = settingOf(state, action.id);
      if (!s || s.type !== 'integer') return state;
      const options = stepOptions(s);
      const at = options.indexOf(state.values[action.id] as number);
      const next = options[Math.min(options.length - 1, Math.max(0, at + action.by))]!;
      if (next === state.values[action.id]) return state;
      return { ...state, values: { ...state.values, [action.id]: next } };
    }
    case 'toggle': {
      const s = settingOf(state, action.id);
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
export function differences(base: Values, values: Values, players: 2 | 3 = 2): Difference[] {
  const was = new Map(settingsFor(base, players).map((s) => [s.id, s]));
  return settingsFor(values, players)
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
export function flaggedInteractions(base: Values, values: Values, players: 2 | 3 = 2): Flag[] {
  const off = new Set(
    settingsFor(values, players)
      .filter((s) => s.changed)
      .map((s) => s.id),
  );
  const moved = new Set(differences(base, values, players).map((d) => d.id));
  const label = new Map(settingsFor(values, players).map((s) => [s.id, s.label]));
  return parameterInteractions(registry, players)
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
export function unbuiltIn(values: Values, players: 2 | 3 = 2): string[] {
  const info = customInfo({
    id: 'custom-draft',
    name: 'Draft',
    players,
    overrides: overridesOf(values, players),
  });
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
  return {
    id,
    name: state.name.trim(),
    base: state.base,
    ...(state.players === 3 && { players: 3 as const }),
    overrides: overridesOf(state.values, state.players),
  };
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
  const players = raw.players === 3 ? 3 : 2;
  const entry: CustomRuleset = {
    id,
    name,
    base:
      typeof base === 'string' && presetOf(base)?.players === players
        ? base
        : players === 3
          ? DEFAULT_3P_RULESET_ID
          : DEFAULT_RULESET_ID,
    ...(players === 3 && { players: 3 as const }),
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
