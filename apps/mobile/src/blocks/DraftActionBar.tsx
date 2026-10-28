import { IonFooter, IonToolbar } from '@ionic/react';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';
import { Ui } from '../ui/library';

interface Props {
  readonly dirty: boolean;
  readonly newRecipe: boolean;
  readonly baseVersion?: number;
  readonly busy: boolean;
  readonly hasInvalid?: boolean;
  readonly onSave: () => void;
  readonly onCancel?: () => void;
  readonly canUndo?: boolean;
  readonly canRedo?: boolean;
  readonly canReset?: boolean;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly onReset?: () => void;
}

/**
 * M3 editor action bar: ONE primary Save action and compact secondary actions (Undo, Redo, Reset,
 * optional Cancel) with 48 px touch targets and accessible labels (#8).
 */
export const DraftActionBar = ({
  dirty,
  newRecipe,
  busy,
  hasInvalid = false,
  onSave,
  onCancel,
  canUndo = false,
  canRedo = false,
  canReset = false,
  onUndo,
  onRedo,
  onReset,
}: Props) => {
  const { t } = useMessages();

  const statusText = hasInvalid
    ? t('draft.invalid')
    : dirty
      ? t(newRecipe ? 'draft.newRecipe' : 'draft.unsaved')
      : t('draft.clean');

  const saveLabel = newRecipe ? t('draft.saveRecipe') : t('bake.save');

  return (
    <IonFooter>
      <IonToolbar>
        <div className="flex flex-col gap-2.5 px-4 py-2">
          {/* Stable feedback and compact secondary toolbar row */}
          <div className="flex min-h-12 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted">
              <span
                className={`truncate font-medium text-xs sm:text-sm ${hasInvalid ? 'text-alert' : ''}`}
                role="status"
              >
                {statusText}
              </span>
              <InfoButton topic="draft" term={statusText} />
            </div>

            <div
              className="flex shrink-0 items-center gap-1.5 sm:gap-2"
              role="toolbar"
              aria-label={t('editor.overflowActions')}
            >
              {onCancel && (
                <Ui
                  component="fp.button"
                  variant="quiet"
                  disabled={busy}
                  onClick={onCancel}
                  aria-label={t('bake.cancel')}
                >
                  {t('bake.cancel')}
                </Ui>
              )}
              {onUndo && (
                <Ui
                  component="fp.button"
                  variant="secondary"
                  aria-label={t('editor.undo')}
                  title={t('editor.undo')}
                  disabled={!canUndo || busy}
                  onClick={onUndo}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  <span className="sr-only">{t('editor.undo')}</span>
                </Ui>
              )}
              {onRedo && (
                <Ui
                  component="fp.button"
                  variant="secondary"
                  aria-label={t('editor.redo')}
                  title={t('editor.redo')}
                  disabled={!canRedo || busy}
                  onClick={onRedo}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                  </svg>
                  <span className="sr-only">{t('editor.redo')}</span>
                </Ui>
              )}
              {onReset && (
                <Ui
                  component="fp.button"
                  variant="secondary"
                  aria-label={t('editor.reset')}
                  title={t('editor.reset')}
                  disabled={!canReset || busy}
                  onClick={onReset}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span className="sr-only">{t('editor.reset')}</span>
                </Ui>
              )}
            </div>
          </div>

          {/* Primary Save pill: full-width */}
          <div className="w-full">
            <Ui
              component="fp.button"
              variant="primary"
              fullWidth
              aria-label={saveLabel}
              disabled={!dirty || busy || hasInvalid}
              onClick={onSave}
            >
              <span className="pointer-events-none truncate">{saveLabel}</span>
            </Ui>
          </div>
        </div>
      </IonToolbar>
    </IonFooter>
  );
};
