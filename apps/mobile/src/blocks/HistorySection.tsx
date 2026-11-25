import { useIonRouter } from '@ionic/react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { loadBake } from '@flourprint/core/application';
import type { BakeOrigin, BakeState, BakeSummary } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { formatDayTime, formatDuration } from '../i18n/time';
import { useServices, type Services } from '../services/services';
import { Ui } from '../ui/library';
import { useOutcomeText } from './Outcome';

interface HistorySectionProps {
  readonly bakes: readonly BakeSummary[];
  readonly loading?: boolean;
  readonly readFailed?: boolean;
  readonly recipeId: string;
  readonly world: BakeOrigin;
  readonly visible: boolean;
}

type VisibleStatus = 'active' | 'finished' | 'abandoned';
type VisibleBake = BakeSummary & { readonly status: VisibleStatus };

type DetailEntry =
  | { readonly version: number; readonly status: 'ready'; readonly state: BakeState }
  | { readonly version: number; readonly status: 'failed' };

interface DetailsState {
  readonly services?: Services;
  readonly contextKey: string;
  readonly byId: Readonly<Record<string, DetailEntry>>;
}

const STATUS_CLASS: Record<VisibleStatus, string> = {
  active:
    'inline-flex items-center rounded-pill bg-primary-container px-2.5 py-0.5 text-metadata font-semibold text-primary break-words',
  finished: 'text-supporting font-semibold text-on-surface break-words',
  abandoned: 'text-supporting font-semibold text-muted break-words',
};

const isVisibleBake = (bake: BakeSummary): bake is VisibleBake => bake.status !== 'notStarted';

const recordedDurationS = (
  startedAt: string | undefined,
  endedAt: string | undefined,
): number | undefined => {
  if (startedAt === undefined || endedAt === undefined) return undefined;
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
    ? (endMs - startMs) / 1_000
    : undefined;
};

const latestRating = (state: BakeState): number | undefined => {
  for (let i = state.observations.length - 1; i >= 0; i -= 1) {
    const rating = state.observations[i]?.payload.rating;
    if (rating !== undefined) return rating;
  }
  return undefined;
};

