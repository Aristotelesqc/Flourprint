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
import { useCallback, useEffect, useRef, useState } from 'react';
import { importRecipes } from '@flourprint/core/application';
import { useMessages } from '../i18n/use-messages';
import { feedbackFileName, feedbackJson } from '../services/feedback';
import { BAKES_CHANGED, type Permission } from '../services/notifications';
import { useServices } from '../services/services';

/** Advanced menu: recipe import, diagnostics and build details, kept off the main screens. */
export const AdvancedPage = () => {
  const { t, error } = useMessages();
  const services = useServices();
  const { storage, recipes, platform } = services;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ text: string; alert: boolean }>();

  const { notifier } = services;
  const [permission, setPermission] = useState<Permission>();
  const [exact, setExact] = useState<boolean>();
  const readReminders = useCallback(async () => {
    try {
      setPermission(await notifier.permission());
      if (notifier.exact) setExact(await notifier.exact.check());
    } catch (failure) {
      console.error(failure);
    }
  }, [notifier]);
  useEffect(() => void readReminders(), [readReminders]);

  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<{ text: string; alert: boolean }>();

  /** Everything recorded, for review by a person or an agent (history.md, feedback export). */
  const exportAll = async (target: 'clipboard' | 'file') => {
    setExporting(true);
    setExported(undefined);
    try {
      const data = await feedbackJson(services);
      if (!data) {
        setExported({ text: t('advanced.exportFailed'), alert: true });
        return;
      }
      const size = Math.ceil(new Blob([data.json]).size / 1024);
      if (target === 'clipboard') {
        try {
          await navigator.clipboard.writeText(data.json);
        } catch (failure) {
          console.error(failure);
          setExported({ text: t('advanced.copyFailed'), alert: true });
          return;
        }
        setExported({ text: t('advanced.copied', { size, bakes: data.bakes }), alert: false });
      } else {
        const url = URL.createObjectURL(new Blob([data.json], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = feedbackFileName(services.clock.now());
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setExported({ text: t('advanced.saved', { size, bakes: data.bakes }), alert: false });
      }
    } catch (failure) {
      console.error(failure);
      setExported({ text: t('advanced.exportFailed'), alert: true });
    } finally {
      setExporting(false);
    }
  };

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
            <IonLabel>{t('advanced.feedback')}</IonLabel>
          </IonListHeader>
          <IonItem button detail disabled={exporting} onClick={() => void exportAll('clipboard')}>
            <IonLabel>
              {exporting ? t('advanced.exporting') : t('advanced.copyAll')}
              <p>{t('advanced.copyAllHint')}</p>
            </IonLabel>
          </IonItem>
          {/* The Android web view has no download: the clipboard is the way out there. */}
          {platform !== 'android' && (
            <IonItem button detail disabled={exporting} onClick={() => void exportAll('file')}>
              <IonLabel>{t('advanced.saveAll')}</IonLabel>
            </IonItem>
          )}
          {exported && (
            <IonItem lines="none">
              <IonLabel
                role={exported.alert ? 'alert' : 'status'}
                className={exported.alert ? 'text-alert' : ''}
              >
                {exported.text}
              </IonLabel>
            </IonItem>
          )}
          <IonListHeader>
            <IonLabel>{t('advanced.notifications')}</IonLabel>
          </IonListHeader>
          <IonItem lines={permission === 'prompt' ? 'none' : 'full'}>
            <IonLabel>
              {notifier.kind === 'none'
                ? t('advanced.notify.none')
                : permission === undefined
                  ? ''
                  : t(`advanced.notify.${permission}`)}
              {notifier.kind === 'web' && permission === 'granted' && (
                <p>{t('advanced.notify.web')}</p>
              )}
            </IonLabel>
          </IonItem>
          {permission === 'prompt' && (
            <IonItem
              button
              detail
              onClick={() =>
                void notifier
                  .request()
                  .then(readReminders)
                  .then(() => window.dispatchEvent(new Event(BAKES_CHANGED)))
              }
            >
              <IonLabel>{t('advanced.notify.allow')}</IonLabel>
            </IonItem>
          )}
          {permission === 'granted' && exact === false && notifier.exact && (
            <IonItem button detail onClick={() => void notifier.exact?.open().then(readReminders)}>
              <IonLabel>
                {t('advanced.notify.exact')}
                <p>{t('advanced.notify.exactHint')}</p>
              </IonLabel>
            </IonItem>
          )}
          <IonListHeader>
            <IonLabel>{t('advanced.recipes')}</IonLabel>
          </IonListHeader>
          <IonItem routerLink="/flours" detail>
            <IonLabel>
              {t('advanced.flours')}
              <p>{t('advanced.floursHint')}</p>
            </IonLabel>
          </IonItem>
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
