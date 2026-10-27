// What the game screen says about the clocks (S65, decision 0017): the line for each seat in a
// 2-player game, and the text for a seat's note. Read from the clock; no rule is decided here.
import type { ClockLine } from './session';
import type { Timed } from './timed';

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

export interface ClockSeat {
  side: string;
  name: string;
  /** "to move", "out of time"; empty when there is nothing to say. */
  text: string;
  toMove: boolean;
  flagged: boolean;
  ms: number;
}

/** A seat's note on its clock: out of time (shown with Show only), or out of the game. */
export const clockNote = (line: ClockLine): string => (line.flagged ? 'out of time' : '');

/** The seats of a 2-player game with their clocks, in turn order. */
export function clockSeats(lines: ClockLine[], over: boolean, turn: string): ClockSeat[] {
  return lines.map((line) => {
    const toMove = !over && line.side === turn;
    return {
      side: line.side,
      name: title(line.side),
      text: [toMove ? 'to move' : '', clockNote(line)].filter(Boolean).join(' · '),
      toMove,
      flagged: line.flagged,
      ms: line.ms,
    };
  });
}

/** "3+2", "30 seconds per move", with ", Show only" when running out is only shown. */
export const controlText = ({ control, showOnly }: Timed): string =>
  showOnly ? `${control.name} (Show only)` : control.name;
