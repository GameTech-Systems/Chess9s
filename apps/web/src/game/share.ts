// Export, load and share a ruleset (S42). Everything read here came from outside the app (a
// file a player picked, a link someone sent), so it is size-capped, checked key by key, and
// resolved against the registry with `resolveRuleset` before it becomes a draft. Nothing is
// sent anywhere: an invitation is a `mailto:` link the player's own mail app opens.
import type { RoomRuleset } from '@chess9s/online/protocol';
import { MAX_RULESET_FILE_BYTES, readRulesetFile, resolveFileOverrides } from '@chess9s/engine';
import registry from '../../../../rules/parameters.json';
import { REPO_URL } from '../links';
import {
  MAX_NAME,
  customFrom,
  differences,
  nameProblem,
  presets,
  startBuilder,
  type BuilderState,
  type Values,
} from './custom';
import {
  CUSTOM_VERSION,
  DEFAULT_3P_RULESET_ID,
  DEFAULT_RULESET_ID,
  customValues,
  findRuleset,
  listRulesets,
  overridesOf,
  rulesetValues,
  same,
  type CustomRuleset,
} from './rules';

export const MAX_FILE_BYTES = MAX_RULESET_FILE_BYTES;
export const MAX_LINK_CHARS = 4_000;
/** Share links open the builder; the ruleset rides in the hash, which a server never sees. */
export const SHARE_PATH = '/build';
const HASH_KEY = 'ruleset=';

export type Parsed = { ok: true; state: BuilderState } | { ok: false; problem: string };
const refuse = (problem: string): Parsed => ({ ok: false, problem });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The preset a set of values is closest to, for the builder's "what differs" list. */
function closestPreset(values: Values, players: 2 | 3): string {
  const count = (id: string) => differences(rulesetValues(id), values, players).length;
  return presets(players)
    .map((r) => r.id)
    .reduce((best, id) => (count(id) < count(best) ? id : best));
}

/** A draft from a name and overrides, or why they cannot be used. */
function draftFrom(name: unknown, overrides: unknown, players: 2 | 3 = 2): Parsed {
  if (typeof name !== 'string') return refuse('The ruleset has no name.');
  const problem = nameProblem(name);
  if (problem) return refuse(problem);
  if (!isRecord(overrides)) return refuse('The file has no “overrides” object.');
  const r = resolveFileOverrides(registry, name.trim(), overrides, undefined, players);
  if (!r.ok) return refuse(r.problem);
  const state = startBuilder(closestPreset(r.values, players));
  return { ok: true, state: { ...state, name: r.name, values: r.values } };
}

/** The ruleset as a `.json` file in the ruleset format (rules/schema/ruleset.schema.json). */
export function exportFile(c: CustomRuleset): string {
  return `${JSON.stringify(
    {
      id: c.id,
      name: c.name,
      version: CUSTOM_VERSION,
      status: 'proposed',
      players: c.players ?? 2,
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
 * A draft from a ruleset file. The 2-player and 3-player ruleset format is accepted (D64), with no new
 * parameters: every override must be one the registry lists, at one of its options. The file's
 * id and status are ignored (a loaded ruleset is always `proposed`, and gets a free id on save).
 */
export function parseRulesetFile(text: string): Parsed {
  // The same check the sim runs on a submitted file (`pnpm sim --ruleset-file`).
  const file = readRulesetFile(text, registry, [2, 3]);
  if (!file.ok) return refuse(file.problem);
  return draftFrom(file.name, file.overrides, file.players);
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
export function shareLink(state: Pick<BuilderState, 'name' | 'values' | 'players'>): string {
  const payload = JSON.stringify({
    n: state.name.trim(),
    ...(state.players === 3 && { p: 3 }),
    o: overridesOf(state.values, state.players),
  });
  return `${SHARE_PATH}#${HASH_KEY}${toBase64Url(payload)}`;
}

