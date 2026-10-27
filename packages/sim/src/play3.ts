// One 3-player self-play game (S58): a few random opening plies, then the greedy player plays every
// seat until the game ends or reaches the safety cap. Deterministic for a given seed (decision
// 0008). The full 3-player fairness report is S59; this counts each seat's results.
import {
  greedyMove,
  newGame,
  playMove,
  toNotation,
  type DrawReason,
  type GameInit,
  type MoveRules,
  type WinReason,
} from '@chess9s/engine';
import { hash, seeded } from './play';

export interface Play3Options {
  seed: number;
  /** Random plies before the greedy player takes over. */
  openingPlies: number;
  /** Plies after which an unfinished game stops. */
  maxPlies: number;
  /** A start other than the board's start position (tests). */
  init?: GameInit;
}

export interface Summary3 {
  seed: number;
  /** The seats in turn order. */
  order: string[];
  outcome: 'win' | 'draw' | 'unfinished';
  winner: string | null;
  /** The seat the deciding move beat. */
  loser: string | null;
  reason: WinReason | DrawReason | 'unfinished';
  plies: number;
  /** A hash of the moves, to count distinct games. */
  key: string;
}

export function playGame3(
  rules: MoveRules,
  ruleset: { id: string; version: string },
  options: Play3Options,
): Summary3 {
  if (rules.players !== 3) throw new Error(`${ruleset.id} is not a 3-player ruleset`);
  const random = seeded(options.seed);
  let state = newGame(rules, ruleset, options.init);
  while (state.result.status === 'ongoing' && state.moves.length < options.maxPlies) {
    const move =
      state.moves.length < options.openingPlies
        ? state.legal[Math.floor(random() * state.legal.length)]
        : greedyMove(state, { random });
    if (!move) break;
    state = playMove(state, move);
  }
  const { result } = state;
  const base = {
    seed: options.seed,
    order: [...state.order],
    plies: state.moves.length,
    key: hash(state.moves.map(toNotation).join(' ')),
  };
  if (result.status === 'win') {
    return {
      ...base,
      outcome: 'win',
      winner: result.winner,
      loser: result.loser,
      reason: result.reason,
    };
  }
  if (result.status === 'draw') {
    return {
      ...base,
      outcome: 'draw',
      winner: null,
      loser: null,
      reason: result.reason as DrawReason,
    };
  }
  return { ...base, outcome: 'unfinished', winner: null, loser: null, reason: 'unfinished' };
}

export interface SeatSummary {
  wins: number;
  losses: number;
  /** Wins over all games (draws and unfinished games count against nobody). */
  winRate: number;
  /** Wins by how they were won. */
  winsBy: Record<string, number>;
}

export interface Run3Summary {
  games: number;
  draws: number;
  unfinished: number;
  seats: Record<string, SeatSummary>;
  /** Games by how they ended. */
  results: Record<string, number>;
  plies: { mean: number; median: number; min: number; max: number };
  distinct: number;
}

export function summarize3(games: Summary3[]): Run3Summary {
  const seats: Record<string, SeatSummary> = {};
  const seat = (id: string) => (seats[id] ??= { wins: 0, losses: 0, winRate: 0, winsBy: {} });
  const results: Record<string, number> = {};
  let draws = 0;
  let unfinished = 0;
  for (const g of games) {
    for (const s of g.order) seat(s);
    results[g.reason] = (results[g.reason] ?? 0) + 1;
    if (g.outcome === 'unfinished') unfinished++;
    else if (g.outcome === 'draw') draws++;
    else {
      const w = seat(g.winner!);
      w.wins++;
      w.winsBy[g.reason] = (w.winsBy[g.reason] ?? 0) + 1;
      seat(g.loser!).losses++;
    }
  }
  for (const s of Object.values(seats)) s.winRate = games.length ? s.wins / games.length : 0;
  const plies = games.map((g) => g.plies).sort((a, b) => a - b);
  const n = plies.length;
  const median =
    n === 0 ? 0 : n % 2 ? plies[(n - 1) / 2]! : (plies[n / 2 - 1]! + plies[n / 2]!) / 2;
  return {
    games: n,
    draws,
    unfinished,
    seats,
    results,
    plies: {
      mean: n ? plies.reduce((a, b) => a + b, 0) / n : 0,
      median,
      min: plies[0] ?? 0,
      max: plies[n - 1] ?? 0,
    },
    distinct: new Set(games.map((g) => g.key)).size,
  };
}

export interface Report3 extends Run3Summary {
  ruleset: { id: string; version: string };
  date: string;
}

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

export function toMarkdown3(r: Report3): string {
  const rows = Object.entries(r.seats).map(
    ([id, s]) =>
      `| ${id} | ${s.wins} | ${s.losses} | ${pct(s.winRate)} | ${
        Object.entries(s.winsBy)
          .map(([how, n]) => `${how} ${n}`)
          .join(', ') || '–'
      } |`,
  );
  return [
    `# ${r.ruleset.id} ${r.ruleset.version}: greedy self-play`,
    '',
    `${r.date} · ${r.games} games · ${r.distinct} distinct · ${r.draws} drawn · ${r.unfinished} unfinished`,
    '',
    'Greedy players on every seat (S58). Not a fairness report: the 3-player measures and the verdict are S59.',
    '',
    '| Seat | Wins | Losses | Win rate | Won by |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    `Games ended by: ${
      Object.entries(r.results)
        .map(([how, n]) => `${how} ${n}`)
        .join(', ') || '–'
    }.`,
    '',
    `Plies per game: mean ${r.plies.mean.toFixed(1)}, median ${r.plies.median}, min ${r.plies.min}, max ${r.plies.max}.`,
    '',
  ].join('\n');
}
