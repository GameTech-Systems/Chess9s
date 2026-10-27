// Runs the computer's search off the page's thread, so the board stays responsive on a phone.
import { computerReply } from './bot';
import type { RulesetInfo } from './rules';

export interface BotRequest {
  id: number;
  /** `players` tells a custom ruleset's overrides which game they are for (S64). */
  ruleset: Pick<RulesetInfo, 'id' | 'version' | 'overrides'> & { players?: 2 | 3 };
  moves: string[];
}

export interface BotResponse {
  id: number;
  move: string | undefined;
}

self.onmessage = (e: MessageEvent<BotRequest>) => {
  const { id, ruleset, moves } = e.data;
  const reply: BotResponse = { id, move: computerReply(ruleset, moves) };
  self.postMessage(reply);
};
