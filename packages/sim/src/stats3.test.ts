// The 3-player balance measures (decision 0015, D60): each seat's score with draws split among the
// seats that share them, capped games reported but not scored, and every game sorted into a row of
// decision 0016's end tables.
import { describe, expect, it } from 'vitest';
import { MEASURES_3P } from './measures3';
import type { Summary3 } from './play3';
import { endingOf, summarize3 } from './stats3';

const game = (over: Partial<Summary3>): Summary3 => ({
  seed: 1,
  order: ['dark', 'light', 'dragon'],
  dragon: 'dragon',
  outcome: 'win',
  winner: 'dragon',
  loser: 'light',
  reason: 'checkmate',
  between: null,
  events: ['king-captured:dark'],
  plies: 10,
  key: 'k',
  ...over,
});

const draw = (between: string[], over: Partial<Summary3> = {}): Summary3 =>
  game({
    outcome: 'draw',
    winner: null,
    loser: null,
    reason: 'fifty-move',
    between,
    events: [],
    ...over,
  });

const capped = (over: Partial<Summary3> = {}): Summary3 =>
  game({
    outcome: 'unfinished',
    winner: null,
    loser: null,
    reason: 'unfinished',
    events: [],
    ...over,
  });

describe('endingOf', () => {
  it('sorts the full rules into the rows of decision 0016', () => {
    expect(endingOf(game({ winner: 'dark', loser: 'light', events: [] }))).toBe('king-mates-king');
    expect(
      endingOf(game({ winner: 'dark', loser: 'light', reason: 'exposed-king', events: [] })),
    ).toBe('king-mates-king');
    expect(endingOf(game({}))).toBe('dragon-wins-duel');
    expect(endingOf(game({ reason: 'king-capture' }))).toBe('dragon-wins-duel');
    expect(endingOf(game({ winner: 'light', loser: 'dragon' }))).toBe('king-mates-tail-duel');
    expect(endingOf(game({ winner: 'light', loser: 'dragon', reason: 'dragon-captured' }))).toBe(
      'king-takes-dragon-duel',
    );
    expect(endingOf(draw(['dark', 'light']))).toBe('draw-kinged');
    expect(endingOf(draw(['light', 'dragon']))).toBe('draw-duel');
    expect(endingOf(capped())).toBe('capped');
  });

  it('sorts the first checkmate (Easy Start) into its own rows', () => {
    expect(endingOf(game({ events: [] }))).toBe('dragon-mates-king');
    expect(endingOf(game({ winner: 'dark', loser: 'dragon', events: [] }))).toBe('king-mates-tail');
    expect(endingOf(draw(['dark', 'light', 'dragon']))).toBe('draw-all');
  });
});

describe('summarize3', () => {
  const games = [
    game({ seed: 1 }),
    game({ seed: 2, winner: 'dark', loser: 'light', events: [], plies: 20, key: 'a' }),
    draw(['dark', 'light'], { seed: 3, plies: 30, key: 'b' }),
    draw(['dark', 'light', 'dragon'], { seed: 4, plies: 40, key: 'c' }),
    capped({ seed: 5, plies: 2000, key: 'd' }),
  ];

  it('scores each seat over the finished games, splitting a draw among the seats that share it', () => {
    const s = summarize3(games);
    expect(s).toMatchObject({ games: 5, finished: 4, draws: 2, unfinished: 1 });
    // dark: 1 + ½ + ⅓; light: ½ + ⅓; dragon: 1 + ⅓. Four finished games.
    expect(s.seats['dark']!.score).toBeCloseTo((1 + 1 / 2 + 1 / 3) / 4);
    expect(s.seats['light']!.score).toBeCloseTo((1 / 2 + 1 / 3) / 4);
    expect(s.seats['dragon']!.score).toBeCloseTo((1 + 1 / 3) / 4);
    expect(s.seats['dragon']).toMatchObject({ wins: 1, losses: 0, draws: 1 });
    expect(s.seats['light']).toMatchObject({ wins: 0, losses: 2, draws: 2 });
    const sum = Object.values(s.seats).reduce((a, x) => a + x.score, 0);
    expect(sum).toBeCloseTo(1);
    const [lo, hi] = s.seats['dark']!.interval;
    expect(lo).toBeLessThan(s.seats['dark']!.score);
    expect(hi).toBeGreaterThan(s.seats['dark']!.score);
  });

  it('counts the endings, the draws by who shares them, the events and the length', () => {
    const s = summarize3(games);
    expect(s.endings).toEqual({
      'dragon-wins-duel': 1,
      'king-mates-king': 1,
      'draw-kinged': 1,
      'draw-all': 1,
      capped: 1,
    });
    expect(s.drawsBetween).toEqual({ 'dark+light': 1, 'dark+light+dragon': 1 });
    expect(s.results).toEqual({ checkmate: 2, 'fifty-move': 2, unfinished: 1 });
    expect(s.events).toEqual({ 'king-captured:dark': 1 });
    expect(s.seats['dark']!.winsBy).toEqual({ checkmate: 1 });
    expect(s.plies).toEqual({ mean: 420, median: 30, min: 10, max: 2000 });
    expect(s.distinct).toBe(5);
  });

  it('flags each seat outside the band, too few games, and capped games over 5%', () => {
    const s = summarize3(games);
    expect(s.flags).toEqual([
      'dark score outside 28–38%',
      'light score outside 28–38%',
      'too few games',
      'capped games over 5%',
    ]);
    expect(s.pass).toBe(false);
  });

  it('passes a balanced run of enough games with few capped', () => {
    const n = MEASURES_3P.minGames;
    const balanced = Array.from({ length: n }, (_, i) =>
      i === 0
        ? capped({ seed: i })
        : game({
            seed: i,
            winner: ['dark', 'light', 'dragon'][i % 3]!,
            loser: ['light', 'dragon', 'dark'][i % 3]!,
            events: [],
          }),
    );
    const s = summarize3(balanced);
    expect(s.unfinished).toBe(1);
    expect(s.flags).toEqual([]);
    expect(s.pass).toBe(true);
    for (const seat of Object.values(s.seats)) expect(seat.score).toBeCloseTo(1 / 3, 2);
  });

  it('treats a run with no finished game as scoring nothing', () => {
    const s = summarize3([capped()]);
    expect(s.finished).toBe(0);
    expect(s.seats['dark']!.score).toBe(0);
    expect(s.flags).toContain('too few games');
  });
});
