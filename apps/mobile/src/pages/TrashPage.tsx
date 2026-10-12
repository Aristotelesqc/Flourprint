import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonAlert,
  useIonViewWillEnter,
} from '@ionic/react';
import { useCallback, useState } from 'react';
import type { DomainError, Recipe, Result } from '@flourprint/core/domain';
import { formatRelative } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';
import { useGuardedWrite } from '../services/writes';
import { SessionOnlyNotice } from '../ui/SessionOnlyNotice';

/**
 * The recipe trash (persistence.md, Recipe trash): recipes put aside, most recently trashed first.
 * Nothing leaves it but by the baker's action: restore, delete for good, or empty the trash.
 */
export const TrashPage = () => {
  const services = useServices();
  const { t, error, locale } = useMessages();
  const [presentAlert] = useIonAlert();
  const writes = useGuardedWrite();
  const [trashed, setTrashed] = useState<readonly Recipe[]>();
  const [readFailed, setReadFailed] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [failure, setFailure] = useState<DomainError>();
  const [now, setNow] = useState(services.realClock.now());

  const load = useCallback(async () => {
    try {
      setNow(services.realClock.now());
      setTrashed(await services.recipes.listTrash());
      setReadFailed(false);
    } catch (cause) {
      console.error(cause);
      setReadFailed(true);
    }
  }, [services]);
  useIonViewWillEnter(() => void load(), [load]);

  /** Runs one write, then reloads the list whatever its outcome. */
  const change = async (work: () => Promise<Result<unknown, DomainError> | readonly string[]>) => {
    setFailure(undefined);
    const result = await writes.run(work);
    if (!result.ok) {
      setStorageFailed(result.reason === 'storage');
      return;
    }
    setStorageFailed(false);
    const { value } = result;
    if ('ok' in value && !value.ok) setFailure(value.error);
    await load();
  };

  const restore = (recipe: Recipe) => void change(() => services.recipes.restoreRecipe(recipe.id));

  const confirmDelete = (recipe: Recipe) =>
    void presentAlert({
      header: t('trash.delete'),
      message: t('trash.delete.confirm', { name: recipe.name }),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('trash.delete'),
          role: 'destructive',
          handler: () => void change(() => services.recipes.deleteRecipe(recipe.id)),
        },
      ],
    });

  const confirmEmpty = () =>
    void presentAlert({
      header: t('trash.emptyAll'),
      message: t('trash.emptyAll.confirm', { count: trashed?.length ?? 0 }),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('trash.emptyAll'),
          role: 'destructive',
          handler: () => void change(() => services.recipes.emptyTrash()),
        },
      ],
    });

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/advanced" />
          </IonButtons>
          <IonTitle>{t('trash.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="flex flex-col gap-3 px-4 pt-2 pb-8">
          <SessionOnlyNotice />
          <p className="m-0 px-1 text-sm text-muted">{t('trash.hint')}</p>
          {readFailed && <p role="alert">{t('state.storageRead')}</p>}
          {storageFailed && (
            <p role="alert" className="m-0 text-alert">
              {t('state.storageWrite')}
            </p>
          )}
          {failure && (
            <p role="alert" className="m-0 text-alert">
              {error(failure)}
            </p>
          )}
          {trashed?.length === 0 && <p className="text-muted">{t('trash.empty')}</p>}
          {trashed?.map((recipe) => (
            <section
              key={recipe.id}
              aria-label={recipe.name}
              className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex flex-col">
                <span className="text-xl font-semibold">{recipe.name}</span>
                <span className="text-[13px] text-muted">
                  {t('trash.item', {
                    when: formatRelative(recipe.trashedAt ?? recipe.updatedAt, now, locale),
                    version: recipe.headVersion,
                  })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <IonButton
                  fill="outline"
                  className="m-0 min-h-11"
                  disabled={writes.busy}
                  onClick={() => restore(recipe)}
                >
                  {t('trash.restore')}
                </IonButton>
                <IonButton
                  fill="outline"
                  color="danger"
                  className="m-0 min-h-11"
                  disabled={writes.busy}
                  onClick={() => confirmDelete(recipe)}
                >
                  {t('trash.delete')}
                </IonButton>
              </div>
            </section>
          ))}
          {trashed !== undefined && trashed.length > 0 && (
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              disabled={writes.busy}
              onClick={confirmEmpty}
            >
              {t('trash.emptyAll')}
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};
