import { useEffect, type RefObject } from 'react';

/**
 * Traps browser Back navigation during active step drag (L104).
 * Cancels gesture and restores the history entry in the capture phase
 * before React Router's bubble listener observes the premature route change.
 */
export function useStepDragBack(
  active: boolean,
  control: RefObject<{ cancelDrag(): boolean } | null>,
): void {
  useEffect(() => {
    if (!active) return;

    const capturedIdx = (window.history.state as { idx?: number } | null)?.idx;
    let isRestoring = false;

    const onPopState = (event: PopStateEvent) => {
      if (isRestoring) {
        event.stopImmediatePropagation();
        return;
      }
      if (!control.current?.cancelDrag()) return;

      event.stopImmediatePropagation();
      isRestoring = true;
      const currentIdx = (event.state as { idx?: number } | null)?.idx;
      const delta =
        typeof capturedIdx === 'number' && typeof currentIdx === 'number'
          ? capturedIdx - currentIdx
          : 1;
      window.history.go(delta);
    };

    window.addEventListener('popstate', onPopState, true);
    return () => {
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [active, control]);
}
