import { useId, useRef, useState, useEffect, type ReactElement } from 'react';
import { IonModal } from '@ionic/react';
import { Button } from '../button/v1.tsx';
import { syncOverlayHost } from '../overlay-context.ts';
import { library, useMotion, useOverlayMotion } from '../../index.ts';
import type { BottomSheetProps } from './props.ts';

export function BottomSheet({
  isOpen,
  title,
  closeLabel,
  onDismiss,
  children,
  footer,
  canDismiss = true,
  reducedMotion,
}: BottomSheetProps): ReactElement {
  const modalRef = useRef<HTMLIonModalElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevOpenRef = useRef(false);
  const [inferredReduced, setInferredReduced] = useState(false);
  const titleId = useId();

  const sheetEnter = useMotion('fp.motion.sheet-enter');
  const sheetExit = useMotion('fp.motion.sheet-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');

  useOverlayMotion(modalRef, {
    enter: [{ part: 'ion-backdrop', motion: backdropEnter }, { motion: sheetEnter }],
    leave: [{ part: 'ion-backdrop', motion: backdropExit }, { motion: sheetExit }],
  });

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      if (
        !openerRef.current &&
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement
      ) {
        openerRef.current = document.activeElement;
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const handleClose = async () => {
    if (modalRef.current) {
      await modalRef.current.dismiss();
    }
  };

  const handleDidDismiss = () => {
    onDismiss();
    const opener = openerRef.current;
    openerRef.current = null;
    if (
      opener &&
      opener.isConnected &&
      !opener.closest('[aria-hidden="true"], [inert], .ion-page-hidden')
    ) {
      opener.focus();
    }
  };

  const handleDidPresent = () => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (
      active &&
      modalEl.contains(active) &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.hasAttribute('autofocus'))
    ) {
      return;
    }
    const autoFocusEl = modalEl.querySelector<HTMLElement>('[autofocus], input[autofocus]');
    if (autoFocusEl) {
      autoFocusEl.focus();
      return;
    }
    closeButtonRef.current?.focus();
  };

  const handleWillPresent = () => {
    if (
      !openerRef.current &&
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ) {
      openerRef.current = document.activeElement;
    }
    const isRed = syncOverlayHost(modalRef.current, openerRef.current, reducedMotion);
    setInferredReduced(isRed);
  };

  // Retain native Ionic sheet animation: breakpoint geometry (currentBreakpoint translateY)
  // and gesture tracking stay native. The overlay motion bridge retimes running native
  // animations: backdropEnter/Exit claims the ion-backdrop group, while sheetEnter/Exit retimes
  // remaining elements (including slotted .ion-page). Keyframes stay native; paused drag gestures are untouched.
  return (
    <IonModal
      ref={modalRef}
      isOpen={isOpen}
      keepContentsMounted={true}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      canDismiss={canDismiss}
      animated={!inferredReduced}
      aria-label={title}
      aria-labelledby={titleId}
      data-motion={inferredReduced ? 'reduced' : 'standard'}
      onWillPresent={handleWillPresent}
      onDidPresent={handleDidPresent}
      onDidDismiss={handleDidDismiss}
      className="fp-ionic [--background:var(--color-surface)] [--border-radius:var(--radius-card)_var(--radius-card)_0_0] [--max-height:calc(100dvh-var(--spacing)*4)] [--height:auto]"
    >
      <div className="flex flex-col max-h-[calc(100dvh-var(--spacing)*4)] bg-surface text-on-surface rounded-t-card overflow-hidden">
        <div className="w-full flex justify-center pt-2 pb-1 shrink-0" aria-hidden="true">
          <div className="w-8 h-1 bg-outline/30 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-outline/20 gap-3 shrink-0">
          <h2
            id={titleId}
            className="text-body font-semibold text-on-surface whitespace-normal min-w-0"
          >
            {title}
          </h2>
          <Button
            ref={closeButtonRef}
            variant="quiet"
            onClick={handleClose}
            aria-label={closeLabel}
            className="min-h-12 min-w-12 flex items-center justify-center text-muted hover:text-on-surface rounded-pill fp-focus shrink-0"
          >
            <span aria-hidden="true">✕</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-body min-h-0">{children}</div>

        {footer && (
          <div className="border-t border-outline/20 p-4 bg-surface-container shrink-0">
            {footer}
          </div>
        )}
      </div>
    </IonModal>
  );
}

function BottomSheetExample(props: BottomSheetProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="primary" onClick={() => setOpen(true)}>
        {props.title}
      </Button>
      <BottomSheet
        {...props}
        isOpen={open}
        onDismiss={() => {
          setOpen(false);
          props.onDismiss();
        }}
      />
    </div>
  );
}

export default library.version({
  id: 'fp.bottom-sheet',
  version: 'v1',
  component: BottomSheet,
  notes:
    'Production Ionic bottom sheet modal with breakpoints, dismissal guard routing, and opener focus return.',
  examples: [
    {
      name: 'standard',
      render: BottomSheetExample,
      props: {
        isOpen: false,
        title: 'Bake parameters',
        closeLabel: 'Close parameters sheet',
        onDismiss: () => undefined,
        children: 'Configure temperature, steam injection, and target fermentation time.',
      },
    },
  ],
});
