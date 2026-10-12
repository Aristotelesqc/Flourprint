import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonRouterLink,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  bakeDigest,
  bakeStats,
  type BakeDigest,
  type BakeStats,
} from '@flourprint/core/application';
import { formatNumber } from '../i18n/numbers';
import { formatDayTime, formatDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { useServices } from '../services/services';
import { usePreferences } from '../services/use-preferences';
import { Card, SectionTitle } from '../ui/Layout';
import { SimulationBanner } from '../ui/SimulationBanner';

/**
 * Statistics of the bakes of the current mode (ADR 0014), computed by the application layer from
 * each bake's log; this screen only renders them.
 */
export const StatsPage = () => {
  const services = useServices();
  const { t } = useMessages();
  const { simulation } = usePreferences();
  const [stats, setStats] = useState<BakeStats>();
  const [readFailed, setReadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const names = new Map((await services.recipes.listRecipes()).map((r) => [r.id, r.name]));
      const summaries = await services.bakes.listBakes();
      const digests = await Promise.all(
        summaries.map(async (s) =>
          bakeDigest(s.bakeId, await services.bakes.loadEvents(s.bakeId), (id) => names.get(id)),
        ),
      );
      setStats(bakeStats(digests.filter((d): d is BakeDigest => d !== undefined)));
      setReadFailed(false);
    } catch (cause) {
      console.error(cause);
      setReadFailed(true);
    }
  }, [services]);
  useIonViewWillEnter(() => void load(), [load]);
  useEffect(() => void load(), [load, simulation]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/advanced" />
          </IonButtons>
          <IonTitle>{t('stats.title')}</IonTitle>
        </IonToolbar>
        <SimulationBanner />
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-4 pb-6">
          <span className="px-1 text-sm text-muted">
            {t(simulation ? 'stats.mode.simulation' : 'stats.mode.physical')}
          </span>
          {readFailed && <p role="alert">{t('state.storageRead')}</p>}
          {stats?.counts.total === 0 && <p className="m-0 px-1 text-muted">{t('stats.empty')}</p>}
          {stats && stats.counts.total > 0 && <Content stats={stats} />}
        </div>
      </IonContent>
    </IonPage>
  );
};

