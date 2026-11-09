import { useState } from 'react';
import type { Anchor, ResolvedFormula, WaterBalance } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { InfoSheet } from '../ui/InfoSheet';
import { Ui } from '../ui/library';
import { totalWaterKey } from './water-label';

// L160: preserve the four approved v5 outlines and their shared stroke.
const glyphs = {
  dough: [
    'M3 15.6c-.4-1.6.7-3 2.2-3.9a7.2 7.2 0 0 1 13.4-.2c1.5.7 2.7 2.2 2.4 3.9-.4 2.4-4.6 3.5-9 3.5S3.5 18 3 15.6Z',
    'M7.7 12.6q1-.8 2.1-.2m1.2-3.1q1.1-.7 2.2 0m1.6 3.1q1.1-.8 2.3-.6',
  ],
  hydration: [
    'M12 2.7c2.1 2.9 6.3 8.2 6.3 12.1a6.3 6.3 0 1 1-12.6 0c0-3.9 4.2-9.2 6.3-12.1Z',
    'M15.8 14.5a3.7 3.7 0 0 1-1.8 3.1',
  ],
  fat: [
    'M5 9.3 13.5 5.7l6.1 1.8v5.5l-8.1 4.4L5 15.5Zm0 0 6.5 2.4 8.1-4.2m-8.1 4.2v5.7',
    'M5 13.4 1.3 15.5l3.6 2.6 6.8 2.1 3.3-2.2 4.5-.9 3.1-4.6-3-1.1',
  ],
  sugar: [
    'M10.8 8.3 16.4 5.2l5.2 2v6.1l-5.2 3.2-2.3-.9m-3.3-4.6V8.3l5.6 2.3 5.2-3.4m-5.2 3.4v5.9',
    'M2.3 12.8 8 9.8l6.1 2.6v6L8 21.6l-5.7-2.5Zm0 0L8 15.4l6.1-3M8 15.4v6.2',
    'M4.9 16.3h.01m5.3 1h.01',
  ],
} as const;

type Metric = keyof typeof glyphs;

interface RecipeSummaryProps {
  anchor: Anchor;
  displayDoughWeight: number | undefined;
  resolved: ResolvedFormula | undefined;
  onExplainHydration: () => void;
}

