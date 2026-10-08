import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { ResolvedFormula } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';

interface Props {
  readonly resolved: ResolvedFormula;
  readonly open: boolean;
  readonly onClose: () => void;
}

/** Explains a calculated value from the engine's own contributions (#8, #19). */
export const WaterExplanation = ({ resolved, open, onClose }: Props) => {
  const { t, grams, pct, name } = useMessages();
  const water = resolved.totalWater;
  return (
    <IonModal isOpen={open} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('explain.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          {water.contributions.map((c) => (
            <IonItem key={`${c.kind}-${c.source}`}>
              <IonLabel>
                {c.kind === 'pureWater'
                  ? t('explain.pureWater', { name: name(c.source) })
                  : c.kind === 'loss'
                    ? t('explain.loss', { name: name(c.source) })
                    : t('explain.ingredient', { name: name(c.source), status: c.status })}
              </IonLabel>
              <span slot="end">
                {grams(c.grams)}
                {c.range ? ` [${grams(c.range[0])} – ${grams(c.range[1])}]` : ''}
              </span>
            </IonItem>
          ))}
          {water.unknownContributors.map((id) => (
            <IonItem key={`unknown-${id}`}>
              <IonLabel>{t('explain.unknown', { name: name(id) })}</IonLabel>
            </IonItem>
          ))}
          <IonItem lines="none">
            <IonLabel>
              <strong>{t('formula.stat.totalWater')}</strong>
            </IonLabel>
            <strong slot="end">
              {grams(water.value)} · {pct(resolved.totalWaterPct)}
            </strong>
          </IonItem>
        </IonList>
        <IonButton expand="block" onClick={onClose}>
          {t('explain.close')}
        </IonButton>
      </IonContent>
    </IonModal>
  );
};
