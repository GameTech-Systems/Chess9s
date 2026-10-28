import { useState } from 'react';
import { RANDOM_SEAT, type SeatChoice } from '@chess9s/online/protocol';
import { RoomRulesetCard } from './RoomRulesetCard';
import { createMessage, createRoom, type Fetch } from './game/api';
import type { Store } from './game/guest';
import { saveSeat } from './game/onlineStore';
import type { RulesetInfo } from './game/rules';
import { chooseSeat, sidesOf, toggleComputer } from './game/roomSetup';

const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

/**
 * "Play online" (D52): make a room for a ruleset and choose a side (random is preselected). A
 * 3-player ruleset makes a 3-seat room, where the creator may also give one or two seats to the
 * computer (S63, D61). The room's code and link come on the room page; the seat tokens are kept in
 * this browser only.
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
  const [computer, setComputer] = useState<string[]>([]);
  const sides = sidesOf(ruleset.players);
  const three = ruleset.players === 3;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const create = async () => {
    setBusy(true);
    setProblem(null);
    const made = await createRoom(fetcher, createMessage(ruleset, seat, computer));
    if (!made.ok) {
      setBusy(false);
      return setProblem(made.problem);
    }
    saveSeat(store, made.snapshot.code, {
      seat: made.snapshot.seat,
      token: made.snapshot.token,
      ...(made.snapshot.computerTokens && { computer: made.snapshot.computerTokens }),
    });
    onCreated(made.snapshot.code);
  };
  return (
    <section className="picker" aria-labelledby="create-title">
      <h2 id="create-title">Play online</h2>
      <RoomRulesetCard ruleset={{ ...ruleset, name: ruleset.name }} linkTo={linkTo} />
      <div className="segmented" role="group" aria-label="Your side">
        {[...sides, RANDOM_SEAT].map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={seat === id}
            onClick={() => {
              const plan = chooseSeat(seat, computer, id);
              setSeat(plan.seat);
              setComputer(plan.computer);
            }}
          >
            {title(id)}
          </button>
        ))}
      </div>
      {three && (
        <>
          <div className="segmented" role="group" aria-label="Computer plays">
            {sides.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={computer.includes(id)}
                disabled={
                  (id === seat && seat !== RANDOM_SEAT) ||
                  toggleComputer(seat, computer, id).length === computer.length
                }
                onClick={() => setComputer(toggleComputer(seat, computer, id))}
              >
                {title(id)}
              </button>
            ))}
          </div>
          <p className="facts small">
            Pick up to two seats for the computer to play. This browser plays them, so keep the room
            open in this browser: if it is closed, the game waits for it, as it would for a person.
            Every other seat is for a person with the link.
          </p>
        </>
      )}
      <p className="facts small">
        You get a room code and a link to send to {three ? 'the other players' : 'your opponent'}.
        The room keeps the ruleset and the moves, and a secret seat token that stays in this
        browser: no names or accounts. See{' '}
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
