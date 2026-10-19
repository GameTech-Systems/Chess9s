import { useState } from 'react';
import { Game } from './Game';
import { RulePicker } from './RulePicker';
import type { RulesetInfo } from './game/rules';

export function App() {
  const [picked, setPicked] = useState<RulesetInfo | null>(null);
  return (
    <main className="page">
      <header className="masthead">
        <h1>Chess Nines</h1>
        <p>{picked ? `Hot-seat · ${picked.players} players` : 'Hot-seat'}</p>
      </header>
      {picked ? (
        <Game key={picked.id} ruleset={picked} onChangeRuleset={() => setPicked(null)} />
      ) : (
        <RulePicker onPick={setPicked} />
      )}
    </main>
  );
}
