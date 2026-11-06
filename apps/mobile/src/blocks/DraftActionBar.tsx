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
  onUndo,
  onRedo,
}: Props) => {
  const { t } = useMessages();

  const accessibleSaveLabel = newRecipe ? t('draft.saveRecipe') : t('bake.save');
  const visibleSaveLabel = t('bake.save');

  return (
    <div
      className="w-full bg-surface border-t border-outline-subtle box-border pt-3"
      style={{
        paddingBottom:
          'max(1.5rem, var(--ion-safe-area-bottom, 0px), env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1.25rem, var(--ion-safe-area-left, 0px), env(safe-area-inset-left, 0px))',
        paddingRight:
          'max(1.25rem, var(--ion-safe-area-right, 0px), env(safe-area-inset-right, 0px))',
      }}
    >
      <Ui
        component="fp.bottom-bar"
        density="compact"
        navigationLabel={t('editor.overflowActions')}
        className="p-0! border-0! bg-transparent"
      >
        <div className="flex w-full h-touch items-center justify-between gap-0 flex-nowrap min-w-0">
          <span className="sr-only" role="status">
            {hasInvalid ? t('draft.invalid') : dirty ? t('draft.unsaved') : t('draft.clean')}
          </span>
          <div className="flex shrink-0 items-center gap-0">
            {onCancel && (
              <Ui
                component="fp.button"
                density="compact"
                variant="quiet"
                className="disabled:before:bg-transparent! disabled:before:border-0!"
                disabled={busy}
                onClick={onCancel}
                aria-label={t('editor.discard')}
                title={t('editor.discard')}
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Ui>
            )}
            {onCancel && (onUndo || onRedo) && (
              <div className="h-5 w-px bg-outline-subtle shrink-0 mx-0.5" aria-hidden="true" />
            )}
            {onUndo && (
              <Ui
                component="fp.button"
                density="compact"
                variant="quiet"
                className="disabled:before:bg-transparent! disabled:before:border-0!"
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
              </Ui>
            )}
            {onRedo && (
              <Ui
                component="fp.button"
                density="compact"
                variant="quiet"
                className="disabled:before:bg-transparent! disabled:before:border-0!"
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
              </Ui>
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <Ui
              component="fp.button"
              density="compact"
              variant="primary"
              className="max-w-28 text-supporting font-semibold"
              fullWidth
              aria-label={accessibleSaveLabel}
              disabled={!dirty || busy || hasInvalid}
              onClick={onSave}
            >
              <span className="pointer-events-none">{visibleSaveLabel}</span>
            </Ui>
          </div>
        </div>
      </Ui>
    </div>
  );
};
