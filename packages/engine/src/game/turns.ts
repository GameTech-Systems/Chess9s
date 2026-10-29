// Turn order for any number of seats. The board's setup lists the seats in
// order of play; turn.firstMove, where the ruleset resolves it, picks which
// seat starts, and turn.3p.order, where it resolves, names the whole order
// (seat ids joined by "-", S71). Seats that are out (a captured King's side in
// 3-player games) are skipped.
import type { MoveRules } from '../moves/generate';
import { RulesError } from '../rules/loader';

/** The seats in order of play for the game's player count, starting with the first mover. */
export function turnOrder(rules: MoveRules): string[] {
  const setup = rules.board.setups.find((s) => s.players === rules.players);
  if (!setup)
    throw new RulesError(`Board ${rules.board.id} has no setup for ${rules.players} players`);
  if (!setup.turnOrder) {
    throw new RulesError(
      `Board ${rules.board.id} gives no turn order for ${rules.players} players`,
    );
  }
  const named = rules.values['turn.3p.order'];
  if (named !== undefined) return seatsNamed(String(named), setup.turnOrder);
  const order = setup.turnOrder;
  const first = rules.values['turn.firstMove'];
  if (first === undefined) return [...order];
  const at = order.indexOf(String(first));
  if (at < 0)
    throw new RulesError(`turn.firstMove = ${JSON.stringify(first)} is not a seat of this game`);
  return [...order.slice(at), ...order.slice(0, at)];
}

/** An order named by its seat ids, such as dark-dragon-light: every seat of the setup, once. */
function seatsNamed(named: string, seats: readonly string[]): string[] {
  const order = named.split('-');
  if (order.length !== seats.length || !seats.every((s) => order.includes(s))) {
    throw new RulesError(
      `turn.3p.order = ${JSON.stringify(named)} does not seat ${seats.join(', ')}`,
    );
  }
  return order;
}

/** The seat that moves after `current`, skipping seats that are `out`. */
export function nextSide(
  order: readonly string[],
  current: string,
  out: readonly string[] = [],
): string {
  const at = order.indexOf(current);
  if (at < 0) throw new RulesError(`${current} has no seat in this game`);
  for (let n = 1; n <= order.length; n++) {
    const side = order[(at + n) % order.length]!;
    if (!out.includes(side)) return side;
  }
  throw new RulesError('No seat is left to move');
}
