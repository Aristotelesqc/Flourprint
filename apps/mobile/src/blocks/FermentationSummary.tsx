import { useMemo } from 'react';
import type { Formula, Process } from '@flourprint/core/domain';
import { estimateFermentation, EXPERIMENTAL_READY, MODEL_END_POINT } from '@flourprint/core/domain';
import { formatDuration } from '../i18n/time';
import { useTemperature } from '../i18n/temperature';
import { useEstimateText } from './fermentation/text';
import { useMessages } from '../i18n/use-messages';
import { InfoButton } from '../ui/InfoButton';

export interface FermentationSummaryProps {
  formula: Formula;
  process: Process;
}

export const FermentationSummary = ({ formula, process }: FermentationSummaryProps) => {
  const { t, pct, wholePct, name, stepName } = useMessages();
  const temperature = useTemperature();
  const { reason, extrapolations, ends } = useEstimateText();
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
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          {t('fermentation.title')}
          <InfoButton topic="fermentation" term={t('fermentation.title')} />
        </span>
      </div>

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
                    {step ? stepName(step) : id === 'dough' ? t('recipe.doughEstimate') : name(id)}
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
                    <span className="flex items-center gap-1.5 font-medium text-alert">
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
    </div>
  );
};
