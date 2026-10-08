import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useRef, useState } from 'react';
import { importRecipes } from '@flourprint/core/application';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';

/** Advanced menu: recipe import, diagnostics and build details, kept off the main screens. */
export const AdvancedPage = () => {
  const { t, error } = useMessages();
  const { storage, recipes } = useServices();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ text: string; alert: boolean }>();

  /** Additive import (persistence.md): recipes already here are skipped, never overwritten. */
  const importFile = async (file: File) => {
    setBusy(true);
    setOutcome(undefined);
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        setOutcome({ text: t('advanced.importUnreadable'), alert: true });
        return;
      }
      const result = await importRecipes(recipes, data);
      setOutcome(
        result.ok
          ? {
              text: t('advanced.imported', {
                imported: result.value.imported.length,
                skipped: result.value.skipped.length,
              }),
              alert: false,
            }
          : { text: error(result.error), alert: true },
      );
    } catch (failure) {
      console.error(failure);
      setOutcome({ text: t('state.storageWrite'), alert: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <IonTitle>{t('advanced.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonListHeader>
            <IonLabel>{t('advanced.recipes')}</IonLabel>
          </IonListHeader>
          <IonItem button detail disabled={busy} onClick={() => input.current?.click()}>
            <IonLabel>
              {busy ? t('advanced.importing') : t('advanced.import')}
              <p>{t('advanced.importHint')}</p>
            </IonLabel>
          </IonItem>
          {outcome && (
            <IonItem lines="none">
              <IonLabel
                role={outcome.alert ? 'alert' : 'status'}
                className={outcome.alert ? 'text-alert' : ''}
              >
                {outcome.text}
              </IonLabel>
            </IonItem>
          )}
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label={t('advanced.import')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void importFile(file);
            }}
          />
          <IonItem routerLink="/device-checks" detail>
            <IonLabel>{t('recipes.deviceChecks')}</IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>
              <p>
                {t('checks.build')} {__APP_BUILD__} · {t('checks.storage')} {storage}
              </p>
            </IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};
