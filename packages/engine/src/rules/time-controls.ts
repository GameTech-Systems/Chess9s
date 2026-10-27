// The time controls (S65, decision 0017): rules/timeControls.json read into typed data. A time
// control is chosen per game, not per ruleset, so it is not a rule parameter. The clock that runs
// a control is in game/clock.ts.
import { RulesError } from './loader';
import { checkTimeControlsSchema } from './schema-check';

export type TimeControlKind = 'untimed' | 'fischer' | 'perMove' | 'abandonment';

export interface TimeControl {
  id: string;
  name: string;
  kind: TimeControlKind;
  /** Fischer: the minutes each seat starts with. */
  minutes?: number;
  /** Fischer: the seconds a seat gains after each of its own moves. */
  increment?: number;
  /** Per move: the seconds each move may take. */
  seconds?: number;
  /** Abandonment: the minutes away that count as out of time. */
  awayMinutes?: number;
  /** Only an online room offers it; the hot-seat picker leaves it out. */
  onlineOnly?: boolean;
}

export interface TimeControls {
  /** The id of the control a new game starts with: untimed (D58). */
  default: string;
  controls: TimeControl[];
}

/** Whether the control runs a clock for each seat (Fischer and per-move controls). */
export const isClocked = (control: TimeControl): boolean =>
  control.kind === 'fischer' || control.kind === 'perMove';

export const findControl = (tc: TimeControls, id: string): TimeControl | undefined =>
  tc.controls.find((c) => c.id === id);

/** The controls a hot-seat game offers: every one that is not online only. */
export const hotSeatControls = (tc: TimeControls): TimeControl[] =>
  tc.controls.filter((c) => c.onlineOnly !== true);

/** Read and check rules/timeControls.json. Refuses a file that breaks the schema or its own rules. */
export function loadTimeControls(file: unknown): TimeControls {
  if (!checkTimeControlsSchema(file)) {
    const why = (checkTimeControlsSchema.errors ?? []).map(
      (e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim(),
    );
    throw new RulesError('timeControls.json does not fit its schema', why);
  }
  const { default: fallback, controls } = file as unknown as TimeControls;
  const seen = new Set<string>();
  for (const { id } of controls) {
    if (seen.has(id)) throw new RulesError(`timeControls.json lists the control ${id} twice`);
    seen.add(id);
  }
  const chosen = controls.find((c) => c.id === fallback);
  if (!chosen) {
    throw new RulesError(`The default time control ${fallback} is not one of the controls`);
  }
  if (chosen.onlineOnly === true) {
    throw new RulesError(`The default time control ${fallback} is online only`);
  }
  return { default: fallback, controls };
}
