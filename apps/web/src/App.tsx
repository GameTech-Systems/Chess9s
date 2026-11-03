import { useEffect, useState } from 'react';
import { Game } from './Game';
import { RulePicker } from './RulePicker';
import { Builder } from './Builder';
import { RulesPage } from './RulesPage';
import { Privacy } from './Privacy';
import { Tournament } from './Tournament';
import { CreateRoom } from './CreateRoom';
import { OnlineRoom } from './OnlineRoom';
import { DISCUSSIONS_URL, LICENSES_PATH, RIGHTS_HOLDER, rulesPath } from './links';
import { parseShareLink } from './game/share';
import { loadCustoms, saveCustoms } from './game/custom';
import {
  customInfo,
  DEFAULT_3P_RULESET_ID,
  DEFAULT_RULESET_ID,
  findRuleset,
  type CustomRuleset,
  type RulesetInfo,
} from './game/rules';
import { EMBLEM_URL } from './brand';
import { savedRulesetId, type Store } from './game/guest';
import { fromGame } from './game/session';
import { roomPath } from './game/share';
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

/** The room code (upper case) of a room page path such as /room/K7RX2M, else undefined. */
export const roomCodeOf = (pathname: string): string | undefined =>
  /^\/room\/([A-Za-z0-9]+)\/?$/.exec(pathname)?.[1]?.toUpperCase();

/** Which page a URL path shows. Anything unknown is the game: the host falls back to index.html. */
export const pageOf = (
  pathname: string,
): 'privacy' | 'rules' | 'build' | 'tournament' | 'room' | 'game' => {
  const bare = pathname.replace(/\/+$/, '');
  return bare === PRIVACY_PATH
    ? 'privacy'
    : bare === BUILD_PATH
      ? 'build'
      : bare === TOURNAMENT_PATH
        ? 'tournament'
        : rulesIdOf(pathname) !== undefined
          ? 'rules'
          : roomCodeOf(pathname) !== undefined
            ? 'room'
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
  // "Play online" was chosen for this ruleset: the create-room screen is showing (S53).
  const [creating, setCreating] = useState<RulesetInfo | null>(null);
  // A game record opened for replay (S46): the game it replays to, played on from there.
  const [opened, setOpened] = useState<(Opened & { ok: true }) | null>(null);
  // The player's own rulesets live in this browser only (privacy page).
  const [customs, setCustoms] = useState<CustomRuleset[]>(() => loadCustoms(store));
  const [editing, setEditing] = useState<string | undefined>(undefined);
  // The home page's player count: the last game's, so "Change ruleset" (or a reload, from the game
  // kept in this browser) comes back to it.
  const [players, setPlayers] = useState<2 | 3>(() => {
    const id = savedRulesetId(store);
    if (!id) return 2;
    return findRuleset(id)?.players ?? customs.find((c) => c.id === id)?.players ?? 2;
  });
  // The preset a new custom ruleset starts from: the default for the player count it was made for.
  const [buildBase, setBuildBase] = useState(DEFAULT_RULESET_ID);
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
  };
  // Every change of screen starts at its top: a game picked low on the home page opens at the
  // board, not at the bottom of the game page (owner, 3 Nov 2026).
  const screen = [
    here,
    picked ? `${picked.id}@${picked.version}` : '',
    creating?.id ?? '',
    opened?.date ?? '',
  ].join('|');
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo?.(0, 0);
  }, [screen]);
  const play = (r: RulesetInfo) => {
    setPlayers(r.players);
    setPicked(r);
  };
  const home = () => {
    setCreating(null);
    setOpened(null);
    setPicked(null);
    navigate('/');
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
          : page === 'room' || (creating && page === 'game')
            ? 'Online'
            : picked && page === 'game'
              ? `Hot-seat · ${picked.players} players`
              : 'Play in your browser · no account needed';
  return (
    <main className="page">
      <header className="masthead">
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            home();
          }}
          aria-label="Chess Nines home"
        >
          <img className="brand-mark" src={EMBLEM_URL} alt="" width="64" height="64" />
          <h1>
            Chess Nines<span className="tm">™</span>
          </h1>
        </a>
        <p>{subtitle}</p>
      </header>
      {page === 'privacy' ? (
        <Privacy />
      ) : page === 'tournament' ? (
        <Tournament />
      ) : page === 'build' ? (
        <Builder
          key={editing ?? (shared ? 'shared' : `new-${buildBase}`)}
          base={buildBase}
          {...(editing && { saved: customs.find((c) => c.id === editing) })}
          {...(!editing && shared && { draft: shared })}
          taken={customs.map((c) => c.id)}
          onSave={keepCustom}
          onPlay={(c) => {
            play(customInfo(c));
            navigate('/');
          }}
        />
      ) : page === 'rules' ? (
        <RulesPage
          id={rulesIdOf(here)!}
          customs={customs.map(customInfo)}
          linkTo={go}
          onPlay={(r) => {
            play(r);
            navigate('/');
          }}
        />
      ) : page === 'room' ? (
        <OnlineRoom
          key={roomCodeOf(here)}
          code={roomCodeOf(here)!}
          store={store}
          onLeave={() => navigate('/')}
          linkTo={go}
        />
      ) : creating ? (
        <CreateRoom
          ruleset={creating}
          store={store}
          linkTo={go}
          onCancel={() => setCreating(null)}
          onCreated={(code) => {
            setCreating(null);
            navigate(roomPath(code));
          }}
        />
      ) : picked ? (
        <Game
          key={opened ? `record-${opened.date}-${picked.id}` : picked.id}
          ruleset={picked}
          {...(opened && { initial: fromGame(opened.game, opened.timed) })}
          onChangeRuleset={() => {
            setOpened(null);
            setPicked(null);
          }}
          onPlayOnline={() => setCreating(picked)}
          onJoinRoom={(code) => navigate(roomPath(code))}
          onOpenRecord={(r) => {
            setOpened(r);
            play(r.info);
          }}
        />
      ) : (
        <RulePicker
          players={players}
          onPlayers={setPlayers}
          onPick={play}
          onPlayOnline={setCreating}
          onJoinRoom={(code) => navigate(roomPath(code))}
          linkTo={go}
          customs={customs.map(customInfo)}
          onBuild={(n) => {
            setEditing(undefined);
            setShared(undefined);
            setBuildBase(n === 3 ? DEFAULT_3P_RULESET_ID : DEFAULT_RULESET_ID);
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
        <a href={rulesPath(DEFAULT_RULESET_ID)} onClick={go(rulesPath(DEFAULT_RULESET_ID))}>
          How to play
        </a>
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
