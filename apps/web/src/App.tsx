import { useEffect, useState } from 'react';
import { Game } from './Game';
import { RulePicker } from './RulePicker';
import { RulesPage } from './RulesPage';
import { Privacy } from './Privacy';
import { DISCUSSIONS_URL } from './links';
import type { RulesetInfo } from './game/rules';

export const PRIVACY_PATH = '/privacy';

/** The ruleset id of a rules page path such as /rules/standard-2p, else undefined. */
export const rulesIdOf = (pathname: string): string | undefined =>
  /^\/rules\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)?.[1];

/** Which page a URL path shows. Anything unknown is the game: the host falls back to index.html. */
export const pageOf = (pathname: string): 'privacy' | 'rules' | 'game' =>
  pathname.replace(/\/+$/, '') === PRIVACY_PATH
    ? 'privacy'
    : rulesIdOf(pathname) !== undefined
      ? 'rules'
      : 'game';

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
  const navigate = (to: string) => {
    window.history.pushState(null, '', to);
    setHere(to);
    window.scrollTo?.(0, 0);
  };
  // In-page navigation keeps the app from fetching anything after load.
  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };
  const page = pageOf(here);
  const subtitle =
    page === 'rules'
      ? 'Rules'
      : picked && page === 'game'
        ? `Hot-seat · ${picked.players} players`
        : 'Hot-seat';
  return (
    <main className="page">
      <header className="masthead">
        <h1>Chess Nines</h1>
        <p>{subtitle}</p>
      </header>
      {page === 'privacy' ? (
        <Privacy />
      ) : page === 'rules' ? (
        <RulesPage
          id={rulesIdOf(here)!}
          linkTo={go}
          onPlay={(r) => {
            setPicked(r);
            navigate('/');
          }}
        />
      ) : picked ? (
        <Game key={picked.id} ruleset={picked} onChangeRuleset={() => setPicked(null)} />
      ) : (
        <RulePicker onPick={setPicked} linkTo={go} />
      )}
      <footer className="site-footer">
        {page !== 'game' ? (
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
