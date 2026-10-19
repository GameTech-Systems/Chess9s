import { Game } from './Game';

export function App() {
  return (
    <main className="page">
      <header className="masthead">
        <h1>Chess Nines</h1>
        <p>Hot-seat · 2 players</p>
      </header>
      <Game />
    </main>
  );
}
