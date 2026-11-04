import { useState } from 'react';
import { HOME_PRESETS, listRulesets, type RulesetInfo } from './game/rules';
import { rulesPath } from './links';
import { JoinByCode } from './JoinByCode';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';
import { CoastPieces } from './CoastPieces';

/**
 * A line for players on each home preset, in place of the ruleset's technical description (which
 * the rules page still shows in full). Display only: the rules are in rules/rulesets/.
 */
export const PRESET_SUMMARIES: Record<string, string> = {
  'standard-2p': 'The full Chess Nines rules. The King moves one square, as in regular chess.',
  'easy-2p':
    'The closest to regular chess, for learning the board: the King may castle, the Queen may cross the void, and pawns have no safe zones.',
  'draft-2p':
    'The full rules with a King that moves up to 2 squares, which makes checkmate harder to force.',
  'heavy-h3-3p':
    'Light, dark and the Dragon, who plays the five Coast pieces. The Dragon Heads move up to 3 squares; the King moves one square.',
  'standard-3p':
    'Light, dark and the Dragon, who plays the five Coast pieces. The full Dragon rules; the King moves one square.',
  'easy-3p': 'A shorter Dragon game for learning: the first checkmate wins.',
  'draft-3p': 'The full Dragon rules with Kings that move up to 2 squares.',
};

/** The two ways to play, as the home page offers them, each board drawn from its own seat. */
const MODES: { players: 2 | 3; title: string; note: string; seat: string }[] = [
  {
    players: 2,
    title: '2 players',
    note: 'Head to head: light against dark. The board as the light side sees it.',
    seat: 'light',
  },
  {
    players: 3,
    title: '3 players',
    note: 'Light, dark and the Dragon. The board as the Dragon sees it, from the Coast.',
    seat: 'dragon',
  },
];

/**
 * The home page: join a room, choose 2 or 3 players, then one of that count's three presets
 * (Standard, Easy Start, Good Practice) or a custom ruleset. Other bundled rulesets of that count
 * are listed under "Rulesets under test".
 */
export function RulePicker({
  players: initialPlayers = 2,
  onPlayers,
  onPick,
  onPlayOnline,
  onJoinRoom,
  linkTo,
  customs = [],
  onBuild,
  onEdit,
  onDelete,
}: {
  /** The player count shown first. */
  players?: 2 | 3;
  /** The player count was changed. */
  onPlayers?: (players: 2 | 3) => void;
  onPick: (ruleset: RulesetInfo) => void;
  /** Make an online room for a ruleset (S53). */
  onPlayOnline?: (ruleset: RulesetInfo) => void;
  /** Go to the room with this code. */
  onJoinRoom?: (code: string) => void;
  /** In-app navigation for the rules links. */
  linkTo?: (to: string) => (e: React.MouseEvent) => void;
  /** The player's own rulesets, kept in this browser. */
  customs?: RulesetInfo[];
  /** Open the builder with a new draft for this player count. */
  onBuild?: (players: 2 | 3) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [players, setPlayers] = useState<2 | 3>(initialPlayers);
  const [deleting, setDeleting] = useState<string | null>(null);
  const choose = (n: 2 | 3) => {
    setPlayers(n);
    onPlayers?.(n);
  };
  const all = listRulesets().filter((r) => r.players === players);
  const presetIds = HOME_PRESETS[players];
  const presets = presetIds
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is RulesetInfo => r !== undefined);
  const testing = all.filter((r) => !presetIds.includes(r.id));
  const own = customs.filter((r) => r.players === players);

  const card = (r: RulesetInfo, summary?: string) => (
    <li
      key={r.id}
      className="ruleset"
      data-playable={r.playable ? '' : undefined}
      data-custom={r.custom ? '' : undefined}
    >
      <div className="ruleset-head">
        <strong>{r.name}</strong>
        {r.defaultFor && (
          <span className="default-tag">
            {r.defaultFor === 3 ? 'Default for 3 players' : 'Default'}
          </span>
        )}
        <span className="badge" data-status={r.status}>
          {r.status}
        </span>
      </div>
      {summary ? (
        <p className="facts">{summary}</p>
      ) : (
        r.description && <p className="facts small">{r.description}</p>
      )}
      <p className="facts small id-line">
        {r.custom ? 'Your own ruleset' : `${r.id} v${r.version}`}
      </p>
      <div className="ruleset-actions">
        {r.playable ? (
          <button type="button" className="again play" onClick={() => onPick(r)}>
            Play
          </button>
        ) : (
          <p className="facts small">Not playable yet</p>
        )}
        {r.online && onPlayOnline && (
          <button type="button" className="again" onClick={() => onPlayOnline(r)}>
            Play online
          </button>
        )}
        <a href={rulesPath(r.id)} onClick={linkTo?.(rulesPath(r.id))}>
          Rules
        </a>
        {r.custom && (
          <>
            <button type="button" className="again" onClick={() => onEdit?.(r.id)}>
              Edit
            </button>
            {deleting === r.id ? (
              <>
                <button
                  type="button"
                  className="again"
                  onClick={() => {
                    setDeleting(null);
                    onDelete?.(r.id);
                  }}
                >
                  Delete {r.name}?
                </button>
                <button type="button" className="again" onClick={() => setDeleting(null)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="again" onClick={() => setDeleting(r.id)}>
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );

  return (
    <section className="picker home" aria-labelledby="picker-title">
      <CoastPieces />

      {onJoinRoom && <JoinByCode onJoin={onJoinRoom} />}

      <h2 id="picker-title">Choose a game</h2>
      <div className="modes" role="group" aria-label="Players">
        {MODES.map((m) => (
          <button
            key={m.players}
            type="button"
            className="mode"
            aria-pressed={players === m.players}
            data-players={m.players}
            onClick={() => choose(m.players)}
          >
            <span className="mode-board" aria-hidden="true">
              <Board
                board={boardData}
                pieceLetters={pieceLetters}
                seat={m.seat}
                players={m.players}
              />
            </span>
            <span className="mode-title">{m.title}</span>
            <span className="mode-note">{m.note}</span>
          </button>
        ))}
      </div>

      <div className="presets" data-players={players}>
        <h3 id="presets-title">Choose a ruleset · {players} players</h3>
        <ul aria-labelledby="presets-title">
          {presets.map((r) => card(r, PRESET_SUMMARIES[r.id]))}
        </ul>

        <div className="build-row">
          <button type="button" className="again build" onClick={() => onBuild?.(players)}>
            Build a custom ruleset
          </button>
          <p className="facts small">
            Start from {players === 3 ? 'the 3-player default' : 'Standard'} and change any
            piece&rsquo;s settings. Kept in this browser.
          </p>
        </div>

        <h3 id="custom-title">Your {players}-player rulesets</h3>
        {own.length > 0 ? (
          <ul aria-labelledby="custom-title">{own.map((r) => card(r))}</ul>
        ) : (
          <p className="facts">None yet. Start from a preset and change what you like.</p>
        )}

        {testing.length > 0 && (
          <details className="testing">
            <summary>Rulesets under test ({testing.length})</summary>
            <p className="facts small">
              Experimental {players}-player rulesets being checked for balance. Not tournament
              rules.
            </p>
            <ul>{testing.map((r) => card(r))}</ul>
          </details>
        )}
      </div>
    </section>
  );
}
