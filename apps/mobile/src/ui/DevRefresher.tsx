import {
  IonRefresher,
  IonRefresherContent,
  useIonToast,
  type RefresherEventDetail,
} from '@ionic/react';
import { useMessages } from '../i18n/use-messages';
import { fetchDeployedBuild, offersDevUpdate } from '../services/dev-update';

/**
 * Pull to refresh on dev builds only (ADR 0016): the same check as "Load the latest dev build" in
 * Advanced. Release builds keep their data on the device and have nothing to refresh, so they
 * never show it.
 */
export const DevRefresher = () => {
  const { t } = useMessages();
  const [presentToast] = useIonToast();
  if (!offersDevUpdate(__APP_CHANNEL__)) return null;
  const refresh = async (event: CustomEvent<RefresherEventDetail>) => {
    const deployed = await fetchDeployedBuild();
    event.detail.complete();
    if (deployed === undefined) {
      void presentToast({ message: t('advanced.devUpdate.unreachable'), duration: 2500 });
    } else if (deployed.build === __APP_BUILD__) {
      void presentToast({
        message: t('advanced.devUpdate.current', { label: __APP_LABEL__ }),
        duration: 2000,
      });
    } else {
      void presentToast({ message: t('advanced.devUpdate.loading', { label: deployed.label }) });
      window.location.reload();
    }
  };
  return (
    <IonRefresher slot="fixed" onIonRefresh={(event) => void refresh(event)}>
      <IonRefresherContent />
    </IonRefresher>
  );
};