/** The draft a link's hash carries (`#ruleset=…`), or undefined when it has none or is not sound. */
export function parseShareLink(hash: string): BuilderState | undefined {
  const h = hash.replace(/^#/, '');
  if (!h.startsWith(HASH_KEY) || h.length > MAX_LINK_CHARS) return undefined;
  try {
    const data: unknown = JSON.parse(fromBase64Url(h.slice(HASH_KEY.length)));
    if (!isRecord(data)) return undefined;
    const r = draftFrom(data.n, data.o, data.p === 3 ? 3 : 2);
    return r.ok ? r.state : undefined;
  } catch {
    return undefined;
  }
}

/** The Official ruleset these values equal, if any. Until then a ruleset is unofficial. */
export function matchingOfficial(
  values: Values,
  players: 2 | 3 = 2,
): { id: string; name: string } | undefined {
  return listRulesets().find(
    (r) =>
      r.status === 'official' &&
      r.playable &&
      r.players === players &&
      same(rulesetValues(r.id), values),
  );
}

/** What differs from Standard (the ruleset players know), in plain text, one setting per line. */
export function settingsText(values: Values, players: 2 | 3 = 2): string {
  const standard = players === 3 ? DEFAULT_3P_RULESET_ID : DEFAULT_RULESET_ID;
  return differences(rulesetValues(standard), values, players)
    .map((d) => `- ${d.label}: ${d.from} → ${d.to}`)
    .join('\n');
}

const differsFrom = (players: 2 | 3) =>
  players === 3 ? 'Differs from Standard (3-player):' : 'Differs from Standard:';

export type InviteKind = 'game' | 'tournament';

/** A `mailto:` link with no address: the player picks who to write to in their own mail app. */
export function inviteMailto(kind: InviteKind, state: BuilderState, origin: string): string {
  const name = state.name.trim() || 'my ruleset';
  const open = matchingOfficial(state.values, state.players);
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
    ...(kind === 'tournament'
      ? [
          'Tournament games can be played online by room code, with the Official ruleset only.',
          `Tournament rules: ${origin}/tournament`,
        ]
      : []),
    '',
    differsFrom(state.players),
    settingsText(state.values, state.players) || '- None',
  ];
  const subject =
    kind === 'game' ? `Invitation to a Chess Nines game` : `Invitation to a Chess Nines tournament`;
  let body = lines.join('\n');
  // Mail apps cut very long links; keep the draft well under the usual limit.
  if (body.length > 1700) body = `${body.slice(0, 1690)}\n…`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** The path of a room's page: the link a joiner opens. */
export const roomPath = (code: string) => `/room/${code}`;

/**
 * A `mailto:` link inviting someone to a room: the link, the code, which ruleset it plays and
 * whether it is Official, and for a ruleset other than Standard what differs. No address, like
 * the builder's invitations: the player picks who to write to in their own mail app.
 */
export function roomInviteMailto(
  room: { code: string; ruleset: RoomRuleset },
  origin: string,
): string {
  const { ruleset } = room;
  const bundled = ruleset.overrides ? undefined : findRuleset(ruleset.id, ruleset.version);
  const values = ruleset.overrides
    ? customValues({ id: ruleset.id, name: ruleset.name, overrides: ruleset.overrides })
    : bundled
      ? rulesetValues(ruleset.id, ruleset.version)
      : undefined;
  const differs = values ? settingsText(values) : '';
  const lines = [
    `Come and play Chess Nines with me online, using the ruleset “${ruleset.name.slice(0, MAX_NAME)}”.`,
    '',
    `Open the room: ${origin}${roomPath(room.code)}`,
    `Room code: ${room.code}`,
    '',
    bundled?.status === 'official'
      ? `This is the Official ruleset ${bundled.name}.`
      : bundled
        ? `This ruleset is not Official yet (${bundled.status}).`
        : 'This is an unofficial ruleset: it has not been fairness-checked.',
    ...(differs ? ['', 'Differs from Standard:', differs] : []),
  ];
  let body = lines.join('\n');
  if (body.length > 1700) body = `${body.slice(0, 1690)}\n…`;
  return `mailto:?subject=${encodeURIComponent('Invitation to a Chess Nines game')}&body=${encodeURIComponent(body)}`;
}

/** The Rule proposals Discussion form (.github/DISCUSSION_TEMPLATE/rule-proposals.yml). */
export const SUBMIT_FORM_URL = `${REPO_URL}/discussions/new`;
/** GitHub refuses very long addresses; a prefilled form stays well under its limit. */
export const SUBMIT_URL_MAX = 6_000;

/**
 * "Submit for consideration" (S43, decision D46): the Rule proposals Discussion form, prefilled
 * with the settings summary, the share link and the ruleset file (the export, byte for byte).
 * The poster writes why it is fair and ticks the contribution terms themselves. When the file
 * would make the address too long it is left out, and the summary asks for the export instead.
 */
export function submitUrl(
  state: BuilderState,
  origin: string,
  max: number = SUBMIT_URL_MAX,
): string {
  const name = state.name.trim().slice(0, MAX_NAME) || 'my ruleset';
  const file = exportFile(customFrom(state, 'submitted'));
  const idea = (fileNote: string) =>
    [
      `Ruleset “${name}”, submitted for tournament consideration (GOVERNANCE.md, submitted rulesets).`,
      '',
      `Open it: ${origin}${shareLink(state)}`,
      fileNote,
      'Fairness check: save the file as a .json and run `pnpm sim --ruleset-file <file>`.',
      '',
      differsFrom(state.players),
      settingsText(state.values, state.players) || '- None',
    ].join('\n');
  const url = (fields: Record<string, string>) =>
    `${SUBMIT_FORM_URL}?${new URLSearchParams({
      category: 'rule-proposals',
      title: `[Ruleset] ${name}`,
      ...fields,
    }).toString()}`;
  const full = url({ idea: idea('The ruleset file is below.'), ruleset: file });
  if (full.length <= max) return full;
  const note =
    'The file is too long for this link: paste the exported file (Export as file) below.';
  let text = idea(note);
  let short = url({ idea: text });
  // Very long summaries are cut, keeping the link and the note at the top.
  while (short.length > max && text.length > 0) {
    text = `${text.slice(0, Math.floor(text.length * 0.9))}\n…`;
    short = url({ idea: text });
  }
  return short;
}
