import { useIonRouter } from '@ionic/react';
import type { MouseEvent, ReactNode } from 'react';
import {
  liveProjection,
  resolveFormula,
  type BakeState,
  type Instant,
  type PreparationOutcome,
  type Recipe,
  type Revision,
} from '@flourprint/core/domain';
import type { MessageKey } from '../i18n/messages';
import { formatDuration, formatRelative } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { recipeDurationDetails } from '../services/recipe-duration';
import { totalWaterKey } from './water-label';

export type CardHistory =
  | { readonly kind: 'neverPrepared' }
  | { readonly kind: 'abandoned'; readonly endedAt?: Instant }
  | {
      readonly kind: 'finished';
      readonly result: PreparationOutcome['result'] | 'unknown';
      readonly endedAt?: Instant;
      readonly rating?: number;
    };

export interface LibraryCardItem {
  readonly recipe: Recipe;
  readonly revision?: Revision;
  readonly history: CardHistory;
  readonly variants?: number;
  readonly hasDraft: boolean;
  readonly preDoughs: readonly string[];
  readonly activeBakes: readonly BakeState[];
}

export type PreparationRemaining =
  { readonly kind: 'known'; readonly seconds: number } | { readonly kind: 'unknown' };

type TranslateFn = (key: MessageKey, values?: Record<string, string | number>) => string;

const LibraryLink = ({
  href,
  label,
  className,
  children,
}: {
  readonly href: string;
  readonly label: string;
  readonly className: string;
  readonly children: ReactNode;
}) => {
  const router = useIonRouter();
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    router.push(href);
  };
  return (
    <a href={href} aria-label={label} className={className} onClick={open}>
      {children}
    </a>
  );
};

/**
 * Computes display remaining time across every unfinished step of the preparation as a whole
 * from `liveProjection(bake, now)`. Unknown if any unfinished step lacks a projected end.
 */
export const preparationRemaining = (bake: BakeState, now: Instant): PreparationRemaining => {
  const process = bake.process;
  const projection = liveProjection(bake, now);
  if (!process || !projection?.ok) return { kind: 'unknown' };

  const unfinished = process.steps.filter((step) => bake.steps[step.id]?.endedAt === undefined);
  if (unfinished.length === 0) return { kind: 'known', seconds: 0 };

  let latestEndMs = -Infinity;
  for (const step of unfinished) {
    const end = projection.value.steps[step.id]?.end;
    if (end === undefined) return { kind: 'unknown' };
    const endMs = Date.parse(end);
    if (!Number.isFinite(endMs)) return { kind: 'unknown' };
    if (endMs > latestEndMs) latestEndMs = endMs;
  }

  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) return { kind: 'unknown' };
  return { kind: 'known', seconds: Math.max(0, (latestEndMs - nowMs) / 1000) };
};

/**
 * Presentation-only minute formatter: floors lower bounds so displayed floors never exceed known
 * time, and marks non-whole-minute durations as approximate.
 */
export const formatMinuteDuration = (
  seconds: number,
  t: TranslateFn,
  options?: { readonly floor?: boolean },
): string => {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  if (options?.floor) {
    const flooredMinutes = Math.floor(safeSeconds / 60);
    return formatDuration(flooredMinutes * 60);
  }
  const roundedSeconds = Math.round(safeSeconds);
  const formatted = formatDuration(roundedSeconds);
  return roundedSeconds % 60 === 0
    ? formatted
    : t('recipes.card.durationApprox', { duration: formatted });
};

const formatRemainingText = (bake: BakeState, now: Instant, t: TranslateFn): string => {
  const remaining = preparationRemaining(bake, now);
  return remaining.kind === 'known'
    ? t('recipes.card.remaining', { duration: formatMinuteDuration(remaining.seconds, t) })
    : t('recipes.card.remainingUnknown');
};

const ScaleIcon = () => (
  <svg
    className="size-4 shrink-0 text-muted"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 4h10l1.5 3.5H5.5L7 4Z" />
    <path d="M12 7.5V10" />
    <rect x="4" y="10" width="16" height="10" rx="2.5" />
    <circle cx="12" cy="15" r="2.5" />
    <path d="M12 15l1.4-1.4" />
  </svg>
);