/** Preparations of one recipe (active first, then past, newest-updated first); each opens its bake page. */
export const HistorySection = ({
  bakes,
  loading = false,
  readFailed = false,
  recipeId,
  world,
  visible,
}: HistorySectionProps) => {
  const { t, locale } = useMessages();
  const outcomeText = useOutcomeText();
  const services = useServices();
  const router = useIonRouter();
  const headingId = useId();
  const contextKey = `${world}:${recipeId}`;

  const ordered = useMemo(() => {
    const visibleBakes = bakes.filter(isVisibleBake);
    return visibleBakes.sort((a, b) => {
      const aActive = a.status === 'active' ? 0 : 1;
      const bActive = b.status === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  }, [bakes]);

  const [detailsState, setDetailsState] = useState<DetailsState>(() => ({
    services,
    contextKey,
    byId: {},
  }));
  const detailsStateRef = useRef(detailsState);
  useEffect(() => {
    detailsStateRef.current = detailsState;
  }, [detailsState]);

  useEffect(() => {
    if (!visible || loading) return;

    const current = detailsStateRef.current;
    const currentById =
      current.services === services && current.contextKey === contextKey ? current.byId : {};
    const toLoad = ordered.filter((bake) => {
      if (bake.status !== 'finished') return false;
      const entry = currentById[bake.bakeId];
      return entry === undefined || entry.version !== bake.version || entry.status === 'failed';
    });
    if (toLoad.length === 0) return;

    let cancelled = false;
    for (const bake of toLoad) {
      void (async () => {
        const recordEntry = (entry: DetailEntry) => {
          setDetailsState((prev) => {
            const baseById =
              prev.services === services && prev.contextKey === contextKey ? prev.byId : {};
            return {
              services,
              contextKey,
              byId: {
                ...baseById,
                [bake.bakeId]: entry,
              },
            };
          });
        };
        try {
          const res = await loadBake(services.bakes, bake.bakeId);
          if (cancelled) return;
          if (!res.ok || (res.value.status === 'notStarted' && res.value.version === 0)) {
            recordEntry({ version: bake.version, status: 'failed' });
            return;
          }
          recordEntry({ version: bake.version, status: 'ready', state: res.value });
        } catch (error) {
          if (cancelled) return;
          console.error(error);
          recordEntry({ version: bake.version, status: 'failed' });
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [services, contextKey, ordered, visible, loading]);

  const activeDetails =
    detailsState.services === services && detailsState.contextKey === contextKey
      ? detailsState.byId
      : {};

  const hasDetailFailure =
    !loading &&
    ordered.some((bake) => {
      if (bake.status !== 'finished') return false;
      const entry = activeDetails[bake.bakeId];
      return entry !== undefined && entry.version === bake.version && entry.status === 'failed';
    });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 pb-6">
      <h2
        id={headingId}
        className="m-0 text-supporting font-bold tracking-wider text-muted uppercase"
      >
        {t('history.preparationsTitle')}
      </h2>
      {loading ? (
        <p role="status" className="m-0 px-1 text-supporting text-muted">
          {t('history.loading')}
        </p>
      ) : (
        <>
          {(readFailed || hasDetailFailure) && (
            <p role="alert" className="m-0 px-1 text-supporting text-alert">
              {t('state.storageRead')}
            </p>
          )}
          {!readFailed && ordered.length === 0 ? (
            <p className="m-0 px-1 text-supporting text-muted">{t('history.empty')}</p>
          ) : (
            ordered.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {ordered.map((bake) => {
                  const rawDetail =
                    bake.status === 'finished' ? activeDetails[bake.bakeId] : undefined;
                  const detail =
                    rawDetail !== undefined && rawDetail.version === bake.version
                      ? rawDetail
                      : { status: 'loading' as const };
                  const state = detail.status === 'ready' ? detail.state : undefined;
                  const revisionVersion =
                    bake.recipeVersion ?? state?.snapshot?.revisions.formula.version;
                  const revisionText =
                    revisionVersion === undefined
                      ? t('history.revisionUnknown')
                      : t('history.revision', { version: revisionVersion });

                  let body: ReactNode;
                  if (bake.status === 'active') {
                    body = (
                      <div className="min-w-0 text-supporting text-muted tabular-nums break-words">
                        {bake.startedAt !== undefined
                          ? t('history.startedAt', {
                              time: formatDayTime(bake.startedAt, locale),
                            })
                          : t('history.startedUnknown')}
                      </div>
                    );
                  } else {
                    const startedAt = state?.startedAt ?? bake.startedAt;
                    const endedAt = state?.endedAt ?? bake.endedAt;
                    const dateText = formatDayTime(startedAt ?? endedAt ?? bake.updatedAt, locale);
                    const totalDurationS = recordedDurationS(startedAt, endedAt);
                    const durationText =
                      totalDurationS !== undefined
                        ? t('bake.totalDuration', { duration: formatDuration(totalDurationS) })
                        : bake.status === 'abandoned' || detail.status === 'ready'
                          ? t('bake.totalDuration', { duration: t('bake.totalDurationUnknown') })
                          : undefined;
                    const rating = state ? latestRating(state) : undefined;
                    const ratingText =
                      rating !== undefined ? t('history.rating', { rating }) : t('history.unrated');

                    body = (
                      <>
                        {bake.status === 'finished' && (
                          <div className="min-w-0 break-words">
                            {detail.status === 'ready' ? (
                              <span className="text-body font-medium text-on-surface break-words">
                                {t('bake.outcome', {
                                  outcome: outcomeText(detail.state.outcome ?? 'unknown'),
                                })}
                              </span>
                            ) : detail.status === 'failed' ? (
                              <span className="text-supporting text-alert break-words">
                                {t('state.storageRead')}
                              </span>
                            ) : (
                              <span className="text-supporting text-muted break-words">
                                {t('history.detailLoading')}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-supporting text-muted tabular-nums break-words">
                          <span className="min-w-0 break-words">{dateText}</span>
                          {durationText !== undefined && (
                            <span className="min-w-0 break-words">{durationText}</span>
                          )}
                          {bake.status === 'finished' && detail.status === 'ready' && (
                            <span className="min-w-0 break-words">{ratingText}</span>
                          )}
                        </div>
                      </>
                    );
                  }

                  const href = `/bakes/${bake.bakeId}`;
                  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
                    if (
                      !event.defaultPrevented &&
                      event.button === 0 &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey
                    ) {
                      event.preventDefault();
                      router.push(href);
                    }
                  };

                  return (
                    <li key={bake.bakeId}>
                      <a
                        href={href}
                        onClick={handleClick}
                        className="block rounded-card text-on-surface no-underline focus-visible:fp-focus-ring"
                      >
                        <Ui
                          component="fp.surface"
                          variant="outlined"
                          padding="compact"
                          className="flex min-h-touch flex-col gap-1.5"
                        >
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className={STATUS_CLASS[bake.status]}>
                              {t(`history.status.${bake.status}`)}
                            </span>
                            <span className="text-metadata text-muted tabular-nums break-words">
                              {revisionText}
                            </span>
                          </div>
                          {body}
                        </Ui>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )
          )}
        </>
      )}
    </section>
  );
};
