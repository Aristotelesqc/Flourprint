import {
  IonRefresher,
  IonRefresherContent,
  useIonToast,
  type RefresherEventDetail,
} from '@ionic/react';
import { offersDevUpdate } from '../services/dev-update';
import { useDevUpdate } from '../services/use-dev-update';

/**
 * Pull to refresh on dev builds only (ADR 0016): the same check as "Load the latest dev build" in
 * Advanced. Release builds keep their data on the device and have nothing to refresh, so they
 * never show it.
 */
export const DevRefresher = () => {
  const [presentToast] = useIonToast();
  // The toast is awaited: a reload never hides its message.
  const check = useDevUpdate((message) => presentToast({ message, duration: 2500 }));
  if (!offersDevUpdate(__APP_CHANNEL__)) return null;
  const refresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await check();
    } finally {
      event.detail.complete();
    }
  };
  return (
    <IonRefresher slot="fixed" onIonRefresh={(event) => void refresh(event)}>
      <IonRefresherContent />
    </IonRefresher>
  );
};
