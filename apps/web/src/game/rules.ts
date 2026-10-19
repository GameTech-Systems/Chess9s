// The rules a hot-seat game plays: the real board, pieces and a ruleset from rules/, validated
// and resolved by the engine when the game starts. Nothing is read from here but data.
import {
  resolveRuleset,
  validateBoardAndPieces,
  type MoveRules,
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
}

const infoOf = (r: Ruleset): RulesetInfo => ({
  id: r.id,
  version: r.version,
  name: r.name,
  status: r.status,
  players: r.players,
  description: r.description ?? '',
  playable: r.players === 2,
});

const files = Object.values(rulesetFiles).sort((a, b) => a.id.localeCompare(b.id));

/** The ruleset a new game starts on until another is picked. */
export const DEFAULT_RULESET_ID = 'draft-2p';

/** Every ruleset in rules/rulesets/, by id. */
export function listRulesets(): RulesetInfo[] {
  return files.map(infoOf);
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
