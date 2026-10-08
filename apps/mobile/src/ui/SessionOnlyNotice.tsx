import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';

/** In a browser the stores live in memory: say so, so "saved" is not read as durable. */
export const SessionOnlyNotice = () => {
  const { storage } = useServices();
  const { t } = useMessages();
  if (storage !== 'memory') return null;
  return (
    <p className="mt-0 mb-3 rounded-xl bg-track px-3 py-2 text-[13px] text-muted">
      {t('state.sessionOnly')}
    </p>
  );
};
