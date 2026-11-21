import { useSyncExternalStore } from 'react';
import type { AppUpdates } from './updates';

/**
 * "Reload for the new version" (D90): shown once a new version waits, and only while no game is
 * in progress on the page (`busy`), so an update never interrupts a game.
 */
export function UpdateNotice({ updates, busy }: { updates: AppUpdates; busy: boolean }) {
  const ready = useSyncExternalStore(updates.subscribe, updates.getSnapshot, updates.getSnapshot);
  if (!ready || busy) return null;
  return (
    <p className="facts banner update-notice" role="status">
      A new version of Chess Nines is ready.{' '}
      <button type="button" className="again" onClick={() => updates.apply()}>
        Reload for the new version
      </button>
    </p>
  );
}
