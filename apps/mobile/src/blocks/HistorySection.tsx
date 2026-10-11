import { IonItem, IonLabel } from '@ionic/react';
import type { BakeSummary } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { formatDayTime } from '../i18n/time';
import { Rows } from '../ui/Layout';

/** Bakes of one recipe, newest first; each opens its bake page and log. */
export const HistorySection = ({ bakes }: { bakes: readonly BakeSummary[] }) => {
  const { t, locale } = useMessages();
  if (bakes.length === 0) return <p className="px-1 text-muted">{t('history.empty')}</p>;
  return (
    <Rows>
      {bakes.map((bake) => (
        <IonItem key={bake.bakeId} routerLink={`/bakes/${bake.bakeId}`} detail lines="none">
          <IonLabel>
            <h2>{t(`history.status.${bake.status}`)}</h2>
            <p>
              {t('history.item', {
                date: formatDayTime(bake.startedAt ?? bake.updatedAt, locale),
                version: bake.recipeVersion ?? '—',
              })}
            </p>
          </IonLabel>
        </IonItem>
      ))}
    </Rows>
  );
};
