// Runs the computer's search off the page's thread, so the board stays responsive on a phone.
import { computerReply } from './bot';
import type { Level3 } from './bots';
import type { RulesetInfo } from './rules';

export interface BotRequest {
  id: number;
  /** `players` tells a custom ruleset's overrides which game they are for (S64). */
  ruleset: Pick<RulesetInfo, 'id' | 'version' | 'overrides'> & { players?: 2 | 3 };
  moves: string[];
  /** 3-player games: the level of the seat to move (S62). */
  level?: Level3;
}

export interface BotResponse {
  id: number;
  move: string | undefined;
}

self.onmessage = (e: MessageEvent<BotRequest>) => {
  const { id, ruleset, moves, level } = e.data;
  const reply: BotResponse = {
    id,
    move: computerReply(ruleset, moves, Math.random, undefined, level),
  };
  self.postMessage(reply);
};
