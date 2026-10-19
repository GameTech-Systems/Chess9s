// The real board and piece letters, straight from rules/. Tests check the data
// against the schemas; the renderer only reads it.
import type { Board } from '@chess9s/engine';
import board from '../../../../rules/boards/standard-9x9.json';

export const boardData = board as unknown as Board;

const pieces = import.meta.glob<{ id: string; letter: string }>('../../../../rules/pieces/*.json', {
  eager: true,
  import: 'default',
});

/** Piece id to the letter shown on its placeholder token. */
export const pieceLetters: Record<string, string> = Object.fromEntries(
  Object.values(pieces).map((p) => [p.id, p.letter]),
);
