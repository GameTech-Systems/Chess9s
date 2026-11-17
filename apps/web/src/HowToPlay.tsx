import { HOME_PRESETS, listRulesets, statusLabel, type RulesetInfo } from './game/rules';
import { RULES_DOC_URL, rulesPath } from './links';

/**
 * What a visitor reads about each preset on this page, in place of the technical descriptions the
 * rules pages show. Display text only: the rules themselves are in rules/rulesets/. Each line
 * stands on its own, so it says nothing of any other ruleset.
 */
export const HOW_TO_PRESETS: Record<string, string> = {
  'standard-2p': 'The game as described above. Bot self-play found the two sides evenly matched.',
  'easy-2p':
    'The closest to regular chess, for learning the board. Light moves first, the King may castle, the Queen may cross the void anywhere, any piece except the Queen may stand on E5, and pawns have no safe squares. Casual play.',
  'draft-2p':
    'The King moves up to 2 squares, which makes checkmate harder to force. Everything else is as described above. Bot self-play found the two sides evenly matched.',
  'heavy-h3-3p':
    'The Dragon game as described above. Bot self-play found the three seats close to even.',
  'easy-3p':
    'A shorter Dragon game for learning. The King may castle, the Queen may cross the void anywhere, pawns have no safe squares, the Dragon’s pieces give check, and the first checkmate wins. Casual play.',
  'draft-3p':
    'Kings move up to 2 squares and the Dragon Heads slide as far as they like. Still being tested.',
};

