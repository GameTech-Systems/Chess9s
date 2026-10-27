import { boardData } from './board/data';
import { pawnColor } from './board/view';
import {
  findRuleset,
  listRulesets,
  rulesetSettings,
  type RulesetInfo,
  type Setting,
} from './game/rules';
import { howToPlay } from './Rules';
import { RULES_DOC_URL, rulesPath, rulesetDataUrl } from './links';

/** The registry's groups, in the order the page lists them. */
const GROUP_ORDER = [
  'King',
  'Queen',
  'Pawns',
  'Center',
  'Coast',
  'Dragon Tail',
  'Dragon Heads',
  'Sun and Moon',
  'Turns and draws',
  'Setup',
];

/** Settings grouped by the registry's `group`, registry order inside each group. */
export function grouped(settings: Setting[]): { title: string; settings: Setting[] }[] {
  const titles = [...GROUP_ORDER, ...new Set(settings.map((s) => s.group))].filter(
    (t, i, all) => all.indexOf(t) === i,
  );
  return titles
    .map((title) => ({ title, settings: settings.filter((s) => s.group === title) }))
    .filter((g) => g.settings.length > 0);
}

function Swatch({ color }: { color?: string | undefined }) {
  // SVG fill, not a style attribute, so the strict Content-Security-Policy allows it.
  return (
    <svg className="swatch" viewBox="0 0 16 16" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill={color ?? 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Each starting file's pawn colors and, under this ruleset, where those pawns are safe. */
function PawnTable({ safeZones }: { safeZones: unknown }) {
  const sides = boardData.setups.find((s) => s.players === 2)?.pieces ?? {};
  const homeOf = (side: string, file: string) =>
    Object.entries(sides[side] ?? {}).find(([at, id]) => id === 'pawn' && at[0] === file)?.[0];
  const safeOn = (side: string, file: string) => {
    if (safeZones === 'off') return 'Not protected';
    const other = boardData.squares.filter(
      (sq) => sq.types.includes('safe-zone') && sq.side !== undefined && sq.side !== side,
    );
    if (safeZones === 'any-colored-square') return 'Any colored square across the void';
    const square = other.find((sq) => sq.at[0] === file);
    return square ? square.at.toUpperCase() : 'None';
  };
  const files = [...'bcdefghi'];
  return (
    <table className="pawn-table">
      <thead>
        <tr>
          <th scope="col">File</th>
          <th scope="col">Light pawn</th>
          <th scope="col">Safe on</th>
          <th scope="col">Dark pawn</th>
          <th scope="col">Safe on</th>
        </tr>
      </thead>
      <tbody>
        {files.map((f) => {
          const light = pawnColor(boardData, 'light', homeOf('light', f));
          const dark = pawnColor(boardData, 'dark', homeOf('dark', f));
          return (
            <tr key={f}>
              <th scope="row">{f.toUpperCase()}</th>
              <td>
                <Swatch color={light?.color} /> {light?.name ?? 'No color'}
              </td>
              <td>{safeOn('light', f)}</td>
              <td>
                <Swatch color={dark?.color} /> {dark?.name ?? 'No color'}
              </td>
              <td>{safeOn('dark', f)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * The full rules of one ruleset at /rules/<id>: every setting it plays, read from the data, so
 * the page always matches the ruleset that is loaded.
 */
export function RulesPage({
  id,
  onPlay,
  linkTo,
  customs = [],
}: {
  id: string;
  /** The player's own rulesets, kept in this browser: their rules pages work here only. */
  customs?: RulesetInfo[];
  /** Start a game on this ruleset. */
  onPlay?: (ruleset: RulesetInfo) => void;
  /** In-app navigation for links to other rules pages. */
  linkTo?: (to: string) => (e: React.MouseEvent) => void;
}) {
  const info = findRuleset(id) ?? customs.find((r) => r.id === id);
  if (!info) {
    return (
      <article className="prose rules-page" aria-labelledby="rules-page-title">
        <h2 id="rules-page-title">Rules</h2>
        <p>
          No ruleset called <code>{id}</code>. These are the rulesets in this build:
        </p>
        <ul>
          {listRulesets().map((r) => (
            <li key={r.id}>
              <a href={rulesPath(r.id)} onClick={linkTo?.(rulesPath(r.id))}>
                {r.name}
              </a>
            </li>
          ))}
        </ul>
      </article>
    );
  }
  const settings = rulesetSettings(info);
  const changed = settings.filter((s) => s.changed);
  const safeZones = settings.find((s) => s.id === 'pawn.safeZones')?.value;
  return (
    <article className="rules-page" aria-labelledby="rules-page-title">
      <header className="rules-page-head">
        <h2 id="rules-page-title">
          {info.name}{' '}
          <span className="badge" data-status={info.status}>
            {info.status}
          </span>
        </h2>
        <p className="meta">
          {info.id} v{info.version} · {info.players} players
          {info.defaultFor === 2 && ' · the default ruleset'}
          {info.defaultFor === 3 && ' · the default 3-player ruleset'}
        </p>
        {info.description && <p>{info.description}</p>}
        {info.status !== 'official' && (
          <p className="meta">
            Not an official tournament ruleset (see Governance in the repository).
            {info.custom && ' Your own ruleset: it is kept in this browser only.'}
          </p>
        )}
        {info.playable && onPlay && (
          <button type="button" className="again" onClick={() => onPlay(info)}>
            Play {info.name}
          </button>
        )}
      </header>

      <section>
        <h3>How to play</h3>
        <ul>
          {howToPlay(info.players).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>What this ruleset changes</h3>
        {changed.length === 0 ? (
          <p>Every setting at its default.</p>
        ) : (
          <ul>
            {changed.map((s) => (
              <li key={s.id}>
                <strong>{s.label}</strong>: {s.valueLabel}{' '}
                <span className="meta">(default {s.defaultLabel})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {info.players === 2 && (
        <section>
          <h3>Pawn colors and safe zones</h3>
          <p>
            Each pawn&apos;s ring is the color of the file it started on, and it keeps that color if
            it captures onto another file.
          </p>
          <PawnTable safeZones={safeZones} />
        </section>
      )}

      <section>
        <h3>Every setting</h3>
        <p className="meta">
          Every rule is a setting with a default and a list of options. Marked settings differ from
          the default.
        </p>
        {grouped(settings).map((g) => (
          <section key={g.title} className="setting-group">
            <h4>{g.title}</h4>
            <dl>
              {g.settings.map((s) => (
                <div
                  key={s.id}
                  className="setting"
                  data-setting={s.id}
                  data-changed={s.changed ? '' : undefined}
                >
                  <dt>{s.label}</dt>
                  <dd className="value">
                    <span className="value-label">{s.valueLabel}</span>
                    {s.changed && (
                      <span className="changed-tag">changed · default {s.defaultLabel}</span>
                    )}
                  </dd>
                  {s.description && <dd className="desc">{s.description}</dd>}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </section>

      <section>
        <h3>More</h3>
        <p>
          The{' '}
          <a href={RULES_DOC_URL} target="_blank" rel="noopener noreferrer">
            rules guide
          </a>{' '}
          explains every piece and square at the Chess Nines defaults; where it differs from this
          page, the settings here are the rules of {info.name}. For tournaments, see the{' '}
          <a href="/tournament">tournament rules</a>.
          {!info.custom && (
            <>
              {' '}
              The ruleset&apos;s data:{' '}
              <a href={rulesetDataUrl(info.id)} target="_blank" rel="noopener noreferrer">
                rules/rulesets/{info.id}.json
              </a>
              .
            </>
          )}
        </p>
      </section>
    </article>
  );
}
