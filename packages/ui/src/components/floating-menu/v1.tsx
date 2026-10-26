import {
  Fragment,
  useId,
  useRef,
  useState,
  useMemo,
  useEffect,
  type ReactElement,
  type KeyboardEvent,
} from 'react';
import { IonPopover } from '@ionic/react';
import { Button } from '../button/v1.tsx';
import { isReduced } from '../../motion.ts';
import { syncOverlayHost } from '../overlay-context.ts';
import { library } from '../../index.ts';
import type { FloatingMenuAction, FloatingMenuProps } from './props.ts';

export function FloatingMenu({
  title,
  closeLabel,
  actions,
  triggerLabel,
  triggerContent,
  scrollHint,
}: FloatingMenuProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<MouseEvent | undefined>(undefined);
  const [reducedMotionState, setReducedMotionState] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const popoverRef = useRef<HTMLIonPopoverElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const titleId = useId();

  const firstEnabledIndex = useMemo(() => {
    const idx = actions.findIndex((action) => !action.disabled);
    return idx >= 0 ? idx : 0;
  }, [actions]);

  const checkOverflow = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const canScroll =
      el.scrollHeight > el.clientHeight + 1 && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setHasOverflow(canScroll);
  };

  useEffect(() => {
    if (!isOpen) return;
    checkOverflow();
    const el = scrollContainerRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => checkOverflow());
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [isOpen, actions]);

  const handleActionClick = (action: FloatingMenuAction) => {
    if (action.disabled || pendingActionRef.current !== null) return;
    pendingActionRef.current = action.onSelect;
    setIsOpen(false);
  };

  const handleWillPresent = (e: CustomEvent) => {
    syncOverlayHost(
      (e.target as HTMLElement) || popoverRef.current,
      openerRef.current,
      reducedMotionState,
    );
  };

  const handleDidDismiss = () => {
    setIsOpen(false);
    setPopoverEvent(undefined);
    const opener = openerRef.current;
    if (
      opener &&
      opener.isConnected &&
      !opener.closest('[aria-hidden="true"], [inert], .ion-page-hidden')
    ) {
      opener.focus();
    }
    const actionToRun = pendingActionRef.current;
    pendingActionRef.current = null;
    if (actionToRun) {
      actionToRun();
    }
  };

  const handleDidPresent = () => {
    checkOverflow();
    setActiveIndex(firstEnabledIndex);
    itemsRef.current[firstEnabledIndex]?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabledIndices = actions
      .map((action, idx) => (!action.disabled ? idx : -1))
      .filter((idx) => idx !== -1);
    if (enabledIndices.length === 0) return;

    const currentPos = enabledIndices.indexOf(activeIndex);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextPos =
        currentPos === -1 || currentPos === enabledIndices.length - 1 ? 0 : currentPos + 1;
      const targetIdx = enabledIndices[nextPos];
      if (targetIdx === undefined) return;
      setActiveIndex(targetIdx);
      itemsRef.current[targetIdx]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevPos = currentPos <= 0 ? enabledIndices.length - 1 : currentPos - 1;
      const targetIdx = enabledIndices[prevPos];
      if (targetIdx === undefined) return;
      setActiveIndex(targetIdx);
      itemsRef.current[targetIdx]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      const targetIdx = enabledIndices[0];
      if (targetIdx === undefined) return;
      setActiveIndex(targetIdx);
      itemsRef.current[targetIdx]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const targetIdx = enabledIndices[enabledIndices.length - 1];
      if (targetIdx === undefined) return;
      setActiveIndex(targetIdx);
      itemsRef.current[targetIdx]?.focus();
    }
  };

  return (
    <div className="inline-block">
      <Button
        ref={openerRef}
        variant="quiet"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerLabel}
        onClick={(e) => {
          const openerEl =
            openerRef.current ?? (e.target instanceof Element ? e.target : undefined);
          setReducedMotionState(isReduced(openerEl));
          setPopoverEvent(e.nativeEvent);
          setIsOpen(true);
        }}
        className="min-h-12 min-w-12 px-3 py-2 text-on-surface hover:bg-surface-container rounded-card fp-focus"
      >
        {triggerContent ?? triggerLabel}
      </Button>

      {/* Retain native Ionic popover animation: generic ionicAnimation lacks dynamic anchor
          and viewport boundary placement (top/left/origin), causing content to render offscreen.
          The pinned Ionic 9.0.6 patch makes its wrapper fade respect animated={false}
          alongside the native backdrop/content animations (patches/README.md). */}
      <IonPopover
        ref={popoverRef}
        isOpen={isOpen}
        event={popoverEvent}
        animated={!reducedMotionState}
        data-motion={reducedMotionState ? 'reduced' : 'standard'}
        onWillPresent={handleWillPresent}
        onDidDismiss={handleDidDismiss}
        onDidPresent={handleDidPresent}
        className="fp-ionic [--background:var(--color-surface)] [&::part(content)]:rounded-card [--width:min(var(--container-xs),calc(100vw-var(--spacing)*4))] [--max-width:min(var(--container-xs),calc(100vw-var(--spacing)*4))] [--max-height:calc(100dvh-var(--spacing)*8)] [&>.ion-delegate-host]:flex [&>.ion-delegate-host]:flex-col [&>.ion-delegate-host]:min-h-0 [&>.ion-delegate-host]:max-h-[calc(100dvh-var(--spacing)*8)] [&>.ion-delegate-host]:overflow-hidden"
      >
        <div
          role="menu"
          tabIndex={-1}
          aria-labelledby={titleId}
          onKeyDown={handleKeyDown}
          className="w-full min-w-0 min-h-0 max-h-[calc(100dvh-var(--spacing)*8)] overflow-hidden bg-surface text-on-surface rounded-card flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline/20 gap-3 shrink-0">
            <h2
              id={titleId}
              className="text-body font-semibold text-on-surface whitespace-normal min-w-0"
            >
              {title}
            </h2>
            <Button
              variant="quiet"
              onClick={() => setIsOpen(false)}
              aria-label={closeLabel}
              className="min-h-12 min-w-12 flex items-center justify-center text-muted hover:text-on-surface rounded-pill fp-focus shrink-0"
            >
              <span aria-hidden="true">✕</span>
            </Button>
          </div>

          <div
            ref={scrollContainerRef}
            onScroll={checkOverflow}
            className="flex-1 overflow-y-auto py-1 flex flex-col min-h-0"
          >
            {actions.map((action, index) => {
              const isFirstDestructive =
                action.destructive && index > 0 && !actions[index - 1]?.destructive;

              return (
                <Fragment key={action.id}>
                  {isFirstDestructive && (
                    <div
                      className="border-t border-outline/20 my-1"
                      role="separator"
                      aria-orientation="horizontal"
                    />
                  )}
                  <button
                    ref={(el) => {
                      itemsRef.current[index] = el;
                    }}
                    type="button"
                    role="menuitem"
                    tabIndex={index === activeIndex ? 0 : -1}
                    disabled={action.disabled}
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => handleActionClick(action)}
                    className={`fp-control-reset w-full min-h-12 px-4 py-3 text-left flex items-center justify-between text-body font-medium ${
                      action.destructive
                        ? 'text-error hover:bg-error/10 focus-visible:bg-error/10'
                        : 'text-on-surface hover:bg-surface-container focus-visible:bg-surface-container'
                    } ${
                      action.disabled
                        ? 'opacity-50 cursor-not-allowed pointer-events-none'
                        : 'cursor-pointer'
                    } fp-focus`}
                  >
                    <span className="whitespace-normal min-w-0">{action.label}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>

          {hasOverflow && (
            <div
              className="px-4 py-2 text-metadata text-muted border-t border-outline/20 text-center shrink-0"
              aria-live="polite"
            >
              {scrollHint}
            </div>
          )}
        </div>
      </IonPopover>
    </div>
  );
}

export default library.version({
  id: 'fp.floating-menu',
  version: 'v1',
  component: FloatingMenu,
  notes:
    'Ionic-positioned popover with roving tabindex, native overlay motion, reduced-motion support and dismissal-before-action.',
  examples: [
    {
      name: 'standard',
      props: {
        title: 'Formula options',
        closeLabel: 'Close options menu',
        triggerLabel: 'Actions',
        scrollHint: 'Scroll down for more actions',
        actions: [
          { id: 'dup', label: 'Duplicate formula', onSelect: () => undefined },
          { id: 'exp', label: 'Export as JSON', onSelect: () => undefined },
          { id: 'arch', label: 'Archive formula', onSelect: () => undefined, disabled: true },
          { id: 'del', label: 'Delete formula', onSelect: () => undefined, destructive: true },
        ],
      },
    },
  ],
});