function Presets({
  players,
  linkTo,
}: {
  players: 2 | 3;
  linkTo?: (to: string) => (e: React.MouseEvent) => void;
}) {
  const all = listRulesets();
  const presets = HOME_PRESETS[players]
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is RulesetInfo => r !== undefined);
  return (
    <ul className="how-presets">
      {presets.map((r) => (
        <li key={r.id}>
          <strong>{players === 3 ? r.name.replace(/ \(3-player\)$/, '') : r.name}</strong>{' '}
          <span className="badge" data-status={r.status}>
            {statusLabel(r.status)}
          </span>{' '}
          {HOW_TO_PRESETS[r.id]}{' '}
          <a href={rulesPath(r.id)} onClick={linkTo?.(rulesPath(r.id))}>
            Full rules
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * How to play Chess Nines, for a visitor who knows regular chess and has seen nothing of this game:
 * the board, the pieces, the special squares, the Dragon game, then the settings and the presets.
 */
export function HowToPlay({
  linkTo,
  onHome,
  onBuild,
}: {
  /** In-app navigation for the links to rules pages. */
  linkTo?: (to: string) => (e: React.MouseEvent) => void;
  /** Go to the home page, where a game is chosen. */
  onHome?: () => void;
  /** Open the builder for a new ruleset. */
  onBuild?: () => void;
}) {
  return (
    <article className="prose how-to-play" aria-labelledby="how-title">
      <h2 id="how-title">How to play</h2>
      <p>
        Chess Nines is chess on a 9×9 board, with five extra pieces and a few special squares. You
        win the way you do in chess: checkmate the other King. The Rooks, Knights, Bishops, Queens,
        Kings and pawns you know all start on their usual squares and move as they do in chess, with
        the differences below.
      </p>

      <h3>The board</h3>
      <ul>
        <li>
          There are nine files, A to I, and nine ranks, 1 to 9. Light starts on ranks 1 and 2 and
          dark on ranks 8 and 9. Kings start on F1 and F9, Queens on E1 and E9.
        </li>
        <li>
          File A is the <strong>Coast</strong>, a column of its own. It is home to the five extra
          pieces and is closed at the start.
        </li>
        <li>
          Rank 5 is the <strong>void</strong>, a gray row across the middle (B5, C5, D5, F5, G5 and
          H5), with <strong>E5</strong> at the center and <strong>I5</strong> marked at the end.
        </li>
        <li>
          Colored squares mark where pawns are safe (see Pawns). The board is a mirror image across
          the void, so both sides start equal.
        </li>
      </ul>

      <h3>The pieces</h3>
      <p>Each side has the usual sixteen pieces. The King moves one square in any direction.</p>
      <p>Five extra pieces live on the Coast:</p>
      <ul>
        <li>
          <strong>Dragon Head</strong>: one each, on A1 (light) and A9 (dark). It moves any distance
          in a straight line in any direction, like a Queen, and it may cross the void and stand on
          E5.
        </li>
        <li>
          <strong>Sun</strong> (light, A2) and <strong>Moon</strong> (dark, A8): one square in any
          direction, or two squares straight forward on its first move.
        </li>
        <li>
          <strong>Dragon Tail</strong> (A5): it belongs to neither side, and either player may move
          it. It jumps among A5, E5 and I5, whichever is empty. It never captures, never gives
          check, and can&rsquo;t be captured.
        </li>
      </ul>

      <h3>The void and the center</h3>
      <ul>
        <li>
          Any piece except a Queen may stand on a void square. A Queen can&rsquo;t stand on the void
          or pass over it. She crosses at A5, at I5, or by passing over an empty E5 in a straight
          line.
        </li>
        <li>
          Only the Dragon Heads and the Dragon Tail may stand on E5. Queens, Kings, Knights and the
          Sun and Moon may pass over it when it is empty, but Rooks and Bishops can&rsquo;t slide
          through it. No piece passes through an occupied E5.
        </li>
      </ul>

      <h3>Pawns</h3>
      <ul>
        <li>
          Pawns move, capture, take en passant and promote as in chess: light promotes on rank 9 and
          dark on rank 1, to a Queen, Rook, Bishop or Knight. No pawn may enter E5 or the Coast.
        </li>
        <li>
          Each pawn has a colored ring: the color of the file it started on. Once a pawn has crossed
          the void, it can&rsquo;t be captured while it stands on the colored square of its own file
          on the other side. It can still move and capture from there.
        </li>
      </ul>

      <h3>The Coast</h3>
      <ul>
        <li>
          Until it opens, no Coast piece may move. On their turn either player may open it by
          spending the move to put the Dragon Tail from A5 on E5. Once open, it stays open.
        </li>
        <li>
          After that, the Dragon Heads, the Sun and the Moon move off the Coast and back like any
          piece, and either player may move the Tail, but not on two of their own turns in a row
          (the player who opened the Coast may move it on once more, to I5).
        </li>
        <li>
          Only Kings and Queens may enter the Coast. Coast pieces can be captured there, except the
          Tail.
        </li>
      </ul>

      <h3>Winning and drawing</h3>
      <p>
        Dark moves first. Checkmate wins, and a Dragon Head, the Sun or the Moon gives check like
        any other piece. Stalemate is a draw, and so are threefold repetition, the 50-move rule and
        too little material to checkmate.
      </p>

      <h3>Playing with three</h3>
      <p>
        In a 3-player game a third player, the Dragon, plays all five Coast pieces. Turns go dark,
        light, Dragon, and the board turns to face whoever is to move. Dark and light have no Coast
        pieces.
      </p>
      <ul>
        <li>
          Each of the Dragon&rsquo;s pieces first leaves the Coast through A5. The Dragon Heads
          slide up to 3 squares, the Tail up to 8, and the Sun and Moon one square at a time on the
          Coast and up to 2 squares anywhere else.
        </li>
        <li>
          From the Coast, a Dragon piece attacks only other Coast squares. Kings and Queens may
          capture Dragon pieces there.
        </li>
        <li>
          Dragon pieces don&rsquo;t give check. A King on a square the Dragon attacks is not in
          check, but the Dragon may capture it on its turn. Show danger marks such a King.
        </li>
        <li>
          Dark and light win by checkmating each other&rsquo;s King. If the Dragon captures a King,
          that side&rsquo;s remaining pieces turn to stone (they block, but never move or get
          captured) and its turns are skipped. The Dragon then plays on against the last King, and
          wins by checkmating it.
        </li>
        <li>
          The Tail is the Dragon&rsquo;s King. The Dragon loses only when the Sun, the Moon and both
          Dragon Heads are captured and the Tail is checkmated.
        </li>
      </ul>

      <h3>Making a move</h3>
      <p>
        Pick one of your pieces, then a marked square. Undo takes back one move. Show legal moves
        and Show danger help you look ahead.
      </p>

      <h3>Rules you can switch</h3>
      <p>
        Every rule above is a setting with a list of options: how far the King moves, whether Queens
        may cross the void, where pawns are safe, how the Dragon loses and more. A preset is a set
        of choices, and each one has its own rules page that lists every setting. Three presets are
        ready to play for each number of players.
      </p>
      <h4>2 players</h4>
      <Presets players={2} {...(linkTo && { linkTo })} />
      <h4>3 players</h4>
      <Presets players={3} {...(linkTo && { linkTo })} />
      <p>
        Want your own? Build a custom ruleset: start from a preset, switch any setting, and play it.
        The builder shows what you have changed from the preset you started with.
      </p>
      <p className="how-actions">
        <button type="button" className="again play" onClick={onHome}>
          Choose a game
        </button>{' '}
        <button type="button" className="again" onClick={onBuild}>
          Build a custom ruleset
        </button>
      </p>
      <p className="meta">
        The{' '}
        <a href={RULES_DOC_URL} target="_blank" rel="noopener noreferrer">
          rules guide
        </a>{' '}
        explains every piece and square in more detail.
      </p>
    </article>
  );
}
