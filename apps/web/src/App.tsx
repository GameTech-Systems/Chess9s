import { useEffect, useState } from 'react';
import { Game } from './Game';
import { RulePicker } from './RulePicker';
import { Privacy } from './Privacy';
import { DISCUSSIONS_URL } from './links';
import type { RulesetInfo } from './game/rules';

export const PRIVACY_PATH = '/privacy';

/** Which page a URL path shows. Anything unknown is the game: the host falls back to index.html. */
export const pageOf = (pathname: string): 'privacy' | 'game' =>
  pathname.replace(/\/+$/, '') === PRIVACY_PATH ? 'privacy' : 'game';

export function App({ path }: { path?: string }) {
  const [here, setHere] = useState(
    path ?? (typeof window === 'undefined' ? '/' : window.location.pathname),
  );
  const [picked, setPicked] = useState<RulesetInfo | null>(null);
  useEffect(() => {
    const onPop = () => setHere(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  // In-page navigation keeps the app from fetching anything after load.
  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState(null, '', to);
    setHere(to);
  };
  const privacy = pageOf(here) === 'privacy';
  return (
    <main className="page">
      <header className="masthead">
        <h1>Chess Nines</h1>
        <p>{picked && !privacy ? `Hot-seat · ${picked.players} players` : 'Hot-seat'}</p>
      </header>
      {privacy ? (
        <Privacy />
      ) : picked ? (
        <Game key={picked.id} ruleset={picked} onChangeRuleset={() => setPicked(null)} />
      ) : (
        <RulePicker onPick={setPicked} />
      )}
      <footer className="site-footer">
        {privacy ? (
          <a href="/" onClick={go('/')}>
            Back to the game
          </a>
        ) : (
          <a href={PRIVACY_PATH} onClick={go(PRIVACY_PATH)}>
            Privacy
          </a>
        )}
        {' · '}
        <a href={DISCUSSIONS_URL}>Suggest a variant</a>
      </footer>
    </main>
  );
}
