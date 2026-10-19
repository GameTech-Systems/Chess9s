import { useId } from 'react';
import type { Board as BoardData, Position, Square } from '@chess9s/engine';
import {
  FILES,
  SIZE,
  edgeLabels,
  squareFill,
  tetrahedron,
  toScreen,
  viewRotation,
  type Highlights,
} from './view';

// Setup key for pieces that belong to no side (engine's NEUTRAL; importing it would pull Ajv into the bundle).
const NEUTRAL = 'neutral';

const CELL = 100;
const MARGIN = 64;
const BOARD = CELL * SIZE;
const TOTAL = BOARD + MARGIN * 2;

/** Placeholder token colors per side. No art: plain discs with the piece's letter. */
const TOKENS: Record<string, { fill: string; stroke: string; ink: string }> = {
  light: { fill: '#f5efe0', stroke: '#1d1b18', ink: '#1d1b18' },
  dark: { fill: '#23232b', stroke: '#e9e1c9', ink: '#f2ecd8' },
  dragon: { fill: '#d6b25e', stroke: '#2a2112', ink: '#2a2112' },
  [NEUTRAL]: { fill: '#8c939e', stroke: '#14161c', ink: '#14161c' },
};

export interface BoardProps {
  board: BoardData;
  /** Piece id to the letter on its token. */
  pieceLetters: Record<string, string>;
  /** Whose seat the board is drawn from; a seat without a view is drawn upright. */
  seat?: string;
  players?: 2 | 3;
  /** The pieces to draw; without it, the board's start position for `players`. */
  position?: Position;
  /** Marks drawn under the pieces: selection, move targets, last move, check. */
  highlights?: Highlights;
  /** Makes the board playable: called with the square clicked (or chosen by keyboard). */
  onSquareClick?: (at: string) => void;
}

const unique = <T,>(xs: T[]): T[] => [...new Set(xs)];

const EMPTY: Highlights = { targets: [], check: [], movable: [] };

