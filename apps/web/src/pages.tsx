// Pages most visits never open, loaded on demand (row 4, S95): the first script carries the game,
// the board and the home page; each page here is its own script, fetched when first shown. The
// offline worker precaches every script the build writes (decision 0025), so these open offline
// too. A failed fetch (a deploy in between, a dropped network) reaches the error screen, and its
// Reload tries again.
import { createElement, lazy, useState, type ComponentType } from 'react';

/** A page that loads on first render (inside a Suspense boundary), or at once once preloaded. */
export interface OnDemand<P extends object> {
  (props: P): ReturnType<typeof createElement>;
  /** Fetch the page's script now; a failed fetch is tried again next time. */
  preload(): Promise<void>;
}

export function onDemand<P extends object>(load: () => Promise<ComponentType<P>>): OnDemand<P> {
  let ready: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const fetchPage = () =>
    (pending ??= load().then(
      (page) => (ready = page),
      (error: unknown) => {
        pending = null;
        throw error;
      },
    ));
  const Lazy = lazy(() => fetchPage().then((page) => ({ default: page })));
  function Page(props: P) {
    // Decided once per mount, so a page that loads while shown is not mounted a second time.
    const [direct] = useState(() => ready);
    return createElement((direct ?? Lazy) as ComponentType<P>, props);
  }
  return Object.assign(Page, { preload: () => fetchPage().then(() => undefined) });
}

export const Builder = onDemand(() => import('./Builder').then((m) => m.Builder));
export const CreateRoom = onDemand(() => import('./CreateRoom').then((m) => m.CreateRoom));
export const HowToPlay = onDemand(() => import('./HowToPlay').then((m) => m.HowToPlay));
export const OnlineRoom = onDemand(() => import('./OnlineRoom').then((m) => m.OnlineRoom));
export const Privacy = onDemand(() => import('./Privacy').then((m) => m.Privacy));
export const RulesPage = onDemand(() => import('./RulesPage').then((m) => m.RulesPage));

/** The pages above, by module name. */
export const ON_DEMAND = [
  'Builder',
  'CreateRoom',
  'HowToPlay',
  'OnlineRoom',
  'Privacy',
  'RulesPage',
];

/** Load every page now: tests that render the app call it first. */
export const preloadPages = async (): Promise<void> => {
  await Promise.all(
    [Builder, CreateRoom, HowToPlay, OnlineRoom, Privacy, RulesPage].map((p) => p.preload()),
  );
};
