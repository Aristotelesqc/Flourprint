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
  IonToggle,
  IonToolbar,
  useIonAlert,
} from '@ionic/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { importRecipes } from '@flourprint/core/application';
import type { BakeOrigin, TemperatureContext } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { offersDevUpdate } from '../services/dev-update';
import { sampleRecipesFile } from '../services/sample-recipes';
import { useDevUpdate } from '../services/use-dev-update';
import { feedbackFileName, feedbackJson } from '../services/feedback';
import { BAKES_CHANGED, type Permission } from '../services/notifications';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';
import { Segmented } from '../ui/Segmented';
import { SimulationBanner } from '../ui/SimulationBanner';

const CONTEXTS: readonly TemperatureContext[] = ['oven', 'cold', 'ambient'];

/** Advanced menu: recipe import, diagnostics and build details, kept off the main screens. */
export const AdvancedPage = () => {
  const { t, error } = useMessages();
  const services = useServices();
  const { storage, recipes, platform, browserData } = services;
  const [presentAlert] = useIonAlert();
  const eraseBrowserData = () =>
    void presentAlert({
      header: t('advanced.browserErase'),
      message: t('advanced.browserEraseConfirm'),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('advanced.browserErase'),
          role: 'destructive',
          handler: () => {
            void browserData?.erase().then(() => window.location.reload());
          },
        },
      ],
    });
  const preferences = usePreferences();
  const [erased, setErased] = useState<{ text: string; alert: boolean }>();

  /** Erases one history after a confirmation naming its bakes (ADR 0014, persistence.md). */
  const eraseHistory = async (origin: BakeOrigin) => {
    setErased(undefined);
    let count: number;
    try {
      count = (await services.bakes.listBakesOf(origin)).length;
    } catch (failure) {
      console.error(failure);
      setErased({ text: t('state.storageRead'), alert: true });
      return;
    }
    const title = t(origin === 'simulation' ? 'advanced.eraseSimulation' : 'advanced.eraseReal');
    void presentAlert({
      header: title,
      message: t('advanced.eraseConfirm', { count }),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('advanced.erase'),
          role: 'destructive',
          handler: () => {
            void services.bakes
              .deleteBakes(origin)
              .then((deleted) =>
                setErased({ text: t('advanced.erased', { count: deleted }), alert: false }),
              )
              .catch((failure: unknown) => {
                console.error(failure);
                setErased({ text: t('advanced.eraseFailed'), alert: true });
              })
              .finally(() => window.dispatchEvent(new Event(BAKES_CHANGED)));
          },
        },
      ],
    });
  };

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
        link.download = feedbackFileName(services.realClock.now());
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
  /** Additive import of a recipes file (persistence.md): from a file, or the sample on dev builds. */
  const importData = async (read: () => Promise<unknown>) => {
    setBusy(true);
    setOutcome(undefined);
    try {
      let data: unknown;
      try {
        data = await read();
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
        <SimulationBanner />
      </IonHeader>
      <IonContent>
        <IonList>
          <IonListHeader>
            <IonLabel>{t('advanced.simulation')}</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonToggle
              checked={preferences.simulation}
              onIonChange={(event) => services.preferences.setSimulation(event.detail.checked)}
            >
              <IonLabel>
                {t('advanced.simulation.toggle')}
                <p className="whitespace-normal">{t('advanced.simulation.hint')}</p>
              </IonLabel>
            </IonToggle>
          </IonItem>
          <IonItem routerLink="/stats" detail>
            <IonLabel>
              {t('advanced.stats')}
              <p>{t('advanced.statsHint')}</p>
            </IonLabel>
          </IonItem>
          <IonListHeader>
            <IonLabel>{t('advanced.units')}</IonLabel>
          </IonListHeader>
          {CONTEXTS.map((context) => (
            <IonItem key={context} lines="none">
              <div className="flex w-full items-center justify-between gap-3 py-1">
                <span id={`unit-${context}`}>{t(`advanced.units.${context}`)}</span>
                <span className="w-36 shrink-0" aria-labelledby={`unit-${context}`} role="group">
                  <Segmented
                    size="small"
                    value={preferences.units[context]}
                    options={[
                      { value: 'C', label: '°C' },
                      { value: 'F', label: '°F' },
                    ]}
                    onChange={(unit) => services.preferences.setUnit(context, unit)}
                  />
                </span>
              </div>
            </IonItem>
          ))}
          <IonItem>
            <IonLabel>
              <p className="whitespace-normal">{t('advanced.units.hint')}</p>
            </IonLabel>
          </IonItem>
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
          {browserData && (
            <IonItem button detail onClick={eraseBrowserData}>
              <IonLabel>
                {t('advanced.browserErase')}
                <p>{t('advanced.browserEraseHint')}</p>
              </IonLabel>
            </IonItem>
          )}
          <IonListHeader>
            <IonLabel>{t('advanced.history')}</IonLabel>
          </IonListHeader>
          {(['physical', 'simulation'] as const).map((origin) => (
            <IonItem key={origin} button detail onClick={() => void eraseHistory(origin)}>
              <IonLabel>
                {t(origin === 'simulation' ? 'advanced.eraseSimulation' : 'advanced.eraseReal')}
                <p>{t('advanced.eraseHint')}</p>
              </IonLabel>
            </IonItem>
          ))}
          {erased && (
            <IonItem lines="none">
              <IonLabel
                role={erased.alert ? 'alert' : 'status'}
                className={erased.alert ? 'text-alert' : ''}
              >
                {erased.text}
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
          <IonItem routerLink="/trash" detail>
            <IonLabel>
              {t('advanced.trash')}
              <p>{t('advanced.trashHint')}</p>
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
              if (file) void importData(async () => JSON.parse(await file.text()));
            }}
          />
          {offersDevUpdate(__APP_CHANNEL__) && (
            <IonItem
              button
              detail
              disabled={busy}
              onClick={() =>
                void importData(async () => sampleRecipesFile(new Date().toISOString()))
              }
            >
              <IonLabel>
                {t('advanced.sample')}
                <p>{t('advanced.sampleHint')}</p>
              </IonLabel>
            </IonItem>
          )}
          <IonItem routerLink="/device-checks" detail>
            <IonLabel>{t('recipes.deviceChecks')}</IonLabel>
          </IonItem>
          {offersDevUpdate(__APP_CHANNEL__) && <DevUpdateItem />}
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

/**
 * Dev builds only (ADR 0016): load the latest deployment of this site, for the dev APK whose
 * WebView may still show an older one. Absent from release builds.
 */
const DevUpdateItem = () => {
  const { t } = useMessages();
  const [status, setStatus] = useState<string>();
  const check = useDevUpdate(async (message) => {
    setStatus(message);
    // Let the message paint before a reload replaces the page.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  });
  const update = async () => {
    setStatus(t('advanced.devUpdate.checking'));
    await check();
  };
  return (
    <>
      <IonItem button detail={false} onClick={() => void update()}>
        <IonLabel>
          {t('advanced.devUpdate')}
          <p>{t('advanced.devUpdate.hint', { label: __APP_LABEL__ })}</p>
        </IonLabel>
      </IonItem>
      {status !== undefined && (
        <IonItem lines="none">
          <IonLabel role="status">{status}</IonLabel>
        </IonItem>
      )}
    </>
  );
};
