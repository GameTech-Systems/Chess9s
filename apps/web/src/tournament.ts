/** A public discussion of a Candidate ruleset: where it is and when it runs (D20: at least 21 days). */
export interface Discussion {
  url: string;
  /** The date the owner announced it (YYYY-MM-DD). */
  opened: string;
  /** The date it closes (YYYY-MM-DD). */
  closes: string;
}

/**
 * The discussion of Standard (`standard-2p`), set when S44 was done. `null` means it has not
 * been announced yet, and `/tournament` says it starts when announced. A later version of Standard
 * that needs no new discussion (D49) keeps this record.
 */
export const STANDARD_DISCUSSION: Discussion | null = {
  url: 'https://github.com/GameTech-Systems/Chess9s/discussions/39',
  opened: '2026-10-25',
  closes: '2026-11-15',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-11-15" as "15 November 2026". */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${Number(m[3])} ${month} ${m[1]}` : iso;
}
