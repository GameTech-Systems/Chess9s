// Rules loader: validates the parameter registry and a ruleset against the
// JSON Schemas in rules/schema/, then resolves every parameter for the
// ruleset's player count. Pure: callers pass parsed JSON, nothing is read here.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import parametersSchema from '../../../../rules/schema/parameters.schema.json';
import rulesetSchema from '../../../../rules/schema/ruleset.schema.json';

export type ParamValue = string | number | boolean | null | readonly (string | number | boolean)[];
export type Status = 'proposed' | 'experimental' | 'candidate' | 'official' | 'deprecated';

export interface Parameter {
  id: string;
  label: string;
  description?: string;
  piece: string | null;
  players: (2 | 3)[];
  type: 'integer' | 'boolean' | 'enum' | 'enumSet';
  default: ParamValue;
  options: (string | number | boolean)[];
  status: Status;
  affects?: string[];
  needsDecision?: boolean;
  source?: string;
  notes?: string;
}

export interface Registry {
  $schema?: string;
  version: string;
  parameters: Parameter[];
}

export interface Ruleset {
  $schema?: string;
  id: string;
  name: string;
  version: string;
  status: Status;
  players: 2 | 3;
  description?: string;
  extends?: string;
  overrides: Record<string, unknown>;
  ratification?: { decisionRecord: string; date: string };
}

export interface ResolvedRuleset {
  ruleset: Ruleset;
  /** Every non-deprecated parameter for the ruleset's player count. */
  values: Record<string, ParamValue>;
  /** Ids in `values` whose resolved value is still null. */
  nulls: string[];
}

export class RulesError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(issues.length > 0 ? `${message}: ${issues.join('; ')}` : message);
    this.name = 'RulesError';
    this.issues = issues;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const checkRegistrySchema = ajv.compile(parametersSchema);
const checkRulesetSchema = ajv.compile(rulesetSchema);

const schemaIssues = (errors: typeof checkRegistrySchema.errors): string[] =>
  (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`);

const isScalar = (v: unknown): v is string | number | boolean =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/** Why `value` is not a legal value for `p`, or null when it is. */
function valueProblem(p: Parameter, value: unknown): string | null {
  if (p.type === 'enumSet') {
    if (!Array.isArray(value)) return 'must be an array of options';
    const seen = new Set<unknown>();
    for (const v of value) {
      if (!p.options.includes(v as never)) return `${JSON.stringify(v)} is not an option`;
      if (seen.has(v)) return `${JSON.stringify(v)} is repeated`;
      seen.add(v);
    }
    return null;
  }
  if (!isScalar(value) || !p.options.includes(value)) {
    return `${JSON.stringify(value)} is not an option (${p.options.map((o) => JSON.stringify(o)).join(', ')})`;
  }
  return null;
}

/** Validate the registry against its schema, then check ids and defaults. */
export function validateRegistry(registry: unknown): asserts registry is Registry {
  if (!checkRegistrySchema(registry)) {
    throw new RulesError('Parameter registry fails its schema', schemaIssues(checkRegistrySchema.errors));
  }
  const reg = registry as unknown as Registry;
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const p of reg.parameters) {
    if (ids.has(p.id)) issues.push(`${p.id}: duplicate id`);
    ids.add(p.id);
    // A null default means "undecided"; it is caught when a game is started.
    if (p.default === null) continue;
    const problem = valueProblem(p, p.default);
    if (problem) issues.push(`${p.id}: default ${problem}`);
  }
  if (issues.length > 0) throw new RulesError('Parameter registry is inconsistent', issues);
}

function validateRuleset(ruleset: unknown): asserts ruleset is Ruleset {
  if (!checkRulesetSchema(ruleset)) {
    throw new RulesError('Ruleset fails its schema', schemaIssues(checkRulesetSchema.errors));
  }
}

/** The override maps to apply, oldest ancestor first. */
function overrideChain(ruleset: Ruleset, known: Record<string, Ruleset>): Ruleset[] {
  const chain: Ruleset[] = [ruleset];
  const seen = new Set([ruleset.id]);
  for (let cur = ruleset; cur.extends !== undefined; ) {
    const parent = known[cur.extends];
    if (!parent) throw new RulesError(`Ruleset ${cur.id} extends unknown ruleset ${cur.extends}`);
    if (seen.has(parent.id)) throw new RulesError(`Ruleset extends cycle at ${parent.id}`);
    validateRuleset(parent);
    if (parent.players !== ruleset.players) {
      throw new RulesError(`Ruleset ${cur.id} extends ${parent.id} with a different player count`);
    }
    seen.add(parent.id);
    chain.unshift(parent);
    cur = parent;
  }
  return chain;
}

/**
 * Resolve a ruleset: defaults for every non-deprecated parameter that applies to
 * its player count, with `extends` ancestors and then its own overrides applied.
 * Deprecated parameters load but never resolve into a game.
 */
export function resolveRuleset(
  registry: unknown,
  ruleset: unknown,
  known: Record<string, Ruleset> = {},
): ResolvedRuleset {
  validateRegistry(registry);
  validateRuleset(ruleset);
  const byId = new Map(registry.parameters.map((p) => [p.id, p]));
  const live = registry.parameters.filter((p) => p.status !== 'deprecated' && p.players.includes(ruleset.players));

  const values: Record<string, ParamValue> = {};
  for (const p of live) values[p.id] = p.default;

  const issues: string[] = [];
  for (const rs of overrideChain(ruleset, known)) {
    for (const [id, value] of Object.entries(rs.overrides)) {
      const p = byId.get(id);
      if (!p) issues.push(`${rs.id}: unknown parameter ${id}`);
      else if (p.status === 'deprecated') issues.push(`${rs.id}: ${id} is deprecated`);
      else if (!p.players.includes(ruleset.players)) {
        issues.push(`${rs.id}: ${id} does not apply to ${ruleset.players}-player games (players)`);
      } else {
        const problem = valueProblem(p, value);
        if (problem) issues.push(`${rs.id}: ${id} ${problem}`);
        else values[id] = value as ParamValue;
      }
    }
  }
  if (issues.length > 0) throw new RulesError(`Ruleset ${ruleset.id} has invalid overrides`, issues);

  const nulls = live.filter((p) => values[p.id] === null).map((p) => p.id);
  return { ruleset, values, nulls };
}

/** Refuse to start a game that depends on a parameter whose value is still null. */
export function assertPlayable(resolved: ResolvedRuleset): void {
  if (resolved.nulls.length > 0) {
    throw new RulesError(`Ruleset ${resolved.ruleset.id} cannot start: undecided parameters`, resolved.nulls);
  }
}
