import { useState } from 'react';
import { isRoomCode } from '@chess9s/online/protocol';
import { ONLINE_ONLY_TEXT, useOnline } from './offline/online';

/**
 * The room code in what a player typed or pasted: the code itself in any case and with spaces,
 * or the room link. Null when it is not a room code.
 */
export function parseRoomCode(text: string): string | null {
  const t = text.trim();
  const link = /\/room\/([A-Za-z0-9]+)\/?(?:[?#].*)?$/.exec(t);
  const code = (link ? link[1]! : t).replace(/\s+/g, '').toUpperCase();
  return isRoomCode(code) ? code : null;
}

/** "Join a room": a field for the room code (or the link) and a button. */
export function JoinByCode({
  onJoin,
  online,
}: {
  onJoin: (code: string) => void;
  /** Whether the browser is online; the browser says by default (tests set it). */
  online?: boolean;
}) {
  const live = useOnline();
  const connected = online ?? live;
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <form
      className="join"
      onSubmit={(e) => {
        e.preventDefault();
        const code = parseRoomCode(text);
        if (!connected) return;
        if (code) onJoin(code);
        else setProblem('A room code is 6 letters and numbers, such as K7RX2M.');
      }}
    >
      <label htmlFor="join-code">Join a room</label>
      <div className="join-row">
        <input
          id="join-code"
          aria-label="Room code"
          value={text}
          placeholder="Room code or link"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setProblem(null);
          }}
        />
        <button type="submit" className="again" disabled={!connected}>
          Join
        </button>
      </div>
      {!connected && (
        <p className="facts small offline-notice" role="status">
          {ONLINE_ONLY_TEXT}
        </p>
      )}
      {problem && (
        <p className="facts small" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}
