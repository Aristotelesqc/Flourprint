import {
  IonActionSheet,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonListHeader,
  IonSelect,
  IonSelectOption,
  useIonAlert,
} from '@ionic/react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchOpenPulls,
  parsePrNumber,
  parseVersionId,
  versionOptions,
  type VersionOption,
  pullNeedsApk,
  pullNumber,
  DEFAULT_VERSION,
  prVersion,
  type DataEntry,
  type OpenPull,
  type VersionId,
} from '@flourprint/adapters/dev-versions';
import { useMessages } from '../i18n/use-messages';
import {
  copyThenLoad,
  devVersionsStart,
  type CopyOutcome,
  type DevVersionsHost,
} from '../services/dev-versions';
import { useServices } from '../services/services';

type Say = { text: string; alert: boolean } | undefined;

/**
 * Dev apps only (ADR 0023): choose the web version to load (dev, canary, main or a pull request),
 * copy the current data to it, and see and delete the data each version keeps on this device.
 * Rendered only when the dev app provides a host: absent from release builds and browsers.
 */
export const DevVersions = ({ host }: { host: DevVersionsHost }) => {
  const { t, locale } = useMessages();
  const services = useServices();
  const [presentAlert] = useIonAlert();
  const [loaded, setLoaded] = useState<VersionId>();
  const [pulls, setPulls] = useState<OpenPull[] | 'loading' | 'unavailable'>('loading');
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [native, setNative] = useState(false);
  const [number, setNumber] = useState('');
  const [numberError, setNumberError] = useState(false);
  const [choice, setChoice] = useState<VersionId>();
  // Remounts the dropdown after a cancelled choice, so it shows the loaded version again.
  const [selectKey, setSelectKey] = useState(0);
  const [status, setStatus] = useState<Say>();
  const [busy, setBusy] = useState(false);
  const copy = devVersionsStart()?.copy;

  const name = useCallback(
    (version: VersionId): string => {
      const pull = pullNumber(version);
      return pull === undefined
        ? t(`advanced.versions.${version}` as 'advanced.versions.dev')
        : t('advanced.versions.pull', { number: pull });
    },
    [t],
  );

  const refreshData = useCallback(async () => {
    try {
      setEntries(await host.listData());
    } catch (cause) {
      console.error(cause);
    }
  }, [host]);

  useEffect(() => {
    let cancelled = false;
    void host.current().then(
      (version) => {
        if (cancelled) return;
        setLoaded(version);
        const pull = pullNumber(version);
        if (pull !== undefined) {
          void pullNeedsApk(pull).then((needs) => !cancelled && setNative(needs === true));
        }
      },
      (cause: unknown) => console.error(cause),
    );
    void fetchOpenPulls().then((list) => !cancelled && setPulls(list ?? 'unavailable'));
    void refreshData();
    return () => {
      cancelled = true;
    };
  }, [host, refreshData]);

  const fail = (
    key: 'advanced.versions.switchFailed' | 'advanced.versions.deleteFailed',
    cause: unknown,
  ) => {
    console.error(cause);
    setBusy(false);
    setStatus({ text: t(key), alert: true });
  };

  /** Loads a version; a pull request that changes native code is flagged first (best effort). */
  const load = async (version: VersionId, withCopy: boolean) => {
    setStatus(undefined);
    setBusy(true);
    try {
      if (withCopy) {
        if (!(await copyThenLoad(host, services, version))) {
          setBusy(false);
          setStatus({ text: t('advanced.versions.copyPrepareFailed'), alert: true });
        }
      } else {
        await host.select(version);
      }
    } catch (cause) {
      fail('advanced.versions.switchFailed', cause);
    }
  };

  const choose = async (version: VersionId) => {
    if (version === loaded) return;
    const pull = pullNumber(version);
    const needsApk = pull === undefined ? false : await pullNeedsApk(pull);
    if (needsApk === true) {
      void presentAlert({
        header: name(version),
        message: t('advanced.versions.native'),
        buttons: [
          { text: t('bake.cancel'), role: 'cancel' },
          { text: t('advanced.versions.load'), handler: () => setChoice(version) },
        ],
      });
      return;
    }
    setChoice(version);
  };

  const submitNumber = () => {
    const parsed = parsePrNumber(number);
    const version = parsed === undefined ? undefined : prVersion(parsed);
    setNumberError(version === undefined);
    if (version !== undefined) void choose(version);
  };

  const confirmDelete = (version: VersionId) => {
    const current = version === loaded;
    void presentAlert({
      header: t('advanced.versions.deleteTitle', { version: name(version) }),
      message: `${t('advanced.versions.deleteMessage')}${current ? ` ${t('advanced.versions.deleteRestart')}` : ''}`,
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('advanced.versions.delete'),
          role: 'destructive',
          handler: () => void remove(version),
        },
      ],
    });
  };

  const remove = async (version: VersionId) => {
    setStatus(undefined);
    try {
      // The loaded version stops saving first, so nothing rewrites what is being deleted.
      if (version === loaded) await services.browserData?.erase();
      await host.deleteData(version);
      setStatus({ text: t('advanced.versions.deleted', { version: name(version) }), alert: false });
      await refreshData();
    } catch (cause) {
      fail('advanced.versions.deleteFailed', cause);
    }
  };

  const formatSize = (bytes: number) => {
    const megabytes = bytes / (1024 * 1024);
    const [value, unit] =
      megabytes >= 1 ? [megabytes, 'megabyte'] : [Math.max(bytes / 1024, 0.1), 'kilobyte'];
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const copyText: Record<
    CopyOutcome,
    'advanced.versions.copyDone' | 'advanced.versions.copyNotEmpty' | 'advanced.versions.copyFailed'
  > = {
    copied: 'advanced.versions.copyDone',
    notEmpty: 'advanced.versions.copyNotEmpty',
    failed: 'advanced.versions.copyFailed',
  };
  const optionText = (option: VersionOption) =>
    option.title ? `${name(option.version)} · ${option.title}` : name(option.version);
  const versionLabel = (version: VersionId) =>
    version === loaded
      ? t('advanced.versions.loadedMark', { version: name(version) })
      : name(version);

  return (
    <>
      <IonListHeader>
        <IonLabel>{t('advanced.versions')}</IonLabel>
      </IonListHeader>
      <IonItem>
        <IonLabel className="whitespace-normal" data-testid="loaded-version">
          {loaded === undefined
            ? ''
            : t('advanced.versions.loaded', { version: name(loaded), label: __APP_LABEL__ })}
          {native && (
            <p className="whitespace-normal text-alert">{t('advanced.versions.native')}</p>
          )}
        </IonLabel>
        {loaded !== undefined && loaded !== DEFAULT_VERSION && (
          <IonButton
            slot="end"
            fill="outline"
            disabled={busy}
            onClick={() => void load(DEFAULT_VERSION, false)}
          >
            {t('advanced.versions.returnDev')}
          </IonButton>
        )}
      </IonItem>
      {copy && (
        <IonItem lines="none">
          <IonLabel
            role={copy === 'copied' ? 'status' : 'alert'}
            className={`whitespace-normal ${copy === 'copied' ? '' : 'text-alert'}`}
          >
            {t(copyText[copy])}
          </IonLabel>
        </IonItem>
      )}
      <IonItem>
        <IonSelect
          key={selectKey}
          label={t('advanced.versions.choose')}
          labelPlacement="stacked"
          interface="alert"
          cancelText={t('bake.cancel')}
          disabled={busy || loaded === undefined}
          value={loaded}
          onIonChange={(event) => {
            const version = parseVersionId(event.detail.value);
            if (version !== undefined && version !== loaded) void choose(version);
          }}
        >
          {versionOptions(Array.isArray(pulls) ? pulls : undefined, loaded).map((option) => (
            <IonSelectOption key={option.version} value={option.version}>
              {optionText(option)}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
      {pulls === 'loading' && (
        <IonItem lines="none">
          <IonLabel role="status">{t('advanced.versions.pullsLoading')}</IonLabel>
        </IonItem>
      )}
      {pulls === 'unavailable' && (
        <>
          <IonItem lines="none">
            <IonLabel className="whitespace-normal" role="status">
              {t('advanced.versions.pullsUnavailable')}
            </IonLabel>
          </IonItem>
          <IonItem>
            <IonInput
              label={t('advanced.versions.number')}
              labelPlacement="stacked"
              inputmode="numeric"
              value={number}
              className={numberError ? 'text-alert' : ''}
              onIonInput={(event) => {
                setNumber(String(event.detail.value ?? ''));
                setNumberError(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitNumber();
              }}
            />
            <IonButton
              slot="end"
              fill="outline"
              disabled={busy || number.trim() === ''}
              onClick={submitNumber}
            >
              {t('advanced.versions.numberLoad')}
            </IonButton>
          </IonItem>
          {numberError && (
            <IonItem lines="none">
              <IonLabel role="alert" className="whitespace-normal text-alert">
                {t('advanced.versions.numberInvalid')}
              </IonLabel>
            </IonItem>
          )}
        </>
      )}
      <IonListHeader>
        <IonLabel>{t('advanced.versions.data')}</IonLabel>
      </IonListHeader>
      <IonItem>
        <IonLabel className="whitespace-normal">
          <p className="whitespace-normal">{t('advanced.versions.dataHint')}</p>
        </IonLabel>
      </IonItem>
      {entries.length === 0 && (
        <IonItem lines="none">
          <IonLabel>{t('advanced.versions.dataNone')}</IonLabel>
        </IonItem>
      )}
      {entries.map((entry) => (
        <IonItem key={entry.version}>
          <IonLabel>
            {versionLabel(entry.version)}
            <p>{formatSize(entry.bytes)}</p>
          </IonLabel>
          <IonButton
            slot="end"
            fill="outline"
            color="danger"
            aria-label={`${t('advanced.versions.delete')} ${name(entry.version)}`}
            onClick={() => confirmDelete(entry.version)}
          >
            {t('advanced.versions.delete')}
          </IonButton>
        </IonItem>
      ))}
      {loaded !== undefined && (
        <IonItem button detail={false} onClick={() => confirmDelete(loaded)}>
          <IonLabel className="whitespace-normal">
            {t('advanced.versions.deleteData')}
            <p className="whitespace-normal">
              {t('advanced.versions.deleteDataHint', { version: name(loaded) })}
            </p>
          </IonLabel>
        </IonItem>
      )}
      {status && (
        <IonItem lines="none">
          <IonLabel
            role={status.alert ? 'alert' : 'status'}
            className={`whitespace-normal ${status.alert ? 'text-alert' : ''}`}
          >
            {status.text}
          </IonLabel>
        </IonItem>
      )}
      <IonActionSheet
        isOpen={choice !== undefined}
        header={choice === undefined ? '' : name(choice)}
        buttons={[
          {
            text: t('advanced.versions.load'),
            handler: () => choice !== undefined && void load(choice, false),
          },
          {
            text: t('advanced.versions.copyLoad'),
            handler: () => choice !== undefined && void load(choice, true),
          },
          { text: t('bake.cancel'), role: 'cancel' },
        ]}
        onDidDismiss={() => {
          setChoice(undefined);
          setSelectKey((key) => key + 1);
        }}
      />
    </>
  );
};
