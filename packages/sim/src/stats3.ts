// A 3-player run's games summed up against the D60 balance measures (decision 0015): each seat's
// score, a win counting 1 and a draw split among the seats that share it, over the finished games;
// games stopped at the cap are reported, not scored. Every game is sorted into a row of decision
// 0016's end tables.
import { MEASURES_3P, type Measures3 } from './measures3';
import type { Summary3 } from './play3';
import { wilson } from './stats';

/** The rows of decision 0016's end tables a game can end on, in the order reports list them. */
export const ENDINGS = {
  'king-mates-king': 'A Kinged player checkmates the other King',
  'dragon-wins-duel': 'In the duel, the Dragon checkmates (or captures) the last King',
  'king-mates-tail-duel': 'In the duel, the last Kinged player checkmates the Tail',
  'king-takes-dragon-duel':
    'In the duel, the last Kinged player captures both Dragon Heads, the Sun and the Moon',
  'draw-kinged': 'A draw while both Kings are on the board (between the Kinged players)',
  'draw-duel': 'A draw in the duel (the last Kinged player and the Dragon)',
  'dragon-mates-king': 'First checkmate: the Dragon checkmates a King',
  'king-mates-tail': 'First checkmate: a Kinged player checkmates the Tail',
  'draw-all': 'A draw shared by all three',
  capped: 'Stopped at the move cap (not scored)',
  other: 'Another ending',
} as const;

export type Ending = keyof typeof ENDINGS;

/** The end-table row a game ended on. A duel is a game in which the Dragon took a King. */
export function endingOf(g: Summary3): Ending {
  if (g.outcome === 'unfinished') return 'capped';
  const duel = g.events.some((e) => e.startsWith('king-captured:'));
  if (g.outcome === 'draw') {
    const between = g.between ?? g.order;
    if (between.length >= 3) return 'draw-all';
    return between.includes(g.dragon) ? 'draw-duel' : 'draw-kinged';
  }
  if (g.winner === g.dragon) return duel ? 'dragon-wins-duel' : 'dragon-mates-king';
  if (g.loser === g.dragon) {
    if (g.reason === 'dragon-captured') return 'king-takes-dragon-duel';
    if (g.reason === 'checkmate') return duel ? 'king-mates-tail-duel' : 'king-mates-tail';
    return 'other';
  }
  return g.reason === 'checkmate' || g.reason === 'exposed-king' ? 'king-mates-king' : 'other';
}

export interface Seat3Summary {
  wins: number;
  losses: number;
  /** Draws the seat shares. */
  draws: number;
  /** Wins plus each shared draw's split, over the finished games. */
  score: number;
  /** 95% Wilson interval on the score. */
  interval: [number, number];
  /** Wins by how they were won. */
  winsBy: Record<string, number>;
}

export interface Run3Summary {
  /** Games played, the capped ones included. */
  games: number;
  /** Games that ended (won or drawn): the ones scored. */
  finished: number;
  draws: number;
  /** Games stopped at the move cap. */
  unfinished: number;
  /** The seats in turn order, each with its results. */
  seats: Record<string, Seat3Summary>;
  /** Games by end-table row (decision 0016). */
  endings: Partial<Record<Ending, number>>;
  /** Draws by the seats that share them, joined with + in turn order. */
  drawsBetween: Record<string, number>;
  /** Games by the engine's reason: checkmate, a draw rule, unfinished. */
  results: Record<string, number>;
  /** Games in which each event happened at least once (play3.ts). */
  events: Record<string, number>;
  plies: { mean: number; median: number; min: number; max: number };
  distinct: number;
  flags: string[];
  pass: boolean;
}

const add = (into: Record<string, number>, key: string, n = 1) => {
  into[key] = (into[key] ?? 0) + n;
};

/** The band as a label, "28–38%". */
export const band3Label = (m: Measures3) =>
  `${Math.round(m.band.min * 100)}–${Math.round(m.band.max * 100)}%`;

export function summarize3(games: Summary3[], measures: Measures3 = MEASURES_3P): Run3Summary {
  const seats: Record<string, Seat3Summary> = {};
  const points: Record<string, number> = {};
  const seat = (id: string) =>
    (seats[id] ??= { wins: 0, losses: 0, draws: 0, score: 0, interval: [0, 1], winsBy: {} });
  const endings: Partial<Record<Ending, number>> = {};
  const drawsBetween: Record<string, number> = {};
  const results: Record<string, number> = {};
  const events: Record<string, number> = {};
  let draws = 0;
  let unfinished = 0;
  for (const g of games) {
    for (const s of g.order) seat(s);
    add(results, g.reason);
    add(endings, endingOf(g));
    for (const e of new Set(g.events)) add(events, e);
    if (g.outcome === 'unfinished') unfinished++;
    else if (g.outcome === 'draw') {
      draws++;
      const between = g.order.filter((s) => (g.between ?? g.order).includes(s));
      add(drawsBetween, between.join('+'));
      for (const s of between) {
        seat(s).draws++;
        add(points, s, 1 / between.length);
      }
    } else {
      const w = seat(g.winner!);
      w.wins++;
      add(w.winsBy, g.reason);
      add(points, g.winner!);
      seat(g.loser!).losses++;
    }
  }
  const n = games.length;
  const finished = n - unfinished;
  for (const [id, s] of Object.entries(seats)) {
    s.score = finished ? (points[id] ?? 0) / finished : 0;
    s.interval = wilson(s.score, finished);
  }
  const plies = games.map((g) => g.plies).sort((a, b) => a - b);
  const median =
    n === 0 ? 0 : n % 2 ? plies[(n - 1) / 2]! : (plies[n / 2 - 1]! + plies[n / 2]!) / 2;

  const flags: string[] = [];
  if (finished > 0) {
    for (const [id, s] of Object.entries(seats)) {
      // Rounded to a hundredth of a percent first, as decision 0008 does.
      const rounded = Math.round(s.score * 10000) / 10000;
      if (rounded < measures.band.min || rounded > measures.band.max) {
        flags.push(`${id} score outside ${band3Label(measures)}`);
      }
    }
  }
  if (n < measures.minGames) flags.push('too few games');
  if (n > 0 && unfinished / n > measures.maxCapped) {
    flags.push(`capped games over ${Math.round(measures.maxCapped * 100)}%`);
  }
  return {
    games: n,
    finished,
    draws,
    unfinished,
    seats,
    endings,
    drawsBetween,
    results,
    events,
    plies: {
      mean: n ? plies.reduce((a, b) => a + b, 0) / n : 0,
      median,
      min: plies[0] ?? 0,
      max: plies[n - 1] ?? 0,
    },
    distinct: new Set(games.map((g) => g.key)).size,
    flags,
    pass: flags.length === 0,
  };
}
