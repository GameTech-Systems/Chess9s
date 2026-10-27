import { useState } from 'react';
import { RANDOM_SEAT, type SeatChoice } from '@chess9s/online/protocol';
import { RoomRulesetCard } from './RoomRulesetCard';
import { boardData } from './board/data';
import { createMessage, createRoom, type Fetch } from './game/api';
import type { Store } from './game/guest';
import { saveSeat } from './game/onlineStore';
import type { RulesetInfo } from './game/rules';

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/** The sides of a 2-player game, from the board's data. */
const SIDES = Object.keys(boardData.setups.find((s) => s.players === 2)?.pieces ?? {});

/**
 * "Play online" (D52): make a room for a ruleset and choose a side (random is preselected). The
 * room's code and link come on the room page; the seat token is kept in this browser only.
 */
export function CreateRoom({
  ruleset,
  store,
  onCancel,
  onCreated,
  fetcher = (url, init) => fetch(url, init),
  linkTo,
}: {
  ruleset: RulesetInfo;
  store: Store | null;
  onCancel: () => void;
  /** The room was made; the app shows its page. */
  onCreated: (code: string) => void;
  fetcher?: Fetch;
  linkTo?: (to: string) => (e: React.MouseEvent) => void;
}) {
  const [seat, setSeat] = useState<SeatChoice>(RANDOM_SEAT);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const create = async () => {
    setBusy(true);
    setProblem(null);
    const made = await createRoom(fetcher, createMessage(ruleset, seat));
    if (!made.ok) {
      setBusy(false);
      return setProblem(made.problem);
    }
    saveSeat(store, made.snapshot.code, { seat: made.snapshot.seat, token: made.snapshot.token });
    onCreated(made.snapshot.code);
  };
  return (
    <section className="picker" aria-labelledby="create-title">
      <h2 id="create-title">Play online</h2>
      <RoomRulesetCard ruleset={{ ...ruleset, name: ruleset.name }} linkTo={linkTo} />
      <div className="segmented" role="group" aria-label="Your side">
        {[...SIDES, RANDOM_SEAT].map((id) => (
          <button key={id} type="button" aria-pressed={seat === id} onClick={() => setSeat(id)}>
            {title(id)}
          </button>
        ))}
      </div>
      <p className="facts small">
        You get a room code and a link to send to your opponent. The room keeps the ruleset and the
        moves, and a secret seat token that stays in this browser: no names or accounts. See{' '}
        <a href="/privacy" onClick={linkTo?.('/privacy')}>
          Privacy
        </a>
        .
      </p>
      {problem && (
        <p className="facts" role="alert">
          {problem}
        </p>
      )}
      <div className="ruleset-actions">
        <button type="button" className="again" disabled={busy} onClick={() => void create()}>
          Create room
        </button>
        <button type="button" className="again" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
