import { useEffect, useState } from 'react';
import { Game } from './Game';
import { RulePicker } from './RulePicker';
import { Builder } from './Builder';
import { RulesPage } from './RulesPage';
import { Privacy } from './Privacy';
import { Tournament } from './Tournament';
import { DISCUSSIONS_URL, LICENSES_PATH, RIGHTS_HOLDER } from './links';
import { parseShareLink } from './game/share';
import { loadCustoms, saveCustoms } from './game/custom';
import { customInfo, type CustomRuleset, type RulesetInfo } from './game/rules';
import type { Store } from './game/guest';
import { fromGame } from './game/session';
import type { Opened } from './game/record';

export const PRIVACY_PATH = '/privacy';
export const BUILD_PATH = '/build';
export const TOURNAMENT_PATH = '/tournament';

function browserStore(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The year in the copyright line (NOTICE: Copyright 2026). */
const COPYRIGHT_YEAR = 2026;

/** The ruleset id of a rules page path such as /rules/standard-2p, else undefined. */
export const rulesIdOf = (pathname: string): string | undefined =>
  /^\/rules\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)?.[1];

/** Which page a URL path shows. Anything unknown is the game: the host falls back to index.html. */
export const pageOf = (pathname: string): 'privacy' | 'rules' | 'build' | 'tournament' | 'game' => {
  const bare = pathname.replace(/\/+$/, '');
  return bare === PRIVACY_PATH
    ? 'privacy'
    : bare === BUILD_PATH
      ? 'build'
      : bare === TOURNAMENT_PATH
        ? 'tournament'
        : rulesIdOf(pathname) !== undefined
          ? 'rules'
          : 'game';
};

export function App({
  path,
  hash,
  store = browserStore(),
}: {
  path?: string;
  /** The URL hash (a share link carries its ruleset there). */
  hash?: string;
  store?: Store | null;
}) {
  // A share link opens the builder with its ruleset; it is read once, on load.
  const [shared, setShared] = useState(() =>
    parseShareLink(hash ?? (typeof window === 'undefined' ? '' : window.location.hash)),
  );
  const [here, setHere] = useState(
    path ?? (typeof window === 'undefined' ? '/' : window.location.pathname),
  );
  const [picked, setPicked] = useState<RulesetInfo | null>(null);
  // A game record opened for replay (S46): the game it replays to, played on from there.
  const [opened, setOpened] = useState<(Opened & { ok: true }) | null>(null);
  // The player's own rulesets live in this browser only (privacy page).
  const [customs, setCustoms] = useState<CustomRuleset[]>(() => loadCustoms(store));
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const keepCustom = (c: CustomRuleset) => {
    const next = customs.some((o) => o.id === c.id)
      ? customs.map((o) => (o.id === c.id ? c : o))
      : [...customs, c];
    setCustoms(next);
    saveCustoms(store, next);
  };
  const dropCustom = (id: string) => {
    const next = customs.filter((c) => c.id !== id);
    setCustoms(next);
    saveCustoms(store, next);
  };
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
      : page === 'build'
        ? 'Change ruleset'
        : page === 'tournament'
          ? 'Tournaments'
          : picked && page === 'game'
            ? `Hot-seat · ${picked.players} players`
            : 'Hot-seat';
  return (
    <main className="page">
      <header className="masthead">
        <h1>
          Chess Nines<span className="tm">™</span>
        </h1>
        <p>{subtitle}</p>
      </header>
      {page === 'privacy' ? (
        <Privacy />
      ) : page === 'tournament' ? (
        <Tournament />
      ) : page === 'build' ? (
        <Builder
          key={editing ?? (shared ? 'shared' : 'new')}
          {...(editing && { saved: customs.find((c) => c.id === editing) })}
          {...(!editing && shared && { draft: shared })}
          taken={customs.map((c) => c.id)}
          onSave={keepCustom}
          onPlay={(c) => {
            setPicked(customInfo(c));
            navigate('/');
          }}
        />
      ) : page === 'rules' ? (
        <RulesPage
          id={rulesIdOf(here)!}
          customs={customs.map(customInfo)}
          linkTo={go}
          onPlay={(r) => {
            setPicked(r);
            navigate('/');
          }}
        />
      ) : picked ? (
        <Game
          key={opened ? `record-${opened.date}-${picked.id}` : picked.id}
          ruleset={picked}
          {...(opened && { initial: fromGame(opened.game) })}
          onChangeRuleset={() => {
            setOpened(null);
            setPicked(null);
          }}
          onOpenRecord={(r) => {
            setOpened(r);
            setPicked(r.info);
          }}
        />
      ) : (
        <RulePicker
          onPick={setPicked}
          linkTo={go}
          customs={customs.map(customInfo)}
          onBuild={() => {
            setEditing(undefined);
            setShared(undefined);
            navigate(BUILD_PATH);
          }}
          onEdit={(id) => {
            setEditing(id);
            navigate(BUILD_PATH);
          }}
          onDelete={dropCustom}
        />
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
        <a href={TOURNAMENT_PATH} onClick={go(TOURNAMENT_PATH)}>
          Tournaments
        </a>
        {' · '}
        <a href={DISCUSSIONS_URL}>Suggest a variant</a>
        {' · '}
        <a href={LICENSES_PATH}>Licenses</a>
        <span className="legal">
          © {COPYRIGHT_YEAR} {RIGHTS_HOLDER}. Chess Nines™ is a trademark of {RIGHTS_HOLDER}.
          Rulesets other than Official ones are not tournament rules.
        </span>
      </footer>
    </main>
  );
}
