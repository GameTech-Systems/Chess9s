import { useState } from 'react';
import { boardCard, shareOrSave, type Caption } from './game/boardImage';

/**
 * "Save board image": a picture of the board as it is on screen, with the result, for sharing how
 * a game was won. The board is found inside the same table as the button.
 */
export function BoardImageButton({ caption, disabled }: { caption: Caption; disabled?: boolean }) {
  const [problem, setProblem] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={(e) => {
          const svg = e.currentTarget.closest('.table')?.querySelector<SVGSVGElement>('svg.board');
          if (!svg) return;
          setProblem(false);
          setBusy(true);
          boardCard(svg, caption)
            .then((blob) => shareOrSave(blob))
            .catch(() => setProblem(true))
            .finally(() => setBusy(false));
        }}
      >
        Save board image
      </button>
      {problem && (
        <span className="facts small" role="alert">
          Could not make the image.
        </span>
      )}
    </>
  );
}
