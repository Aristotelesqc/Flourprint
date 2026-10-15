import { useMemo, useState } from 'react';
import type { Formula, Process, ResolvedFormula } from '@flourprint/core/domain';
import { estimateFermentation, MODEL_END_POINT, EXPERIMENTAL_READY } from '@flourprint/core/domain';
import { formatDuration } from '../i18n/time';
import { useTemperature } from '../i18n/temperature';
import { useEstimateText } from './fermentation/text';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';
import { Card, Rows, SectionTitle } from '../ui/Layout';
import { totalWaterKey } from './water-label';
import { WaterExplanation } from './WaterExplanation';
import { WeighingChecklist } from './WeighingChecklist';
import { Enrichment, FlourSummary, GroupHeader, ROW } from './FormulaSection';

interface Props {
  readonly formula: Formula;
  readonly resolved?: ResolvedFormula;
  readonly process: Process;
  readonly weighed: ReadonlyMap<string, number>;
  readonly onToggleWeighed: (key: string, grams: number) => void;
}

/**
 * Consultation view of the formula: clean, non-editable composition, resolved quantities,
 * flour blend detail, components, and shared weighing checklist (#67).
 */
export const FormulaConsultation = ({
  formula,
  resolved,
  process,
  weighed,
  onToggleWeighed,
}: Props) => {
  const { t, grams, pct, wholePct, name, componentName, stepName } = useMessages();
  const temperature = useTemperature();
  const { reason, extrapolations, ends } = useEstimateText();
  const [explaining, setExplaining] = useState(false);
  const anchor = formula.anchor;
  const lockedWater = formula.waterTarget?.absorbInto;
  const mix = process.steps.find((s) => s.operation === 'mix');
  const estimates = useMemo(() => estimateFermentation(formula, process), [formula, process]);
  const selectedProfile = process.readiness ?? MODEL_END_POINT;
  const profileLabel =
    selectedProfile.id === MODEL_END_POINT.id && selectedProfile.version === MODEL_END_POINT.version
      ? t('fermentation.readiness.model')
      : selectedProfile.id === EXPERIMENTAL_READY.id &&
          selectedProfile.version === EXPERIMENTAL_READY.version
        ? t('fermentation.readiness.experimental')
        : '—';

  return (
    <div className="flex flex-col gap-5">
      <Card className="m3-card-quiet">
        <div className="flex items-baseline justify-between gap-3 tabular">
          <span className="flex items-center gap-1.5 font-medium text-muted">
            {t('formula.anchorField.flourTotal')}
            <InfoButton topic="anchor" term={t('formula.quantity')} />
          </span>
          <span className="text-lg font-bold">{resolved ? grams(resolved.flourTotal) : '—'}</span>
        </div>
        {resolved && (
          <div className="flex items-baseline justify-between gap-3 tabular">
            <span className="font-medium text-muted">{t('formula.stat.dough')}</span>
            <span className="text-lg font-bold">{grams(resolved.doughWeight)}</span>
          </div>
        )}
        {anchor.kind === 'pieces' && (
          <div className="flex items-baseline justify-between gap-3 text-sm text-muted">
            <span>{t('formula.anchor.pieces')}</span>
            <span>
              {anchor.count} × {grams(anchor.gramsEach)}
            </span>
          </div>
        )}
        {resolved && (
          <div className="flex flex-col gap-1 border-t border-line-subtle pt-2">
            <div className="flex items-baseline justify-between gap-3 tabular">
              <span className="flex items-center gap-1.5 font-medium text-muted">
                {t('formula.stat.hydration')}
                <InfoButton topic="hydration" term={t('formula.stat.hydration')} />
              </span>
              <span className="text-xl font-bold">
                {totalWaterKey(resolved.totalWater) === 'formula.stat.totalWaterEstimate' ||
                resolved.totalWater.completeness === 'incomplete'
                  ? `≈ ${wholePct(resolved.totalWaterPct)}`
                  : wholePct(resolved.totalWaterPct)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                aria-haspopup="dialog"
                className="fp-reset self-start text-sm text-accent underline decoration-dotted underline-offset-4"
                onClick={() => setExplaining(true)}
              >
                {t('formula.hydration.breakdown')}
              </button>
            </div>
            {resolved.totalWater.completeness === 'incomplete' && (
              <p className="m-0 text-xs text-muted">
                {t('formula.water.incomplete', {
                  ingredients: resolved.totalWater.unknownContributors.map(name).join(', '),
                })}
              </p>
            )}
          </div>
        )}
        {resolved && <Enrichment resolved={resolved} />}
        {!resolved && <p className="m-0 text-sm text-muted">{t('formula.unresolved')}</p>}
      </Card>

      <section>
        <GroupHeader
          title={t('formula.group.flours')}
          pctLabel={t('formula.column.basisFlour')}
          gramsLabel={t('formula.column.basisGrams')}
        />
        <Rows>
          {formula.flours.map((flour) => (
            <ConsultationRow
              key={flour.id}
              title={name(flour.id)}
              subtitle={<FlourSummary id={flour.id} />}
              pctText={pct(flour.sharePct)}
              gramsText={resolved ? grams(resolved.flourByFlour[flour.id] ?? 0) : '—'}
            />
          ))}
        </Rows>
      </section>

      <section>
        <GroupHeader
          title={t('formula.group.ingredients')}
          pctLabel={t('formula.column.basisBaker')}
          gramsLabel={t('formula.column.basisGrams')}
          help={<InfoButton topic="bakerPct" term={t('formula.column.basisBaker')} />}
        />
        <Rows>
          {formula.ingredients.map((ingredient) => (
            <ConsultationRow
              key={ingredient.id}
              title={name(ingredient.id)}
              subtitle={
                ingredient.id === lockedWater ? (
                  <span className="text-[13px] text-muted">{t('formula.lock.follows')}</span>
                ) : undefined
              }
              pctText={pct(ingredient.bakerPct)}
              gramsText={resolved ? grams(resolved.grams[ingredient.id] ?? 0) : '—'}
            />
          ))}
        </Rows>
      </section>

      {formula.components.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5">
            <SectionTitle>{t('formula.preparations')}</SectionTitle>
            <InfoButton topic="preparations" term={t('formula.preparations')} />
          </span>
          {formula.components.map((component) => {
            const c = resolved?.components[component.id];
            const breakdown = !c
              ? []
              : [
                  t('formula.component.flour', { grams: grams(c.flour) }),
                  t('formula.component.water', { grams: grams(c.water) }),
                  ...Object.entries(c.allocations).map(([id, g]) =>
                    t('formula.component.allocation', {
                      grams: grams(g),
                      name: name(id),
                    }),
                  ),
                  ...(c.waterLoss > 0
                    ? [t('formula.component.loss', { grams: grams(c.waterLoss) })]
                    : []),
                ];
            const params = [
              t('formula.prep.flourPct', { pct: pct(component.flourPct) }),
              t('formula.prep.hydration', { pct: pct(component.hydrationPct) }),
              ...(component.allocations ?? []).map((a) =>
                t('formula.prep.allocation', {
                  name: name(a.ingredient),
                  pct: pct(a.bakerPct),
                }),
              ),
            ];
            return (
              <Card key={component.id} gap="gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[19px] font-semibold">
                    {componentName(formula, component)}
                  </span>
                  <span className="text-lg font-bold">{c ? grams(c.mass) : '—'}</span>
                </div>
                <span className="text-[15px]">{params.join(' · ')}</span>
                {breakdown.length > 0 && (
                  <span className="text-sm text-muted">{breakdown.join(' · ')}</span>
                )}
              </Card>
            );
          })}
        </section>
      )}

      <Card gap="gap-2">
        <span className="flex items-center gap-1.5 text-[19px] font-semibold">
          {t('fermentation.title')}
          <InfoButton topic="fermentation" term={t('fermentation.title')} />
        </span>
        {mix && (
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted">{t('fermentation.room')}</span>
              <span>
                {mix.conditions?.temperatureC !== undefined
                  ? temperature.format(mix.conditions.temperatureC, 'ambient')
                  : '—'}
              </span>
            </div>
            {mix.conditions?.doughTemperatureC !== undefined && (
              <div className="flex justify-between gap-3">
                <span className="text-muted">{t('fermentation.target')}</span>
                <span>{temperature.format(mix.conditions.doughTemperatureC, 'ambient')}</span>
              </div>
            )}
            {mix.conditions?.frictionC !== undefined && (
              <div className="flex justify-between gap-3">
                <span className="text-muted">{t('fermentation.friction')}</span>
                <span>
                  {temperature.format(mix.conditions.frictionC, 'ambient', { difference: true })}
                </span>
              </div>
            )}
            {estimates.waterTemperatureC && (
              <div className="flex justify-between gap-3">
                <span className="text-muted">{t('fermentation.waterTerm')}</span>
                <span className="min-w-0 text-right">
                  {estimates.waterTemperatureC.status === 'ok'
                    ? temperature.format(estimates.waterTemperatureC.value, 'ambient', {
                        digits: 0,
                      })
                    : reason(estimates.waterTemperatureC)}
                </span>
              </div>
            )}
          </div>
        )}
        <details className="border-t border-line pt-2">
          <summary className="min-h-11 cursor-pointer font-semibold text-accent-text">
            {t('fermentation.details')}
          </summary>
          <div className="flex flex-col gap-3 py-2 text-sm">
            <p className="m-0 text-muted">{t('recipe.estimateCaption')}</p>
            <div className="flex flex-col gap-1 border-t border-line/60 pt-2">
              <span className="font-semibold text-muted">{t('fermentation.readiness')}</span>
              <span className="font-medium">{profileLabel}</span>
            </div>
            {[['dough', estimates.dough] as const, ...Object.entries(estimates.preferments)].map(
              ([id, mass]) => {
                const step = process.steps.find((item) => item.id === mass.stepId);
                const band = ends(mass.duration, formatDuration);
                const extra = extrapolations(mass.duration);
                return (
                  <div key={id} className="flex flex-col gap-1.5 border-t border-line/60 pt-2">
                    <span className="font-semibold text-ink">
                      {step
                        ? stepName(step)
                        : id === 'dough'
                          ? t('recipe.doughEstimate')
                          : name(id)}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">
                        {mass.duration.status === 'ok'
                          ? formatDuration(mass.duration.value)
                          : reason(mass.duration)}
                      </span>
                      {mass.duration.status === 'ok' && band && (
                        <span className="text-muted">
                          ({band.low} – {band.high})
                        </span>
                      )}
                    </div>
                    {mass.progressPct.status === 'ok' && (
                      <span className="text-muted">
                        {t('fermentation.result.covers', { pct: wholePct(mass.progressPct.value) })}
                      </span>
                    )}
                    {Object.entries(mass.yeastPct).map(([ingredient, estimate]) => {
                      if (estimate.status !== 'ok') {
                        if (
                          mass.duration.status !== 'ok' &&
                          estimate.reason === mass.duration.reason
                        ) {
                          return null;
                        }
                        return (
                          <span key={ingredient} className="text-muted">
                            {reason(estimate)}
                          </span>
                        );
                      }
                      return (
                        <span key={ingredient} className="text-muted">
                          {t('recipe.estimatedYeast', {
                            name: name(ingredient),
                            pct: pct(estimate.value),
                          })}
                        </span>
                      );
                    })}
                    {extra && (
                      <span className="flex items-center gap-1.5 text-alert font-medium">
                        <span aria-hidden="true">⚠</span>
                        <span>{extra}</span>
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </details>
      </Card>

      {resolved && (
        <WeighingChecklist
          formula={formula}
          resolved={resolved}
          weighed={weighed}
          onToggle={onToggleWeighed}
        />
      )}

      {resolved && (
        <WaterExplanation
          resolved={resolved}
          open={explaining}
          onClose={() => setExplaining(false)}
        />
      )}
    </div>
  );
};

export const ConsultationRow = ({
  title,
  subtitle,
  pctText,
  gramsText,
}: {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly pctText: string;
  readonly gramsText: string;
}) => (
  <div className={`${ROW} min-h-[52px] px-3 py-2.5`}>
    <span className="flex min-w-0 flex-col items-start">
      <span className="font-semibold">{title}</span>
      {subtitle}
    </span>
    <span className="pr-2.5 text-right font-medium">{pctText}</span>
    <span className="pr-2.5 text-right font-bold">{gramsText}</span>
  </div>
);