const WaterDropIcon = () => (
  <svg
    className="size-4 shrink-0 text-muted"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2.7c2.1 2.9 6.3 8.2 6.3 12.1a6.3 6.3 0 1 1-12.6 0c0-3.9 4.2-9.2 6.3-12.1Z" />
    <path d="M15.8 14.5a3.7 3.7 0 0 1-1.8 3.1" />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="size-4 shrink-0 text-muted"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const MetricPill = ({
  icon,
  label,
  value,
  wrapValue = false,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
  readonly wrapValue?: boolean;
}) => (
  <span
    className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-pill border border-line bg-surface-container px-2.5 py-1 text-metadata text-ink ${
      wrapValue ? 'whitespace-normal' : 'shrink-0 whitespace-nowrap'
    }`}
  >
    {icon}
    <span className="sr-only">{label}: </span>
    <span className="min-w-0 break-words font-semibold tabular-nums">{value}</span>
  </span>
);

const formatHistoryText = (
  history: CardHistory,
  now: Instant,
  locale: string,
  t: TranslateFn,
): string | undefined => {
  if (history.kind === 'neverPrepared') return undefined;
  if (history.kind === 'abandoned') {
    return history.endedAt !== undefined
      ? t('recipes.card.lastAbandoned', { when: formatRelative(history.endedAt, now, locale) })
      : t('history.status.abandoned');
  }
  const when =
    history.endedAt !== undefined ? formatRelative(history.endedAt, now, locale) : undefined;
  switch (history.result) {
    case 'cooked':
      return when !== undefined ? t('recipes.card.lastBaked', { when }) : t('outcome.cooked');
    case 'dough':
      return when !== undefined ? t('recipes.card.lastDough', { when }) : t('outcome.dough');
    case 'cookedAndDough':
      return when !== undefined
        ? t('recipes.card.lastMixed', { when })
        : t('outcome.cookedAndDough');
    case 'unknown':
      return when !== undefined
        ? t('recipes.card.outcomeUnknownWhen', { when })
        : t('recipes.card.outcomeUnknown');
  }
};

/**
 * Concise shared-token phone card for a saved recipe (L41–L44, L120, L131, L132).
 * Active recipes feature an opaque tonal surface, title link, and independent resume links.
 */
export const LibraryCard = ({
  item,
  now,
}: {
  readonly item: LibraryCardItem;
  readonly now: Instant;
}) => {
  const { t, grams, wholePct, stepName, locale } = useMessages();
  const { recipe, revision, history, variants, hasDraft, preDoughs, activeBakes } = item;
  const isActive = activeBakes.length > 0;

  const resolved = revision ? resolveFormula(revision.formula) : undefined;
  const durationInfo = revision ? recipeDurationDetails(revision.process, now) : undefined;

  const doughDisplay = resolved?.ok ? grams(resolved.value.doughWeight) : '—';
  const hydrationDisplay = resolved?.ok
    ? t(totalWaterKey(resolved.value.totalWater), {
        pct: wholePct(resolved.value.totalWaterPct),
      })
    : '—';

  let durationDisplay: string;
  if (!durationInfo) {
    durationDisplay = t('recipe.header.durationUnknown');
  } else if (durationInfo.duration.kind === 'complete') {
    const base = formatMinuteDuration(durationInfo.duration.seconds, t);
    durationDisplay = durationInfo.endStep
      ? t('recipes.card.durationWithStep', { duration: base, step: stepName(durationInfo.endStep) })
      : base;
  } else if (durationInfo.duration.kind === 'atLeast') {
    const base = formatMinuteDuration(durationInfo.duration.seconds, t, { floor: true });
    durationDisplay = t('recipes.card.durationAtLeast', { duration: base });
  } else {
    durationDisplay = t('recipe.header.durationUnknown');
  }

  const statusBadge = isActive ? (
    <span className="inline-flex items-center rounded-pill bg-accent px-2.5 py-0.5 text-metadata font-bold text-on-accent">
      {t('recipes.activeBakeCard')}
    </span>
  ) : history.kind === 'neverPrepared' ? (
    <span className="inline-flex items-center rounded-pill bg-surface-container px-2.5 py-0.5 text-metadata font-semibold text-muted">
      {t('recipes.card.neverPrepared')}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-pill bg-surface-container-high px-2.5 py-0.5 text-metadata font-semibold text-ink">
      {history.kind === 'finished' && history.rating !== undefined
        ? t('recipes.card.readyWithRating', { rating: history.rating })
        : t('recipes.card.ready')}
    </span>
  );

  const historyText = formatHistoryText(history, now, locale, t);

  const badgeRow = (
    <div className="flex flex-wrap items-center gap-1.5">
      {statusBadge}
      {hasDraft && (
        <span className="inline-flex items-center rounded-pill border border-dashed border-field bg-field-bg px-2.5 py-0.5 text-metadata font-semibold text-accent-text">
          {t('recipes.draftEdits')}
        </span>
      )}
      {variants !== undefined && (
        <span className="inline-flex items-center rounded-pill bg-surface-container px-2.5 py-0.5 text-metadata font-medium text-muted">
          {t('family.variants', { count: variants })}
        </span>
      )}
    </div>
  );

  const titleHeading = (
    <h2 className="m3-type-title m-0 w-full min-w-0 break-words text-ink">
      {isActive ? (
        <LibraryLink
          href={`/recipes/${recipe.id}`}
          label={recipe.name}
          className="inline-block max-w-full min-w-0 rounded text-ink no-underline underline-offset-4 hover:underline focus-visible:fp-focus-ring"
        >
          {recipe.name}
        </LibraryLink>
      ) : (
        recipe.name
      )}
    </h2>
  );

  const cardBody = (
    <>
      {isActive ? (
        <>
          {titleHeading}
          {badgeRow}
        </>
      ) : (
        <>
          {badgeRow}
          {titleHeading}
        </>
      )}

      {preDoughs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {preDoughs.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="inline-flex max-w-full items-center rounded-pill bg-surface-container px-2.5 py-0.5 text-metadata font-medium text-muted break-words"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {isActive && (
        <div className="flex flex-col gap-2">
          {activeBakes.map((bake, index) => (
            <div
              key={bake.bakeId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-segmented-option border border-line bg-surface px-3 py-2"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                {activeBakes.length > 1 && (
                  <span className="text-metadata font-semibold text-muted">
                    {t('recipes.card.sessionNumber', { index: index + 1 })}
                  </span>
                )}
                <span className="text-supporting font-semibold text-ink tabular-nums break-words">
                  {formatRemainingText(bake, now, t)}
                </span>
              </div>
              <LibraryLink
                href={`/bakes/${bake.bakeId}`}
                label={t('recipes.card.resumeNamed', { recipe: recipe.name })}
                className="inline-flex min-h-touch items-center justify-center rounded-pill bg-accent px-4 py-2 text-supporting font-semibold text-on-accent no-underline focus-visible:fp-focus-ring"
              >
                {t('recipe.resumeAction')}
              </LibraryLink>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <MetricPill icon={<ScaleIcon />} label={t('recipes.card.dough')} value={doughDisplay} />
        <MetricPill
          icon={<WaterDropIcon />}
          label={t('recipes.card.hydration')}
          value={hydrationDisplay}
          wrapValue={hydrationDisplay.length > 10}
        />
        <MetricPill
          icon={<ClockIcon />}
          label={t('recipes.card.duration')}
          value={durationDisplay}
          wrapValue
        />
      </div>

      {historyText !== undefined && (
        <div className="text-supporting text-muted break-words">{historyText}</div>
      )}
    </>
  );

  if (isActive) {
    return (
      <article className="m3-card fp-recipe-summary-relief bg-surface-container border-accent">
        {cardBody}
      </article>
    );
  }

  return (
    <LibraryLink
      href={`/recipes/${recipe.id}`}
      label={recipe.name}
      className="block rounded-card text-ink no-underline focus-visible:fp-focus-ring"
    >
      <article className="m3-card m3-card-interactive fp-recipe-summary-relief">{cardBody}</article>
    </LibraryLink>
  );
};

/**
 * Whole-card featured resume entry for active preparations whose recipe is a hidden variant,
 * in the trash, or permanently deleted.
 */
export const FallbackRunningCard = ({
  bake,
  recipe,
  now,
}: {
  readonly bake: BakeState;
  readonly recipe: Recipe | undefined;
  readonly now: Instant;
}) => {
  const { t } = useMessages();
  const title = recipe?.name ?? t('recipe.deleted');

  return (
    <LibraryLink
      href={`/bakes/${bake.bakeId}`}
      label={t('recipes.card.resumeNamed', { recipe: title })}
      className="block rounded-card text-ink no-underline focus-visible:fp-focus-ring"
    >
      <article className="m3-card m3-card-interactive fp-recipe-summary-relief bg-surface-container border-accent">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-pill bg-accent px-2.5 py-0.5 text-metadata font-bold text-on-accent">
            {t('recipes.activeBakeCard')}
          </span>
          {recipe?.trashedAt !== undefined && (
            <span className="inline-flex items-center rounded-pill bg-surface px-2.5 py-0.5 text-metadata font-medium text-muted">
              {t('trash.title')}
            </span>
          )}
        </div>
        <h2 className="m3-type-title m-0 min-w-0 break-words text-ink">{title}</h2>
        <div className="text-supporting font-semibold text-ink tabular-nums break-words">
          {formatRemainingText(bake, now, t)}
        </div>
        <div>
          <span className="inline-flex items-center text-supporting font-semibold text-accent-text">
            {t('recipes.resumeBake')}
          </span>
        </div>
      </article>
    </LibraryLink>
  );
};
