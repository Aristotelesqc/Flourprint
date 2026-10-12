import { useMessages } from '../i18n/use-messages';
import { fetchDeployedBuild } from './dev-update';
import { useServices } from './services';

/**
 * The one path to the latest dev build, shared by Advanced and the pull-to-refresh gesture
 * (ADR 0016). A reload happens right after the browser snapshot is durably saved; on Android and
 * the desktop shell every write is already a committed SQLite transaction. `show` displays the
 * outcome and resolves once it is on screen, so the reload never hides it.
 */
export const useDevUpdate = (show: (message: string) => Promise<void>) => {
  const { t } = useMessages();
  const services = useServices();
  return async (): Promise<void> => {
    const deployed = await fetchDeployedBuild();
    if (deployed === undefined) {
      await show(t('advanced.devUpdate.unreachable'));
      return;
    }
    if (deployed.build === __APP_BUILD__) {
      await show(t('advanced.devUpdate.current', { label: __APP_LABEL__ }));
      return;
    }
    await show(t('advanced.devUpdate.loading', { label: deployed.label }));
    // The flush comes last, so a write made while the message appeared is saved too.
    const saved = services.browserData ? await services.browserData.flush() : true;
    if (!saved) {
      await show(t('advanced.devUpdate.saveFailed'));
      return;
    }
    window.location.reload();
  };
};
