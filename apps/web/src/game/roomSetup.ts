// The create-room screen's choices (S63): which side the creator takes and which the computer
// plays. Kept apart from the screen so what the room accepts is tested without a browser.
import { MAX_COMPUTER_SEATS, RANDOM_SEAT, type SeatChoice } from '@chess9s/online/protocol';
import { boardData } from '../board/data';

/**
 * The sides a game with this many players has, in turn order, from the board's data. The setup's
 * pieces also list the neutral side (stones), which has no seat.
 */
export const sidesOf = (players: 2 | 3): string[] => {
  const setup = boardData.setups.find((s) => s.players === players);
  return setup?.turnOrder ?? Object.keys(setup?.pieces ?? {}).filter((s) => s !== 'neutral');
};

export interface SeatPlan {
  seat: SeatChoice;
  /** The seats the creator's browser plays. */
  computer: string[];
}

/** The creator takes `choice`; if the computer had that seat, it is the creator's now. */
export function chooseSeat(
  _seat: SeatChoice,
  computer: readonly string[],
  choice: SeatChoice,
): SeatPlan {
  return { seat: choice, computer: computer.filter((s) => s !== choice) };
}

/** `side` goes to the computer or comes back; the creator's own seat, and a third seat, do not. */
export function toggleComputer(
  seat: SeatChoice,
  computer: readonly string[],
  side: string,
): string[] {
  if (computer.includes(side)) return computer.filter((s) => s !== side);
  if (side === seat && seat !== RANDOM_SEAT) return [...computer];
  return computer.length < MAX_COMPUTER_SEATS ? [...computer, side] : [...computer];
}
