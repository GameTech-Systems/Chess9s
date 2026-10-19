// Parameter interactions: pairs of parameters whose `affects` overlap, so the
// simulation harness can test them together before a combination becomes a
// default or Official (docs/RULES-FRAMEWORK.md, "Engine requirements").
import { validateRegistry, type Registry } from './loader';

export interface Interaction {
  /** The two parameter ids, a < b. */
  a: string;
  b: string;
  /** The systems both affect, sorted. */
  shared: string[];
}

/**
 * Every pair of parameters that can vary in a game of this player count (live, more than one
 * option) and share at least one `affects` system. Sorted by a, then b.
 */
export function parameterInteractions(registry: unknown, players: 2 | 3): Interaction[] {
  validateRegistry(registry);
  const live = (registry as Registry).parameters
    .filter((p) => p.status !== 'deprecated' && p.players.includes(players) && p.options.length > 1)
    .sort((x, y) => (x.id < y.id ? -1 : 1));
  const out: Interaction[] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const [a, b] = [live[i]!, live[j]!];
      const shared = (a.affects ?? []).filter((s) => (b.affects ?? []).includes(s)).sort();
      if (shared.length > 0) out.push({ a: a.id, b: b.id, shared: [...new Set(shared)] });
    }
  }
  return out;
}
