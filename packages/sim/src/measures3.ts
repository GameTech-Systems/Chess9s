// The D60 3-player balance measures as decision 0015 fixes them (provisional until the owner
// confirms them). Change them only with a new version of that decision record.
export const MEASURES_3P = {
  decision: '0015',
  version: 1,
  /** Every seat's score band, inclusive: a third, plus or minus 5 points. */
  band: { min: 0.28, max: 0.38 },
  /** Fewest games a run needs before its scores count. */
  minGames: 2000,
  /** Search depths in plies, one per seat (S62). */
  depths: [1, 2],
  /** Positions the search may visit per move, as in decision 0008. */
  nodes: 100_000,
  /** Random plies that open each game, two per seat (provisional). */
  openingPlies: 6,
  /** Safety cap in plies, as in decision 0008. */
  maxPlies: 2000,
  /** Share of capped games above which a run is flagged for the owner (BUILD-PLAN S59). */
  maxCapped: 0.05,
} as const;

export type Measures3 = typeof MEASURES_3P;
