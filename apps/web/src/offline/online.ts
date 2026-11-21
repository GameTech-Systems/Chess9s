import { useSyncExternalStore } from 'react';

/** What Play online, Join a room and a room page say while the browser is offline (0025). */
export const ONLINE_ONLY_TEXT =
  'You are offline. Online rooms need a connection and come back when you are online again; hot-seat and computer games play offline.';

const subscribe = (fn: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', fn);
  window.addEventListener('offline', fn);
  return () => {
    window.removeEventListener('online', fn);
    window.removeEventListener('offline', fn);
  };
};

// Where the browser does not say (servers, tests), take it as online.
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Whether the browser is online, kept current by its online and offline events. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}
