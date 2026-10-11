import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';

/**
 * In a browser the stores live in memory, kept in this browser when it can (ADR 0015): say where
 * the data lives, so "saved" is not read as synced or as durable when it is not.
 */
export const SessionOnlyNotice = () => {
  const { storage, browserData } = useServices();
  const { t } = useMessages();
  if (storage !== 'memory') return null;
  const unreadable = browserData?.loaded === 'unreadable';
  return (
    <p
      role={unreadable ? 'alert' : undefined}
      className={`mt-0 mb-3 rounded-xl bg-track px-3 py-2 text-[13px] ${unreadable ? 'text-alert' : 'text-muted'}`}
    >
      {t(
        unreadable
          ? 'state.browserUnreadable'
          : browserData
            ? 'state.browserKept'
            : 'state.sessionOnly',
      )}
    </p>
  );
};
