import { useState } from 'react';
import { Board } from './board/Board';
import { boardData, pieceLetters } from './board/data';

const SEATS: { id: string; label: string; threePlayerOnly?: boolean }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'dragon', label: 'Dragon', threePlayerOnly: true },
];

export function App() {
  const [seat, setSeat] = useState('light');
  const [players, setPlayers] = useState<2 | 3>(2);

  const choosePlayers = (n: 2 | 3) => {
    setPlayers(n);
    if (n === 2 && seat === 'dragon') setSeat('light');
  };

  return (
    <main className="page">
      <header className="masthead">
        <h1>Chess Nines</h1>
        <p>Board preview · start position</p>
      </header>

      <div className="controls">
        <div className="segmented" role="group" aria-label="Players">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={players === n}
              onClick={() => choosePlayers(n)}
            >
              {n} players
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Seat">
          {SEATS.filter((s) => !s.threePlayerOnly || players === 3).map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={seat === s.id}
              onClick={() => setSeat(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Board board={boardData} pieceLetters={pieceLetters} seat={seat} players={players} />
    </main>
  );
}
