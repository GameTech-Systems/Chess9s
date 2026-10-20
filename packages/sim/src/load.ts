// Rules data from the repository's rules/ directory: the parameter registry, the board and
// pieces, and the named rulesets, resolved into what the engine plays.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveRuleset,
  RulesError,
  validateBoardAndPieces,
  type BoardAndPieces,
  type MoveRules,
  type Registry,
  type Ruleset,
} from '@chess9s/engine';

export interface RulesSource {
  registry: Registry;
  set: BoardAndPieces;
  rulesets: Record<string, Ruleset>;
}

export function loadSource(root: string): RulesSource {
  const read = (path: string): unknown => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const json = (dir: string) =>
    readdirSync(join(root, dir))
      .filter((f) => f.endsWith('.json'))
      .map((f) => read(`${dir}/${f}`));
  const registry = read('rules/parameters.json') as Registry;
  const set = validateBoardAndPieces(
    read('rules/boards/standard-9x9.json'),
    json('rules/pieces'),
    registry,
  );
  const rulesets: Record<string, Ruleset> = {};
  for (const rs of json('rules/rulesets') as Ruleset[]) rulesets[rs.id] = rs;
  return { registry, set, rulesets };
}

/** A ruleset with `overrides` on top of its own, resolved for the engine. */
export function rulesFor(
  source: RulesSource,
  id: string,
  overrides: Record<string, unknown> = {},
): { rules: MoveRules; ruleset: { id: string; version: string } } {
  const base = source.rulesets[id];
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