const Content = ({ stats }: { stats: BakeStats }) => {
  const { t, stepName, locale } = useMessages();
  const { counts } = stats;
  const signed = (seconds: number) =>
    Math.round(seconds / 60) === 0
      ? t('stats.onPlan')
      : t(seconds > 0 ? 'stats.longer' : 'stats.shorter', { duration: formatDuration(seconds) });
  const topRecipe = Math.max(...stats.recipes.map((r) => r.count));
  return (
    <>
      <Section title={t('stats.counts')}>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Figure label={t('stats.total')} value={counts.total} />
          <Figure label={t('stats.finished')} value={counts.finished} />
          <Figure label={t('stats.abandoned')} value={counts.abandoned} />
          <Figure label={t('stats.active')} value={counts.active} />
        </div>
      </Section>

      {counts.finished > 0 && (
        <Section title={t('stats.results')}>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Figure label={t('outcome.cooked')} value={counts.results.cooked} />
            <Figure label={t('outcome.dough')} value={counts.results.dough} />
            <Figure label={t('outcome.cookedAndDough')} value={counts.results.cookedAndDough} />
            <Figure label={t('outcome.unknown')} value={counts.results.unknown} />
          </div>
        </Section>
      )}

      {stats.cookingStages.length > 0 && (
        <Section title={t('stats.cookingStages')}>
          {stats.cookingStages.map((stage) => (
            <Bar
              key={stage.operation}
              label={stepName({ operation: stage.operation })}
              detail={String(stage.n)}
              share={stage.n / Math.max(...stats.cookingStages.map((s) => s.n))}
            />
          ))}
        </Section>
      )}

      <Section title={t('stats.recipes')}>
        {stats.recipes.slice(0, 5).map((recipe) => (
          <Bar
            key={recipe.recipeId}
            label={recipe.name ?? recipe.recipeId}
            detail={t('stats.bakeCount', { count: recipe.count })}
            share={recipe.count / topRecipe}
          />
        ))}
      </Section>

      <Section title={t('stats.durations')} hint={t('stats.durationsHint')}>
        {stats.durations.length === 0 ? (
          <span className="text-sm text-muted">{t('stats.nothing')}</span>
        ) : (
          stats.durations.map((d) => {
            const longest = Math.max(d.medianPlannedS, d.medianRecordedS, 1);
            return (
              <div key={d.operation} className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{stepName({ operation: d.operation })}</span>
                  <span className="shrink-0 text-sm font-semibold">
                    {signed(d.medianDifferenceS)}
                  </span>
                </span>
                <span className="h-1.5 rounded bg-track">
                  <span
                    className="block h-1.5 rounded bg-field"
                    style={{ width: `${(d.medianPlannedS / longest) * 100}%` }}
                  />
                </span>
                <span className="h-1.5 rounded bg-track">
                  <span
                    className="block h-1.5 rounded bg-accent"
                    style={{ width: `${(d.medianRecordedS / longest) * 100}%` }}
                  />
                </span>
                <span className="text-[13px] text-muted">
                  {t('stats.durationLine', {
                    planned: formatDuration(d.medianPlannedS),
                    recorded: formatDuration(d.medianRecordedS),
                    n: d.n,
                  })}
                </span>
              </div>
            );
          })
        )}
      </Section>

      <Section title={t('stats.readiness')}>
        {stats.readiness.marks === 0 ? (
          <span className="text-sm text-muted">{t('stats.nothing')}</span>
        ) : (
          <>
            <span className="font-semibold">
              {t('stats.readinessCount', { count: stats.readiness.marks })}
            </span>
            <span className="text-sm text-muted">
              {stats.readiness.medianDifferenceS === undefined
                ? t('stats.readinessNoModel')
                : t('stats.readinessCompared', {
                    recorded: formatDuration(stats.readiness.medianRecordedS ?? 0),
                    model: formatDuration(stats.readiness.medianModelS ?? 0),
                    difference: signed(stats.readiness.medianDifferenceS),
                    n: stats.readiness.compared,
                  })}
            </span>
          </>
        )}
      </Section>

      <Section title={t('stats.ratings')}>
        {stats.ratings.length === 0 ? (
          <span className="text-sm text-muted">{t('stats.nothing')}</span>
        ) : (
          stats.ratings.map((rating) => (
            <Bar
              key={rating.recipeId}
              label={rating.name ?? rating.recipeId}
              detail={t('stats.ratingLine', {
                average: formatNumber(Math.round(rating.average * 10) / 10, locale),
                n: rating.n,
              })}
              share={rating.average / 5}
            />
          ))
        )}
      </Section>

      <Section title={t('stats.recent')}>
        <ol className="m-0 flex list-none flex-col p-0 [&>*+*]:border-t [&>*+*]:border-line">
          {stats.recent.map((bake) => (
            <li key={bake.bakeId}>
              <IonRouterLink routerLink={`/bakes/${bake.bakeId}`} className="text-ink">
                <span className="flex items-center gap-3 py-2">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      bake.status === 'finished'
                        ? 'bg-accent'
                        : bake.status === 'active'
                          ? 'border-2 border-accent'
                          : 'bg-field'
                    }`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{bake.name ?? bake.recipeId}</span>
                    <span className="text-[13px] text-muted">
                      {t('stats.recentLine', {
                        date: bake.startedAt ? formatDayTime(bake.startedAt, locale) : '—',
                        status: t(`history.status.${bake.status}`),
                      })}
                    </span>
                  </span>
                  {bake.durationS !== undefined && (
                    <span className="shrink-0 text-sm text-muted">
                      {formatDuration(bake.durationS)}
                    </span>
                  )}
                </span>
              </IonRouterLink>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
};

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <SectionTitle>{title}</SectionTitle>
    <Card gap="gap-2.5">
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
      {children}
    </Card>
  </section>
);

const Figure = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col">
    <span className="text-2xl font-bold">{value}</span>
    <span className="text-xs text-muted">{label}</span>
  </div>
);

/** A labelled share of a full bar, in [0, 1]. */
const Bar = ({ label, detail, share }: { label: string; detail: string; share: number }) => (
  <div className="flex flex-col gap-1">
    <span className="flex items-baseline justify-between gap-2">
      <span className="truncate font-semibold">{label}</span>
      <span className="shrink-0 text-sm text-muted">{detail}</span>
    </span>
    <span className="h-1.5 rounded bg-track">
      <span
        className="block h-1.5 rounded bg-accent"
        style={{ width: `${Math.min(1, Math.max(0, share)) * 100}%` }}
      />
    </span>
  </div>
);
