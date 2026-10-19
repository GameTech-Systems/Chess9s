// The rules a hot-seat game plays: the real board, pieces and draft-2p ruleset from rules/,
// validated and resolved by the engine when the game starts. Nothing is read from here but data.
import {
  resolveRuleset,
  validateBoardAndPieces,
  type MoveRules,
  type Registry,
} from '@chess9s/engine';
import board from '../../../../rules/boards/standard-9x9.json';
import registry from '../../../../rules/parameters.json';
import draft2p from '../../../../rules/rulesets/draft-2p.json';

const pieceFiles = import.meta.glob<unknown>('../../../../rules/pieces/*.json', {
  eager: true,
  import: 'default',
});

const resolved = resolveRuleset(registry, draft2p);

/** The ruleset id and version recorded with every game. */
export const ruleset = {
  id: resolved.ruleset.id,
  version: resolved.ruleset.version,
  name: resolved.ruleset.name,
  status: resolved.ruleset.status,
};

export function createRules(): MoveRules {
  const set = validateBoardAndPieces(board, Object.values(pieceFiles), registry as Registry);
  return { ...set, values: resolved.values, players: 2 };
}
