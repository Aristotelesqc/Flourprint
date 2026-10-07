import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { useState } from 'react';
import type { Recipe } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';

export const RecipesPage = () => {
  const { recipes } = useServices();
  const { t } = useMessages();
  const [list, setList] = useState<readonly Recipe[]>([]);

  // Pages stay mounted in the Ionic stack: refresh when the view becomes active again.
  useIonViewWillEnter(() => {
    void recipes.listRecipes().then(setList);
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('recipes.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {list.length === 0 ? (
          <p className="p-4 text-[var(--color-muted)]">{t('recipes.empty')}</p>
        ) : (
          <IonList>
            {list.map((recipe) => (
              <IonItem key={recipe.id} routerLink={`/recipes/${recipe.id}`} detail>
                <IonLabel>
                  <h2>{recipe.name}</h2>
                  <p>{t('recipes.version', { version: recipe.headVersion })}</p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
        <IonItem routerLink="/device-checks" lines="none" detail className="mt-6">
          <IonLabel color="medium">{t('recipes.deviceChecks')}</IonLabel>
        </IonItem>
      </IonContent>
    </IonPage>
  );
};