export function Board({
  board,
  pieceLetters,
  seat = 'light',
  players = 2,
  position,
  highlights = EMPTY,
  onSquareClick,
}: BoardProps) {
  const uid = useId();
  const rotate = viewRotation(board.sides.find((s) => s.id === seat));
  const typeLabel = new Map(board.squareTypes.map((t) => [t.id, t.label]));
  const labels = edgeLabels(rotate);
  // The data lists only the special squares; every other square is plain checkered.
  const listed = new Map(board.squares.map((sq) => [sq.at, sq]));
  const squares: Square[] = [...FILES].flatMap((f) =>
    Array.from({ length: SIZE }, (_, i) => `${f}${i + 1}`).map(
      (at) => listed.get(at) ?? { at, types: [] },
    ),
  );
  const setup = board.setups.find((s) => s.players === players);
  const placed: { at: string; id: string; side: string }[] = position
    ? Object.entries(position).map(([at, p]) => ({ at, id: p.piece, side: p.side }))
    : Object.entries(setup?.pieces ?? {}).flatMap(([side, byAt]) =>
        Object.entries(byAt).map(([at, id]) => ({ at, id, side })),
      );
  const bySquare = new Map(placed.map((p) => [p.at, p]));
  const reachable = new Set([...highlights.movable, ...highlights.targets.map((t) => t.at)]);
  const centerOf = (at: string) => {
    const { col, row } = toScreen(at, rotate);
    return { col, row, x: MARGIN + col * CELL + CELL / 2, y: MARGIN + row * CELL + CELL / 2 };
  };

  const tetra = tetrahedron(CELL);
  const pts = (...ps: { x: number; y: number }[]) => ps.map((p) => `${p.x},${p.y}`).join(' ');
  const [a, b, c] = tetra.base;
  const tingYangTurn = players === 3 ? 90 : 0;

  return (
    <svg
      className="board"
      viewBox={`0 0 ${TOTAL} ${TOTAL}`}
      role={onSquareClick ? 'group' : 'img'}
      aria-label={`Chess Nines board, ${seat} seat`}
    >
      <defs>
        <linearGradient id={`${uid}-frame`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b2f3a" />
          <stop offset="1" stopColor="#14161c" />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <clipPath id={`${uid}-clip`}>
          <rect x={MARGIN} y={MARGIN} width={BOARD} height={BOARD} rx="6" />
        </clipPath>
      </defs>

      <rect width={TOTAL} height={TOTAL} rx="28" fill={`url(#${uid}-frame)`} />
      <rect
        x="6"
        y="6"
        width={TOTAL - 12}
        height={TOTAL - 12}
        rx="23"
        fill="none"
        stroke="#c8a45d"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <rect
        x={MARGIN - 7}
        y={MARGIN - 7}
        width={BOARD + 14}
        height={BOARD + 14}
        rx="10"
        fill="none"
        stroke="#c8a45d"
        strokeOpacity="0.8"
        strokeWidth="2"
      />

      <g clipPath={`url(#${uid}-clip)`} shapeRendering="crispEdges">
        {squares.map((sq) => (
          <SquareCell key={sq.at} sq={sq} typeLabel={typeLabel} {...centerOf(sq.at)} />
        ))}
      </g>
      <rect
        x={MARGIN}
        y={MARGIN}
        width={BOARD}
        height={BOARD}
        rx="6"
        fill={`url(#${uid}-gloss)`}
        pointerEvents="none"
      />

      <g className="coords" fontSize="28" textAnchor="middle" fill="#c9b98c">
        {labels.bottom.map((t, i) => (
          <text key={`b${i}`} x={MARGIN + i * CELL + CELL / 2} y={MARGIN + BOARD + 42}>
            {t}
          </text>
        ))}
        {labels.left.map((t, i) => (
          <text key={`l${i}`} x={MARGIN - 32} y={MARGIN + i * CELL + CELL / 2 + 10}>
            {t}
          </text>
        ))}
      </g>

      {/* Center square: a tetrahedron symbol, no rule attached (D36). */}
      <g
        data-tetrahedron=""
        transform={`translate(${centerOf('e5').x} ${centerOf('e5').y}) rotate(${rotate})`}
        strokeLinejoin="round"
        pointerEvents="none"
      >
        <polygon points={pts(tetra.apex, a, b)} fill="#0d3a14" fillOpacity="0.55" />
        <polygon points={pts(tetra.apex, b, c)} fill="#0d3a14" fillOpacity="0.28" />
        <polygon points={pts(tetra.apex, c, a)} fill="#d8f5d0" fillOpacity="0.38" />
        <polygon
          points={pts(a, b, c)}
          fill="none"
          stroke="#e8f7e0"
          strokeOpacity="0.9"
          strokeWidth="2.5"
        />
        <path
          d={`M${tetra.apex.x} ${tetra.apex.y}L${a.x} ${a.y}M${tetra.apex.x} ${tetra.apex.y}L${b.x} ${b.y}M${tetra.apex.x} ${tetra.apex.y}L${c.x} ${c.y}`}
          stroke="#e8f7e0"
          strokeOpacity="0.8"
          strokeWidth="2"
          fill="none"
        />
      </g>

      {/* Ting Yang: placeholder symbol, no art. Turns 90 degrees clockwise in 3-player games. */}
      <g
        data-ting-yang=""
        data-ting-yang-turn={tingYangTurn}
        transform={`translate(${centerOf('i5').x} ${centerOf('i5').y}) rotate(${rotate + tingYangTurn})`}
        fill="none"
        stroke="#1d1b18"
        strokeWidth="4"
        strokeLinejoin="round"
        pointerEvents="none"
      >
        <circle r="26" />
        <circle r="5" fill="#1d1b18" stroke="none" />
        <path d="M0 -26L-8 -39H8Z" fill="#1d1b18" />
      </g>

      <Marks highlights={highlights} centerOf={centerOf} />

      {placed.map(({ at, id, side }) => {
        const { x, y } = centerOf(at);
        const tone = TOKENS[side] ?? TOKENS[NEUTRAL]!;
        const letter = pieceLetters[id] ?? id.charAt(0).toUpperCase();
        return (
          <g
            key={`${side}-${at}`}
            data-piece={id}
            data-at={at}
            data-side={side}
            transform={`translate(${x} ${y})`}
            pointerEvents="none"
          >
            <title>{`${at} · ${id.replace(/-/g, ' ')}`}</title>
            <circle
              r="37"
              fill={tone.fill}
              stroke={tone.stroke}
              strokeWidth="3"
              filter={`url(#${uid}-shadow)`}
            />
            <circle
              r="30"
              fill="none"
              stroke={tone.stroke}
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              y="2"
              fontSize={letter.length > 1 ? 28 : 36}
              fontWeight="600"
              fill={tone.ink}
              fontFamily="Georgia, 'Times New Roman', serif"
            >
              {letter}
            </text>
          </g>
        );
      })}

      {onSquareClick && (
        <g>
          {squares.map(({ at }) => {
            const { x, y } = centerOf(at);
            const piece = bySquare.get(at);
            const name = piece ? `${at}, ${piece.id.replace(/-/g, ' ')}, ${piece.side}` : at;
            return (
              <rect
                key={at}
                data-hit={at}
                x={x - CELL / 2}
                y={y - CELL / 2}
                width={CELL}
                height={CELL}
                fill="transparent"
                role="button"
                aria-label={name}
                tabIndex={reachable.has(at) ? 0 : -1}
                style={{ cursor: reachable.has(at) ? 'pointer' : 'default' }}
                onClick={() => onSquareClick(at)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSquareClick(at);
                  }
                }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

const MARK = {
  last: '#e0b84c',
  selected: '#f4d675',
  target: '#e0b84c',
  capture: '#e0574b',
  check: '#e0574b',
};

/** Selection, move targets, the last move and check, drawn between the squares and the pieces. */
function Marks({
  highlights,
  centerOf,
}: {
  highlights: Highlights;
  centerOf: (at: string) => { x: number; y: number };
}) {
  const box = (at: string) => {
    const { x, y } = centerOf(at);
    return { x: x - CELL / 2, y: y - CELL / 2, width: CELL, height: CELL };
  };
  return (
    <g pointerEvents="none">
      {highlights.lastMove?.map((at) => (
        <rect
          key={`last-${at}`}
          data-last-move={at}
          {...box(at)}
          fill={MARK.last}
          fillOpacity="0.32"
        />
      ))}
      {highlights.check.map((at) => {
        const { x, y } = centerOf(at);
        return (
          <circle
            key={`check-${at}`}
            data-check={at}
            cx={x}
            cy={y}
            r="48"
            fill={MARK.check}
            fillOpacity="0.55"
            stroke={MARK.check}
            strokeWidth="3"
          />
        );
      })}
      {highlights.selected && (
        <rect
          data-selected={highlights.selected}
          {...box(highlights.selected)}
          fill={MARK.selected}
          fillOpacity="0.3"
          stroke={MARK.selected}
          strokeWidth="5"
          strokeOpacity="0.95"
        />
      )}
      {highlights.targets.map(({ at, capture }) => {
        const { x, y } = centerOf(at);
        return capture ? (
          <circle
            key={`target-${at}`}
            data-target={at}
            data-capture=""
            cx={x}
            cy={y}
            r="44"
            fill="none"
            stroke={MARK.capture}
            strokeWidth="7"
            strokeOpacity="0.95"
          />
        ) : (
          <circle
            key={`target-${at}`}
            data-target={at}
            cx={x}
            cy={y}
            r="15"
            fill={MARK.target}
            fillOpacity="0.9"
            stroke="#14161c"
            strokeOpacity="0.5"
            strokeWidth="2"
          />
        );
      })}
    </g>
  );
}

function SquareCell({
  sq,
  typeLabel,
  col,
  row,
  x,
  y,
}: {
  sq: Square;
  typeLabel: Map<string, string>;
  col: number;
  row: number;
  x: number;
  y: number;
}) {
  const name = unique(
    [sq.label, ...sq.types.map((t) => typeLabel.get(t))].filter((t): t is string => !!t),
  );
  const typeAttrs = Object.fromEntries(sq.types.map((t) => [`data-type-${t}`, '']));
  const left = x - CELL / 2;
  const top = y - CELL / 2;
  const has = (t: string) => sq.types.includes(t);
  return (
    <g data-square={sq.at} data-col={col} data-row={row} {...typeAttrs}>
      <title>{[sq.at, ...name].join(' · ')}</title>
      <rect x={left} y={top} width={CELL} height={CELL} fill={squareFill(sq)} />
      {has('safe-zone') && (
        <rect
          x={left + 7}
          y={top + 7}
          width={CELL - 14}
          height={CELL - 14}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
      )}
      {has('coast-gate') && (
        <rect
          x={left + 10}
          y={top + 10}
          width={CELL - 20}
          height={CELL - 20}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.75"
          strokeWidth="3"
          strokeDasharray="10 8"
        />
      )}
      {has('tail-square') && (
        <path
          d={[
            [left + 6, top + 22, left + 6, top + 6, left + 22, top + 6],
            [left + CELL - 22, top + 6, left + CELL - 6, top + 6, left + CELL - 6, top + 22],
            [
              left + CELL - 6,
              top + CELL - 22,
              left + CELL - 6,
              top + CELL - 6,
              left + CELL - 22,
              top + CELL - 6,
            ],
            [left + 22, top + CELL - 6, left + 6, top + CELL - 6, left + 6, top + CELL - 22],
          ]
            .map(([x1, y1, x2, y2, x3, y3]) => `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}`)
            .join('')}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="3"
        />
      )}
    </g>
  );
}
