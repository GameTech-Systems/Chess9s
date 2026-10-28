// Parameter combinations for a sweep (decision 0008): the ruleset as it is, then one parameter
// for the ruleset's player count changed at a time to each of its other options. An enumSet
// changes by one option, removed or added. An option that requires other values (`requires` in
// the registry, such as endings.3p = first-checkmate) brings them with it.
import {
  newGame,
  RulesError,
  unbuiltFeatures,
  type ParamValue,
  type Registry,
} from '@chess9s/engine';
import { rulesFor, type RulesSource } from './load';

export interface Combination {
  /** `default`, `id=value`, or for an enumSet `id+option` / `id-option`. */
  id: string;
  overrides: Record<string, unknown>;
}

/** `values` are the ruleset's resolved values; only parameters in it are varied. */
export function combinations(
  registry: Registry,
  values: Record<string, ParamValue>,
  players: 2 | 3 = 2,
): Combination[] {
  const all: Combination[] = [{ id: 'default', overrides: {} }];
  for (const p of registry.parameters) {
    if (p.status === 'deprecated' || !p.players.includes(players) || !(p.id in values)) continue;
    const current = values[p.id];
    if (p.type === 'enumSet') {
      const set = Array.isArray(current) ? current : [];
      for (const option of p.options) {
        const has = set.includes(option);
        const next = has
          ? set.filter((x) => x !== option)
          : p.options.filter((x) => x === option || set.includes(x));
        all.push({ id: `${p.id}${has ? '-' : '+'}${String(option)}`, overrides: { [p.id]: next } });
      }
      continue;
    }
    for (const option of p.options) {
      if (option !== current) {
        const needs = p.requires?.[String(option)] ?? {};
        all.push({ id: `${p.id}=${String(option)}`, overrides: { [p.id]: option, ...needs } });
      }
    }
  }
  return all;
}

/**
 * Why a combination can't be played yet, or undefined when it can. Features in `known` are left
 * out: those not built yet in the ruleset as it is (S59: `coast.3p.exit` in every 3-player game).
 */
export function playable(
  source: RulesSource,
  rulesetId: string,
  overrides: Record<string, unknown>,
  known: ReadonlySet<string> = new Set(),
): string | undefined {
  try {
    const { rules, ruleset } = rulesFor(source, rulesetId, overrides);
    const unbuilt = unbuiltFeatures(rules).filter((f) => !known.has(f.id));
    if (unbuilt.length > 0) return `not built yet: ${unbuilt.map((f) => f.id).join(', ')}`;
    newGame(rules, ruleset);
    return undefined;
  } catch (e) {
    if (e instanceof RulesError) return e.message;
    throw e;
  }
}
