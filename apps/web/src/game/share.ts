// Export, load and share a ruleset (S42). Everything read here came from outside the app (a
// file a player picked, a link someone sent), so it is size-capped, checked key by key, and
// resolved against the registry with `resolveRuleset` before it becomes a draft. Nothing is
// sent anywhere: an invitation is a `mailto:` link the player's own mail app opens.
import { RulesError } from '@chess9s/engine';
import {
  MAX_NAME,
  differences,
  nameProblem,
  presets,
  startBuilder,
  type BuilderState,
  type Values,
} from './custom';
import {
  CUSTOM_VERSION,
  DEFAULT_RULESET_ID,
  customValues,
  listRulesets,
  overridesOf,
  rulesetValues,
  same,
  settingsFor,
  type CustomRuleset,
} from './rules';

export const MAX_FILE_BYTES = 20_000;
export const MAX_LINK_CHARS = 4_000;
/** Share links open the builder; the ruleset rides in the hash, which a server never sees. */
export const SHARE_PATH = '/build';
const HASH_KEY = 'ruleset=';

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

export type Parsed = { ok: true; state: BuilderState } | { ok: false; problem: string };
const refuse = (problem: string): Parsed => ({ ok: false, problem });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The preset a set of values is closest to, for the builder's "what differs" list. */
function closestPreset(values: Values): string {
  const count = (id: string) => differences(rulesetValues(id), values).length;
  return presets()
    .map((r) => r.id)
    .reduce((best, id) => (count(id) < count(best) ? id : best));
}

/** A draft from a name and overrides, or why they cannot be used. */
function draftFrom(name: unknown, overrides: unknown): Parsed {
  if (typeof name !== 'string') return refuse('The ruleset has no name.');
  const problem = nameProblem(name);
  if (problem) return refuse(problem);
  if (!isRecord(overrides)) return refuse('The file has no “overrides” object.');
  let values: Values;
  try {
    values = customValues({
      id: 'custom-draft',
      name: name.trim(),
      overrides: overrides as Values,
    });
  } catch (e) {
    const detail = e instanceof RulesError ? e.issues.join('; ') : 'it could not be read';
    return refuse(`These settings do not fit this game: ${detail}.`);
  }
  const state = startBuilder(closestPreset(values));
  return { ok: true, state: { ...state, name: name.trim(), values } };
}

/** The ruleset as a `.json` file in the ruleset format (rules/schema/ruleset.schema.json). */
export function exportFile(c: CustomRuleset): string {
  return `${JSON.stringify(
    {
      id: c.id,
      name: c.name,
      version: CUSTOM_VERSION,
      status: 'proposed',
      players: 2,
      description: 'A ruleset built by a player. Not fairness-checked; not a tournament ruleset.',
      overrides: c.overrides,
    },
    null,
    2,
  )}\n`;
}

/** The file name an export is saved under. */
export const exportName = (c: Pick<CustomRuleset, 'id' | 'name'>) =>
  `${
    c.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || c.id
  }.json`;

/**
 * A draft from a ruleset file. Only the 2-player ruleset format is accepted, with no new
 * parameters: every override must be one the registry lists, at one of its options. The file's
 * id and status are ignored (a loaded ruleset is always `proposed`, and gets a free id on save).
 */
export function parseRulesetFile(text: string): Parsed {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    return refuse(`The file is too large for a ruleset (over ${MAX_FILE_BYTES / 1000} KB).`);
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
  if (file.players !== 2) return refuse('Only 2-player rulesets can be loaded.');
  if (isRecord(file.overrides) && Object.keys(file.overrides).includes('__proto__')) {
    return refuse('The file names a setting this game does not have: “__proto__”.');
  }
  return draftFrom(file.name, file.overrides);
}

const toBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (s: string) =>
  new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
  );

/** A path and hash that opens the builder with this ruleset: its name and its overrides. */
export function shareLink(state: Pick<BuilderState, 'name' | 'values'>): string {
  const payload = JSON.stringify({ n: state.name.trim(), o: overridesOf(state.values) });
  return `${SHARE_PATH}#${HASH_KEY}${toBase64Url(payload)}`;
}

/** The draft a link's hash carries (`#ruleset=…`), or undefined when it has none or is not sound. */
export function parseShareLink(hash: string): BuilderState | undefined {
  const h = hash.replace(/^#/, '');
  if (!h.startsWith(HASH_KEY) || h.length > MAX_LINK_CHARS) return undefined;
  try {
    const data: unknown = JSON.parse(fromBase64Url(h.slice(HASH_KEY.length)));
    if (!isRecord(data)) return undefined;
    const r = draftFrom(data.n, data.o);
    return r.ok ? r.state : undefined;
  } catch {
    return undefined;
  }
}

/** The Official ruleset these values equal, if any. Until then a ruleset is unofficial. */
export function matchingOfficial(values: Values): { id: string; name: string } | undefined {
  return listRulesets().find(
    (r) => r.status === 'official' && r.playable && same(rulesetValues(r.id), values),
  );
}

/** What differs from Standard (the ruleset players know), in plain text, one setting per line. */
export function settingsText(values: Values): string {
  return differences(rulesetValues(DEFAULT_RULESET_ID), values)
    .map((d) => `- ${d.label}: ${d.from} → ${d.to}`)
    .join('\n');
}

export type InviteKind = 'game' | 'tournament';

/** A `mailto:` link with no address: the player picks who to write to in their own mail app. */
export function inviteMailto(kind: InviteKind, state: BuilderState, origin: string): string {
  const name = state.name.trim() || 'my ruleset';
  const open = matchingOfficial(state.values);
  const lines = [
    kind === 'game'
      ? `Come and play Chess Nines with me, using the ruleset “${name.slice(0, MAX_NAME)}”.`
      : `I would like to invite you to a Chess Nines tournament, using the ruleset “${name.slice(0, MAX_NAME)}”.`,
    '',
    `Open it here: ${origin}${shareLink(state)}`,
    '',
    open
      ? `This is the Official ruleset ${open.name}.`
      : 'This is an unofficial ruleset: it has not been fairness-checked.',
    ...(kind === 'tournament' && !open
      ? ['It is not a tournament ruleset: custom rulesets are not used in official tournaments.']
      : []),
    '',
    'Differs from Standard:',
    settingsText(state.values) || '- None',
  ];
  const subject =
    kind === 'game' ? `Invitation to a Chess Nines game` : `Invitation to a Chess Nines tournament`;
  let body = lines.join('\n');
  // Mail apps cut very long links; keep the draft well under the usual limit.
  if (body.length > 1700) body = `${body.slice(0, 1690)}\n…`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
