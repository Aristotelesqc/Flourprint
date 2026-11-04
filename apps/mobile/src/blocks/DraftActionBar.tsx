import { useMessages } from '../i18n/use-messages';
import { Ui } from '../ui/library';

interface Props {
  readonly dirty: boolean;
  readonly newRecipe: boolean;
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

/** Constant-height draft actions; visible labels and touch targets stay stable across edits. */
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

  const accessibleSaveLabel = newRecipe ? t('draft.saveRecipe') : t('bake.save');
  const visibleSaveLabel = t('bake.save');

  return (
    <Ui component="fp.bottom-bar" density="compact" navigationLabel={t('editor.overflowActions')}>
      <div className="flex w-full h-touch items-center justify-between gap-1 flex-nowrap min-w-0">
        <span className="sr-only" role="status">
          {hasInvalid ? t('draft.invalid') : dirty ? t('draft.unsaved') : t('draft.clean')}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {onCancel && (
            <Ui
              component="fp.button"
              density="compact"
              variant="quiet"
              disabled={busy}
              onClick={onCancel}
              aria-label={t('editor.discard')}
              title={t('editor.discard')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="pointer-events-none text-xs font-semibold">
                {t('editor.discardShort')}
              </span>
            </Ui>
          )}
          {onUndo && (
            <Ui
              component="fp.button"
              density="compact"
              variant="secondary"
              aria-label={t('editor.undoChange')}
              title={t('editor.undoChange')}
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
              <span className="sr-only">{t('editor.undoChange')}</span>
            </Ui>
          )}
          {onRedo && (
            <Ui
              component="fp.button"
              density="compact"
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
              density="compact"
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
        <div className="flex shrink-0 items-center justify-end">
          <Ui
            component="fp.button"
            density="compact"
            variant="primary"
            aria-label={accessibleSaveLabel}
            disabled={!dirty || busy || hasInvalid}
            onClick={onSave}
          >
            <span className="pointer-events-none truncate">{visibleSaveLabel}</span>
          </Ui>
        </div>
      </div>
    </Ui>
  );
};
