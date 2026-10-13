import { IonButton, IonFooter, IonToolbar } from '@ionic/react';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';

interface Props {
  readonly dirty: boolean;
  readonly newRecipe: boolean;
  readonly baseVersion?: number;
  readonly busy: boolean;
  readonly hasInvalid?: boolean;
  readonly onSave: () => void;
}

/**
 * M3 editor action bar: ONE primary Save action and a reserved stable draft feedback footprint.
 * Secondary actions (Check, Review, Discard) are exposed in the header overflow menu.
 */
export const DraftActionBar = ({
  dirty,
  newRecipe,
  baseVersion,
  busy,
  hasInvalid = false,
  onSave,
}: Props) => {
  const { t } = useMessages();

  const statusText = hasInvalid
    ? t('draft.invalid')
    : dirty
      ? t(newRecipe ? 'draft.newRecipe' : 'draft.unsaved')
      : t('draft.clean');

  return (
    <IonFooter>
      <IonToolbar>
        <div className="flex flex-col gap-2 px-4 py-2">
          <div className="flex h-[22px] min-w-0 items-center justify-between gap-2 text-xs text-muted">
            <span className="flex items-center gap-1.5 truncate">
              <span
                className={`truncate font-medium ${hasInvalid ? 'text-alert' : ''}`}
                role="status"
              >
                {statusText}
              </span>
              <InfoButton topic="draft" term={statusText} />
            </span>
          </div>
          <IonButton
            expand="block"
            shape="round"
            className="m-0 h-11 w-full font-semibold"
            aria-label={
              newRecipe
                ? t('draft.saveRecipe')
                : t('draft.save', { version: (baseVersion ?? 0) + 1 })
            }
            disabled={!dirty || busy || hasInvalid}
            onClick={onSave}
          >
            {newRecipe
              ? t('draft.saveRecipe')
              : t('draft.save', { version: (baseVersion ?? 0) + 1 })}
          </IonButton>
        </div>
      </IonToolbar>
    </IonFooter>
  );
};
