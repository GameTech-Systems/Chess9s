import { DISCUSSIONS_URL } from './links';

/** The part of `window` used here. */
interface Target {
  addEventListener(type: 'error' | 'unhandledrejection', listener: () => void): void;
}

/**
 * Last resort for errors React never sees (a failed script, a crash before the first render): if
 * the page is still empty, `show` puts a plain message there. Errors after a render are left to
 * the error boundary.
 */
export function installErrorFallback(
  target: Target,
  isEmpty: () => boolean,
  show: () => void,
): void {
  const onError = () => {
    if (isEmpty()) show();
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onError);
}

/** Plain-DOM message for `installErrorFallback`: no React, no styles needed. */
export function showPlainError(root: HTMLElement): void {
  const h = document.createElement('h1');
  h.textContent = 'Something went wrong';
  const p = document.createElement('p');
  p.append('Chess Nines could not start. Try reloading the page, or ');
  const a = document.createElement('a');
  a.href = DISCUSSIONS_URL;
  a.textContent = 'tell us in Discussions';
  p.append(a, '.');
  root.replaceChildren(h, p);
}
