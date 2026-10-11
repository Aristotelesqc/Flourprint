import { useRef, useState } from 'react';

export type GuardedResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: 'busy' | 'storage' };

/**
 * One write at a time per screen, with storage failures caught (a rejected SQLite call becomes a
 * visible, retryable state instead of an unhandled rejection). Double taps are ignored.
 */
export const useGuardedWrite = () => {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = async <T>(work: () => Promise<T>): Promise<GuardedResult<T>> => {
    if (running.current) return { ok: false, reason: 'busy' };
    running.current = true;
    setBusy(true);
    try {
      return { ok: true, value: await work() };
    } catch (error) {
      console.error(error);
      return { ok: false, reason: 'storage' };
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return { busy, run };
};