export const RecipeSummary = ({
  anchor,
  displayDoughWeight,
  resolved,
  onExplainHydration,
}: RecipeSummaryProps) => {
  const { t, grams, wholePct, pct, name } = useMessages();
  const [detail, setDetail] = useState<Metric>();
  const unavailable = t('recipe.document.summaryUnavailable');
  const empty = t('recipe.document.unresolvedGrams');
  const mass = (value: number) => grams(value).replace(/ g$/, '\u00a0g');

  const describeBalance = (
    balance: WaterBalance | undefined,
    percentage: number | undefined,
    metric: Exclude<Metric, 'dough'>,
  ) => {
    if (balance === undefined || percentage === undefined) {
      return { value: empty, supporting: unavailable, unknown: [] };
    }

    const water = metric === 'hydration';
    const amount = water
      ? t('recipe.document.summaryWater', { grams: mass(balance.value) })
      : mass(balance.value);
    const formatted = water ? wholePct(percentage) : pct(percentage);
    const status = totalWaterKey(balance);
    const partialEstimate = status === 'formula.stat.totalWaterSpecifiedEstimate';
    const supportingKey =
      status === 'formula.stat.totalWaterLowerBound'
        ? 'recipe.document.summaryKnown'
        : partialEstimate
          ? 'recipe.document.summaryEstimatedPortion'
          : status === 'formula.stat.totalWaterEstimate'
            ? 'recipe.document.summaryEstimated'
            : undefined;
    return {
      value: partialEstimate ? formatted : t(status, { pct: formatted }),
      supporting: supportingKey ? t(supportingKey, { amount }) : amount,
      unknown: balance.unknownContributors,
    };
  };

  const metrics = {
    dough: {
      value: displayDoughWeight === undefined ? empty : mass(displayDoughWeight),
      supporting:
        anchor.kind === 'pieces'
          ? t('recipe.document.summaryPieces', {
              count: anchor.count,
              grams: mass(anchor.gramsEach),
            })
          : displayDoughWeight === undefined
            ? unavailable
            : t('recipe.document.summaryPieces', { count: 1, grams: mass(displayDoughWeight) }),
      unknown: [],
    },
    hydration: describeBalance(resolved?.totalWater, resolved?.totalWaterPct, 'hydration'),
    fat: describeBalance(resolved?.totalFat, resolved?.totalFatPct, 'fat'),
    sugar: describeBalance(resolved?.totalSugar, resolved?.totalSugarPct, 'sugar'),
  };
  const unknownIngredients = [...new Set(Object.values(metrics).flatMap(({ unknown }) => unknown))];

  return (
    <>
      <div
        data-testid="recipe-summary"
        role="group"
        aria-label={t('recipe.document.summary')}
        className="grid grid-cols-2 gap-2"
      >
        {(Object.keys(glyphs) as Metric[]).map((metric) => {
          const label = t(`formula.stat.${metric}`);
          const { value, supporting } = metrics[metric];
          return (
            <div
              key={metric}
              className="fp-recipe-summary-relief row-span-3 grid min-w-0 grid-rows-subgrid grid-cols-[minmax(0,1fr)_auto] gap-x-1 gap-y-1 rounded-card border border-line bg-surface-container p-2"
            >
              <div className="col-span-2 flex min-w-0 items-start gap-2 text-supporting font-semibold text-muted">
                <svg
                  className="size-[22px] shrink-0 text-ink"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {glyphs[metric].map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>
                <span className="wrap-anywhere">{label}</span>
              </div>
              <span className="col-span-2 self-center wrap-anywhere text-page font-extrabold tabular-nums text-ink min-[390px]:col-span-1">
                {value}
              </span>
              <span className="col-start-1 row-start-3 self-center wrap-anywhere text-metadata text-muted min-[390px]:col-span-2">
                {supporting}
              </span>
              <div className="col-start-2 row-start-3 self-center min-[390px]:row-start-2">
                <button
                  type="button"
                  aria-label={
                    metric === 'hydration'
                      ? t('formula.hydration.breakdown')
                      : t('help.button', { term: label })
                  }
                  aria-haspopup="dialog"
                  className="fp-control-reset fp-focus inline-grid size-[48px] place-items-center rounded-pill text-muted hover:text-ink"
                  onClick={
                    metric === 'hydration' && resolved
                      ? onExplainHydration
                      : () => setDetail(metric)
                  }
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {unknownIngredients.length > 0 && (
        <p className="m-0 text-metadata text-muted">
          {t('recipe.document.summaryUnknown', {
            ingredients: unknownIngredients.map(name).join(', '),
          })}
        </p>
      )}
      {detail === 'dough' && <InfoSheet topic="anchor" open onClose={() => setDetail(undefined)} />}
      {detail && detail !== 'dough' && (
        <Ui
          component="fp.bottom-sheet"
          isOpen
          title={t(
            detail === 'hydration' ? 'formula.hydration.breakdown' : `formula.stat.${detail}`,
          )}
          closeLabel={t('explain.close')}
          onDismiss={() => setDetail(undefined)}
        >
          <p className="mt-0 mb-2 text-body font-semibold">
            {metrics[detail].value} · {metrics[detail].supporting}
          </p>
          {metrics[detail].unknown.length > 0 && (
            <p className="m-0 text-supporting text-muted">
              {t('formula.enrichment.incomplete', {
                ingredients: metrics[detail].unknown.map(name).join(', '),
              })}
            </p>
          )}
        </Ui>
      )}
    </>
  );
};
