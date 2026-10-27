// The time controls a game can be played with (S65, decision 0017), read from
// rules/timeControls.json. A control belongs to a game, not to a ruleset.
import {
  findControl,
  hotSeatControls as hotSeatOf,
  loadTimeControls,
  type TimeControl,
  type TimeControls,
} from '@chess9s/engine';
import file from '../../../../rules/timeControls.json';

export const timeControls: TimeControls = loadTimeControls(file);

/** The controls a hot-seat game offers: the online-only ones are left out. */
export const hotSeatControls = (tc: TimeControls = timeControls): TimeControl[] => hotSeatOf(tc);

export const controlById = (id: string): TimeControl | undefined => findControl(timeControls, id);
