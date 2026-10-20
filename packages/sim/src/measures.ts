// The D12 fairness measures as decision 0008 fixes them. Change them only with a new version of
// that decision record.
export const MEASURES = {
  decision: '0008',
  /** First-player score band, inclusive. */
  band: { min: 0.47, max: 0.53 },
  /** Fewest finished games a run needs before its score counts. */
  minGames: 2000,
  /** Full-width search depths in plies (provisional). */
  depths: [1, 2],
  /** Positions the search may visit per move (provisional): enough for depth 2 to complete. */
  nodes: 100_000,
  /** Random plies that open each game, half per side (provisional). */
  openingPlies: 4,
  /** Safety cap in plies (provisional); the draw rules should end games long before it. */
  maxPlies: 2000,
} as const;

export type Measures = typeof MEASURES;
