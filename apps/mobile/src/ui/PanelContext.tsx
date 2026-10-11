import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

/** Keep mounted editors and independent scroll positions without coupling their state. */
export function usePanelScroll<T extends string>(
  contentRef: RefObject<HTMLIonContentElement | null>,
  currentTab: T,
  setTab: (tab: T) => void,
  identity: string,
  ready: boolean,
) {
  const positions = useRef<Partial<Record<T, number>>>({});
  const owner = useRef(identity);
  const scroll = useRef<{ host: HTMLIonContentElement; element: HTMLElement } | undefined>(
    undefined,
  );
  const restoring = useRef(false);

  const switchTab = useCallback(
    (nextTab: T) => {
      if (nextTab === currentTab) return;
      // A second switch before layout has settled must not save the temporarily clamped
      // position of a shorter panel over that panel's last intentional scroll position.
      if (!restoring.current && scroll.current?.host === contentRef.current) {
        positions.current[currentTab] = scroll.current.element.scrollTop;
      }
      restoring.current = true;
      setTab(nextTab);
    },
    [contentRef, currentTab, setTab],
  );

  useLayoutEffect(() => {
    if (owner.current !== identity) {
      positions.current = {};
      owner.current = identity;
    }
    const host = contentRef.current;
    if (!ready || !host) {
      scroll.current = undefined;
      restoring.current = false;
      return;
    }
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const target = positions.current[currentTab] ?? 0;
    restoring.current = true;

    const restore = (element: HTMLElement) => {
      if (cancelled) return;
      scroll.current = { host, element };
      element.scrollTop = target;
      firstFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        element.scrollTop = target;
        secondFrame = requestAnimationFrame(() => {
          if (cancelled) return;
          element.scrollTop = target;
          restoring.current = false;
        });
      });
    };
    // Use Ionic's public API; reacquire after loading remounts and restore synchronously
    // on ordinary tab switches once the scroll element has been acquired.
    if (scroll.current?.host === host) restore(scroll.current.element);
    else void host.getScrollElement().then(restore);

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [contentRef, currentTab, identity, ready]);

  return { switchTab };
}
