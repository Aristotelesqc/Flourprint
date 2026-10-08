import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';

/** Advanced menu: diagnostics and build details, kept off the main screens. */
export const AdvancedPage = () => {
  const { t } = useMessages();
  const { storage } = useServices();
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
