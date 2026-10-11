import { Capacitor } from '@capacitor/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import type { CheckResult } from '@flourprint/adapters/testing';
import type { MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import {
  markerSupported,
  readMarker,
  runStoreChecks,
  writeMarker,
} from '../services/device-checks';
import { useServices } from '../services/services';

const MANUAL: readonly MessageKey[] = [
  'checks.manual.offline',
  'checks.manual.decimal',
  'checks.manual.keyboard',
  'checks.manual.draft',
  'checks.manual.theme',
];

/** Spikes #23 and #24 on the real device: environment, storage contract, forced-stop marker. */
export const DeviceChecksPage = () => {
  const services = useServices();
  const { t, locale } = useMessages();
  const [sqlite, setSqlite] = useState<string>();
  const [results, setResults] = useState<CheckResult[]>();
  const [running, setRunning] = useState(false);
  const [marker, setMarker] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    void services.sqliteVersion().then(setSqlite);
    void readMarker().then(setMarker);
  }, [services]);

  const environment: [string, string][] = [
    [t('checks.build'), __APP_BUILD__],
    [t('checks.platform'), Capacitor.getPlatform()],
    [t('checks.webview'), navigator.userAgent],
    [t('checks.storage'), services.storage],
    [t('checks.sqlite'), sqlite ?? '—'],
  ];

  const run = async () => {
    setRunning(true);
    setResults(await runStoreChecks());
    setRunning(false);
  };

  const mark = async () => {
    const at = new Date().toISOString();
    await writeMarker(at);
    setMarker(await readMarker());
  };

  const copy = async () => {
    const report = [
      `Flourprint device checks (${new Date().toISOString()}, locale ${locale})`,
      ...environment.map(([name, value]) => `${name}: ${value}`),
      `Marker: ${marker ?? 'none'}`,
      ...(results ?? []).map(
        (r) =>
          `${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${Math.round(r.durationMs)} ms)${r.message ? ` — ${r.message}` : ''}`,
      ),
    ].join('\n');
    await navigator.clipboard.writeText(report);
    setNotice(t('checks.copied'));
  };

  const passed = results?.filter((r) => r.ok).length ?? 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recipes" />
          </IonButtons>
          <IonTitle>{t('checks.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="mb-3">{t('checks.intro')}</p>

        <IonList>
          <IonListHeader>{t('checks.environment')}</IonListHeader>
          {environment.map(([name, value]) => (
            <IonItem key={name}>
              <IonLabel className="ion-text-wrap">
                <h3>{name}</h3>
                <p>{value}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonList>
          <IonListHeader>{t('checks.storeTitle')}</IonListHeader>
          <IonButton expand="block" disabled={running} onClick={() => void run()}>
            {running ? t('checks.running') : t('checks.run')}
          </IonButton>
          {results && (
            <IonNote className="block p-2">
              {t('checks.summary', { passed, total: results.length })}
            </IonNote>
          )}
          {results?.map((r) => (
            <IonItem key={r.name}>
              <IonLabel className="ion-text-wrap">
                <h3 className={r.ok ? '' : 'text-[var(--color-alert)]'}>
                  {r.ok ? '✓' : '✗'} {r.name}
                </h3>
                {r.message && <p>{r.message}</p>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonList>
          <IonListHeader>{t('checks.markerTitle')}</IonListHeader>
          <p className="px-4">{t('checks.markerHelp')}</p>
          {markerSupported() ? (
            <>
              <p className="px-4 font-semibold">
                {marker
                  ? t('checks.markerLast', { time: new Date(marker).toLocaleString(locale) })
                  : t('checks.markerNone')}
              </p>
              <IonButton expand="block" fill="outline" onClick={() => void mark()}>
                {t('checks.markerWrite')}
              </IonButton>
            </>
          ) : (
            <IonNote className="block px-4">{t('checks.markerUnavailable')}</IonNote>
          )}
        </IonList>

        <IonList>
          <IonListHeader>{t('checks.manualTitle')}</IonListHeader>
          {MANUAL.map((key) => (
            <IonItem key={key}>
              <IonLabel className="ion-text-wrap">{t(key)}</IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonButton expand="block" className="mt-4" onClick={() => void copy()}>
          {t('checks.copy')}
        </IonButton>
        {notice && <p className="mt-2">{notice}</p>}
      </IonContent>
    </IonPage>
  );
};
