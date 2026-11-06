import { useId, useRef, useState, useMemo, useEffect, type ReactElement } from 'react';
import { IonModal, createAnimation } from '@ionic/react';
import { Button } from '../button/v1.tsx';
import { useMotion } from '../../motion-context.ts';
import { ionicAnimation } from '../../motion.ts';
import { syncOverlayHost } from '../overlay-context.ts';
import { library } from '../../index.ts';
import type { DialogProps } from './props.ts';

export function Dialog({
  isOpen,
  title,
  closeLabel,
  onDismiss,
  children,
  footer,
  canDismiss = true,
  reducedMotion,
}: DialogProps): ReactElement {
  const modalRef = useRef<HTMLIonModalElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevOpenRef = useRef(false);
  const [inferredReduced, setInferredReduced] = useState(false);
  const titleId = useId();

  const enterMotion = useMotion('fp.motion.sheet-enter');
  const exitMotion = useMotion('fp.motion.sheet-exit');

  const enterAnimation = useMemo(() => {
    if (enterMotion.kind !== 'keyframes') return undefined;
    return ionicAnimation(enterMotion, createAnimation, '.modal-wrapper');
  }, [enterMotion]);

  const leaveAnimation = useMemo(() => {
    if (exitMotion.kind !== 'keyframes') return undefined;
    return ionicAnimation(exitMotion, createAnimation, '.modal-wrapper');
  }, [exitMotion]);

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

  return (
    <IonModal
      ref={modalRef}
      isOpen={isOpen}
      keepContentsMounted={true}
      canDismiss={canDismiss}
      {...(enterAnimation ? { enterAnimation } : {})}
      {...(leaveAnimation ? { leaveAnimation } : {})}
      animated={!inferredReduced}
      aria-label={title}
      aria-labelledby={titleId}
      data-motion={inferredReduced ? 'reduced' : 'standard'}
      onWillPresent={handleWillPresent}
      onDidPresent={handleDidPresent}
      onDidDismiss={handleDidDismiss}
      className="fp-ionic [&::part(content)]:opacity-100 [&::part(backdrop)]:opacity-[var(--backdrop-opacity)] [--width:min(var(--container-md),calc(100vw-var(--spacing)*4))] [--max-width:calc(100vw-var(--spacing)*4)] [--max-height:calc(100dvh-var(--spacing)*8)] [--height:auto] [--background:var(--color-surface)] [--border-radius:var(--radius-card)]"
    >
      <div className="flex flex-col bg-surface text-on-surface rounded-card overflow-hidden border border-outline/20 max-h-[calc(100dvh-var(--spacing)*8)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/20 gap-3 shrink-0">
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

        <div className="p-6 text-body text-on-surface overflow-y-auto max-h-[calc(100dvh-var(--spacing)*24)] min-h-0">
          {children}
        </div>

        {footer && (
          <div className="border-t border-outline/20 px-6 py-4 bg-surface-container flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </IonModal>
  );
}

function DialogExample(props: DialogProps): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {props.title}
      </Button>
      <Dialog
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
  id: 'fp.dialog',
  version: 'v1',
  component: Dialog,
  notes:
    'Production Ionic dialog modal with keyframe animations, focus trapping, and dismissal guard verification.',
  examples: [
    {
      name: 'confirmation',
      render: DialogExample,
      props: {
        isOpen: false,
        title: 'Delete fermentation log?',
        closeLabel: 'Close dialog',
        onDismiss: () => undefined,
        children:
          'This action permanently removes logged sensor readings and dough temperature milestones.',
      },
    },
  ],
});
