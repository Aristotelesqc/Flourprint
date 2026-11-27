import { useId, useRef } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { isReduced, useMotion, useOverlayMotion } from '@flourprint/ui';
import type { Formula, Process } from '@flourprint/core/domain';
import { formulaChanges } from '../services/formula-changes';
import { useMessages } from '../i18n/use-messages';
import { Ui } from '../ui/library';
import { ChangesSummary } from './FormulaEditors';

interface Props {
  readonly open: boolean;
  readonly baseFormula?: Formula;
  readonly currentFormula: Formula;
  readonly baseProcess?: Process;
  readonly currentProcess: Process;
  readonly onClose: () => void;
}

/**
 * Bottom sheet reviewing whole-recipe changes against the saved base revision.
 * Explicitly scopes formula changes and shows process change status factually.
 */
export const ChangeReviewSheet = ({
  open,
  baseFormula,
  currentFormula,
  baseProcess,
  currentProcess,
  onClose,
}: Props) => {
  const { t } = useMessages();
  const titleId = useId();
  const modalRef = useRef<HTMLIonModalElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sheetEnter = useMotion('fp.motion.sheet-enter');
  const sheetExit = useMotion('fp.motion.sheet-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');

  useOverlayMotion(modalRef, {
    enter: [{ part: 'ion-backdrop', motion: backdropEnter }, { motion: sheetEnter }],
    leave: [{ part: 'ion-backdrop', motion: backdropExit }, { motion: sheetExit }],
  });

  const localizeHandle = (modal: HTMLIonModalElement) => {
    modal.shadowRoot
      ?.querySelector('[part="handle"]')
      ?.setAttribute('aria-label', t('draft.reviewHandle'));
  };

  const syncModalAnimated = (event: Event) => {
    const modal = modalRef.current;
    if (!modal || event.target !== modal) return;
    modal.animated = !isReduced(modal);
  };

  const handleWillPresent = (event: Event) => {
    syncModalAnimated(event);
    const modal = modalRef.current;
    if (!modal || event.target !== modal) return;
    localizeHandle(modal);
  };

  const handleDidPresent = (event: Event) => {
    const modal = modalRef.current;
    if (!modal || event.target !== modal) return;
    localizeHandle(modal);
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active && modal.contains(active) && active !== modal) return;
    closeButtonRef.current?.focus({ preventScroll: true });
  };

  const handleClose = () => {
    void modalRef.current?.dismiss();
  };

  const changes = baseFormula ? formulaChanges(baseFormula, currentFormula) : [];

  const processChanged = (() => {
    if (!baseProcess) return false;
    return JSON.stringify(baseProcess) !== JSON.stringify(currentProcess);
  })();

  return (
    <IonModal
      ref={modalRef}
      isOpen={open}
      onWillPresent={handleWillPresent}
      onDidPresent={handleDidPresent}
      onWillDismiss={syncModalAnimated}
      onDidDismiss={onClose}
      breakpoints={[0, 0.7, 0.95]}
      initialBreakpoint={0.7}
      handleBehavior="cycle"
      aria-label={t('draft.reviewTitle')}
      aria-labelledby={titleId}
    >
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-4 [padding-bottom:calc(var(--spacing)*6_+_max(var(--ion-safe-area-bottom,0px),env(safe-area-inset-bottom,0px)))]">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="min-w-0 text-xl font-bold">
              {t('draft.reviewTitle')}
            </h2>
            <Ui
              component="fp.button"
              ref={closeButtonRef}
              variant="quiet"
              aria-label={t('help.close')}
              className="shrink-0 px-0! text-muted hover:text-on-surface"
              onClick={handleClose}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Ui>
          </div>

          {!baseFormula || !baseProcess ? (
            <p className="m-0 text-muted">{t('draft.reviewNew')}</p>
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">
                  {t('draft.reviewFormula')}
                </h3>
                {changes.length > 0 && baseFormula ? (
                  <ChangesSummary base={baseFormula} formula={currentFormula} />
                ) : (
                  <p className="m-0 text-sm text-muted">{t('draft.reviewNoFormula')}</p>
                )}
              </section>
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">
                  {t('draft.reviewProcess')}
                </h3>
                <p className="m-0 text-sm">
                  {processChanged
                    ? t('draft.reviewProcessModified')
                    : t('draft.reviewProcessClean')}
                </p>
              </section>
            </>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};
