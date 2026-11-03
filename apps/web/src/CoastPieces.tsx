import { COAST_PIECES } from './brand';

/**
 * The home page's opening: what Chess Nines is, over the five Coast pieces in the order they stand
 * on the Coast in a 2-player game. The art is reserved (assets/brand).
 */
export function CoastPieces() {
  return (
    <div className="hero">
      <p className="hero-lede">
        A 9×9 chess variant: the chess you know, plus a Coast, a void and five new pieces.
      </p>
      <ul className="coast-row" aria-label="The five Coast pieces">
        {COAST_PIECES.map((p) => (
          <li key={p.id} data-piece={p.id}>
            <img src={p.src} alt="" width="220" height="382" decoding="async" />
            <span>{p.name}</span>
          </li>
        ))}
      </ul>
      <p className="hero-note">
        In the board game, the Dragon Heads and the Tail stand on hollow tetrahedral bases that fit
        over the tetrahedron on the Center square, e5.
      </p>
    </div>
  );
}
