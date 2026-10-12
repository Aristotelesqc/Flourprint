import { IonButton, IonFooter, IonToolbar } from '@ionic/react';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';

interface Props {
  readonly dirty: boolean;
  readonly newRecipe: boolean;
  readonly baseVersion?: number;
  readonly issuesCount: number;
  readonly blockingCount: number;
  readonly busy: boolean;
  readonly hasInvalid?: boolean;
  readonly onSave: () => void;
  readonly onDiscard: () => void;
  readonly onCheck: () => void;
  readonly onReview: () => void;
}

/**
 * Compact constant-footprint draft action bar for the recipe page.
 * Retains identical layout and height in clean, dirty and busy states.
 */
export const DraftActionBar = ({
  dirty,
  newRecipe,
  baseVersion,
  issuesCount,
  blockingCount,
  busy,
  hasInvalid = false,
  onSave,
  onDiscard,
  onCheck,
  onReview,
}: Props) => {
  const { t } = useMessages();

  return (
    <IonFooter>
      <IonToolbar>
        <div className="flex flex-col gap-2.5 px-4 py-1.5">
          <div className="flex h-[22px] min-w-0 items-center gap-1.5 text-sm text-muted">
            <span className={`truncate ${hasInvalid ? 'text-alert' : ''}`} role="status">
              {hasInvalid
                ? t('draft.invalid')
                : dirty
                  ? t(newRecipe ? 'draft.newRecipe' : 'draft.unsaved')
                  : t('draft.clean')}
            </span>
            <InfoButton
              topic="draft"
              term={t(
                hasInvalid
                  ? 'draft.invalid'
                  : dirty
                    ? newRecipe
                      ? 'draft.newRecipe'
                      : 'draft.unsaved'
                    : 'draft.clean',
              )}
            />
          </div>
          <div className="flex h-11 items-stretch gap-2">
            <IonButton
              fill="outline"
              className="m-0 h-11 w-16 shrink-0 [--padding-end:0px] [--padding-start:0px]"
              aria-label={t('draft.review')}
              title={t('draft.review')}
              disabled={!dirty}
              onClick={onReview}
            >
              <span className="pointer-events-none flex flex-col items-center gap-0.5 text-[10px] leading-none">
                <ActionIcon paths="M7 7h10M7 12h10M7 17h6M4 3h16v18H4z" />
                {t('draft.reviewShort')}
              </span>
            </IonButton>
            <IonButton
              fill="outline"
              className="m-0 h-11 w-16 shrink-0 [--padding-end:0px] [--padding-start:0px]"
              color={blockingCount > 0 ? 'danger' : 'medium'}
              aria-label={
                issuesCount === 0
                  ? t('check.button')
                  : t('check.buttonCount', { count: issuesCount })
              }
              title={
                issuesCount === 0
                  ? t('check.button')
                  : t('check.buttonCount', { count: issuesCount })
              }
              onClick={onCheck}
            >
              <span className="relative pointer-events-none flex flex-col items-center gap-0.5 text-[10px] leading-none">
                <ActionIcon paths="M5 5h14v16H5zM9 3h6v4H9zM8 13l3 3 5-5" />
                {issuesCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 rounded-full bg-surface px-1 text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    {issuesCount}
                  </span>
                )}
                {t('check.button')}
              </span>
            </IonButton>
            <IonButton
              fill="outline"
              className="m-0 h-11 w-16 shrink-0 [--padding-end:0px] [--padding-start:0px]"
              aria-label={t(newRecipe ? 'draft.delete' : 'draft.discard')}
              title={t(newRecipe ? 'draft.delete' : 'draft.discard')}
              disabled={(!dirty && !hasInvalid) || busy}
              onClick={onDiscard}
            >
              <span className="pointer-events-none flex flex-col items-center gap-0.5 text-[10px] leading-none">
                <ActionIcon paths="M8 4L3 9l5 5M3 9h11a6 6 0 010 12h-3" />
                {t(newRecipe ? 'draft.deleteShort' : 'draft.discardShort')}
              </span>
            </IonButton>
            <IonButton
              className="m-0 h-11 min-w-0 flex-1"
              aria-label={
                newRecipe
                  ? t('draft.saveRecipe')
                  : t('draft.save', { version: (baseVersion ?? 0) + 1 })
              }
              disabled={!dirty || busy || hasInvalid}
              onClick={onSave}
            >
              <span className="pointer-events-none truncate">{t('draft.saveShort')}</span>
            </IonButton>
          </div>
        </div>
      </IonToolbar>
    </IonFooter>
  );
};

const ActionIcon = ({ paths }: { paths: string }) => (
  <svg
    className="pointer-events-none"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths} />
  </svg>
);
