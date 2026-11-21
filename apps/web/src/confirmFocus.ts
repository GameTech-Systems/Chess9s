// Focus for a confirm step that replaces the button that opened it (Gate 1's keyboard pass, S95):
// without this, the opener disappears and focus falls to the page. Opening it focuses its safe
// choice ("Keep playing"); closing it gives focus back to the opener, when that is on the page again.
import { useEffect, useRef, type RefObject } from 'react';

export function useConfirmFocus(
  open: boolean,
  opener: () => HTMLElement | null,
): RefObject<HTMLButtonElement | null> {
  const safe = useRef<HTMLButtonElement | null>(null);
  const was = useRef(open);
  const back = useRef(opener);
  back.current = opener;
  useEffect(() => {
    if (open && !was.current) safe.current?.focus();
    // Only when focus was in the step (or fell to the page): a move elsewhere is left alone.
    if (!open && was.current) {
      const at = document.activeElement;
      if (at === null || at === document.body) back.current()?.focus();
    }
    was.current = open;
  }, [open]);
  return safe;
}
