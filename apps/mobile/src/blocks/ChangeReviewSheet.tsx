import { IonContent, IonModal } from '@ionic/react';
import type { Formula, Process } from '@flourprint/core/domain';
import { formulaChanges } from '../services/formula-changes';
import { useMessages } from '../i18n/use-messages';
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
  const changes = baseFormula ? formulaChanges(baseFormula, currentFormula) : [];

  const processChanged = (() => {
    if (!baseProcess) return false;
    return JSON.stringify(baseProcess) !== JSON.stringify(currentProcess);
  })();

  return (
    <IonModal
      isOpen={open}
      onDidDismiss={onClose}
      breakpoints={[0, 0.7, 0.95]}
      initialBreakpoint={0.7}
      handleBehavior="cycle"
      aria-label={t('draft.reviewTitle')}
    >
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{t('draft.reviewTitle')}</h2>
            <button
              type="button"
              aria-label={t('help.close')}
              className="fp-reset -m-2 shrink-0 p-2 text-muted"
              onClick={onClose}
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
            </button>
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
