import { IonButton } from '@ionic/react';
import { useId, useState, type ReactNode } from 'react';
import { roundedDurationS } from '@flourprint/core/application';
import {
  EXPERIMENTAL_READY,
  MODEL_END_POINT,
  type AcceptedSuggestion,
  type MassEstimates,
  type OkEstimate,
  type Process,
  type ProcessStep,
} from '@flourprint/core/domain';
import { formatDuration } from '../../i18n/time';
import { useMessages } from '../../i18n/use-messages';
import { InfoButton } from '../../ui/InfoButton';
import { useEstimateText } from './text';

/** The readiness profiles a recipe can select (fermentation.md); the first is the default. */
const PROFILES = [
  {
    profile: MODEL_END_POINT,
    label: 'fermentation.readiness.model',
    hint: 'fermentation.readinessHint.model',
  },
  {
    profile: EXPERIMENTAL_READY,
    label: 'fermentation.readiness.experimental',
    hint: 'fermentation.readinessHint.experimental',
  },
] as const;

/** The profile the process selects, undefined when this version does not know it. */
const selectedProfile = (process: Process) =>
  PROFILES.find(
    ({ profile }) =>
      profile.id === process.readiness?.id && profile.version === process.readiness.version,
  ) ?? (process.readiness ? undefined : PROFILES[0]);

/** A suggested yeast dose as written: three decimals of a baker's percentage. */
const appliedYeast = (value: number) => Math.round(value * 1000) / 1000;

/** True when the step already holds this suggestion, rounded, with its provenance. */
const isApplied = (step: ProcessStep, estimate: OkEstimate) =>
  step.plannedDurationS === roundedDurationS(estimate.value) &&
  step.accepted?.appliedValue === step.plannedDurationS;

interface MassProps {
  readonly mass: MassEstimates;
  readonly step: ProcessStep | undefined;
  /** Current dose of each yeast, in the unit of the suggestion. */
  readonly currentYeast: (ingredient: string) => number | undefined;
  readonly onDuration: (stepId: string, estimate: OkEstimate) => boolean;
  readonly onYeast: (ingredient: string, accepted: AcceptedSuggestion) => boolean;
}

/**
 * The dough's result: one readable line (how far the plan takes the dough, or the model's time),
 * the yeast for these times, one warning line, the target, and the ranges behind "Details".
 */
export const DoughResult = ({
  mass,
  step,
  currentYeast,
  onDuration,
  onYeast,
  process,
  onProcess,
}: MassProps & {
  readonly process: Process;
  readonly onProcess: (process: Process) => boolean;
}) => {
  const { t, stepName, name } = useMessages();
  const { ends, reason, extrapolations, wholePct, pct } = useEstimateText();
  const { duration, progressPct } = mass;
  const before =
    duration.status === 'ok' && duration.assumptions.includes('end_point_before_last_step');
  const auto = step?.durationMode === 'model';
  const warning = extrapolations(duration);
  const timeBand = ends(duration, formatDuration);
  const progressBand = ends(progressPct, wholePct);
  const yeastBands = Object.entries(mass.yeastPct).flatMap(([id, e]) => {
    const band = ends(e, pct);
    return band ? [{ id, ...band }] : [];
  });
  const outside = Object.values(mass.yeastPct).some(
    (e) => e.status === 'ok' && e.assumptions.includes('band_outside_domain'),
  );

  let main: ReactNode;
  if (duration.status !== 'ok') {
    main = <span className="text-[15px]">{reason(duration)}</span>;
  } else if (before && step) {
    main = <Headline>{t('fermentation.reachedBefore', { step: stepName(step) })}</Headline>;
  } else if (progressPct.status === 'ok') {
    main = (
      <>
        <Headline>{t('fermentation.result.covers', { pct: wholePct(progressPct.value) })}</Headline>
        <ProgressBar value={progressPct.value} label={wholePct(progressPct.value)} />
      </>
    );
  } else if (step) {
    main = (
      <Headline>
        {t('fermentation.result.time', {
          step: stepName(step),
          duration: formatDuration(duration.value),
        })}
      </Headline>
    );
  }

  return (
    <section className="flex flex-col gap-2 border-t border-line pt-3" aria-live="polite">
      {main}
      <YeastRows
        mass={mass}
        hideReason={duration.status !== 'ok' ? duration.reason : undefined}
        currentYeast={currentYeast}
        onYeast={onYeast}
      />
      {warning && (
        <span className="flex items-center gap-1.5 text-sm text-alert">
          <span aria-hidden="true">⚠</span>
          <span>{warning}</span>
          <InfoButton topic="extrapolation" term={t('fermentation.extrapolationTerm')} />
        </span>
      )}
      <Details>
        <ReadinessRow process={process} onProcess={onProcess} />
        {duration.status === 'ok' && (
          <>
            {step && !before && (
              <span className="flex items-center justify-between gap-2">
                <span>
                  {timeBand
                    ? t('fermentation.detail.time', {
                        step: stepName(step),
                        duration: formatDuration(duration.value),
                        ...timeBand,
                      })
                    : t('fermentation.detail.timeUnbounded', {
                        step: stepName(step),
                        duration: formatDuration(duration.value),
                      })}
                </span>
                {!auto && !isApplied(step, duration) && (
                  <IonButton
                    size="small"
                    fill="outline"
                    className="shrink-0"
                    onClick={() => onDuration(step.id, duration)}
                  >
                    {t('fermentation.applyDuration')}
                  </IonButton>
                )}
              </span>
            )}
            {progressBand && <span>{t('fermentation.detail.progress', progressBand)}</span>}
            {yeastBands.map((band) => (
              <span key={band.id}>
                {t('fermentation.detail.yeast', {
                  name: yeastBands.length > 1 ? name(band.id) : t('fermentation.yeastName'),
                  low: band.low,
                  high: band.high,
                })}
              </span>
            ))}
            {outside && <span>{t('fermentation.bandOutsideDomain')}</span>}
            <span className="flex items-center gap-1.5">
              {t('fermentation.timeTerm')}
              <InfoButton topic="modelTime" term={t('fermentation.timeTerm')} />
            </span>
          </>
        )}
      </Details>
    </section>
  );
};

/** A preferment's result, in the dough's row style: time to ripeness, progress and yeast. */
export const PrefermentResult = ({ mass, step, currentYeast, onDuration, onYeast }: MassProps) => {
  const { t } = useMessages();
  const { ends, reason, wholePct, pct } = useEstimateText();
  const { duration, progressPct } = mass;
  const timeBand = ends(duration, formatDuration);
  const progressBand = ends(progressPct, wholePct);
  const yeastBand = Object.values(mass.yeastPct)
    .map((e) => ends(e, pct))
    .find((b) => b !== undefined);
  return (
    <span className="flex flex-col gap-1.5">
      {duration.status !== 'ok' ? (
        <span className="text-sm">{reason(duration)}</span>
      ) : (
        <span className="flex items-center justify-between gap-2">
          <span className="text-[15px]">
            {progressPct.status === 'ok'
              ? t('fermentation.progress', { pct: wholePct(progressPct.value) })
              : t('fermentation.prefermentRipe', { duration: formatDuration(duration.value) })}
          </span>
          {step && !isApplied(step, duration) && (
            <IonButton
              size="small"
              fill="outline"
              className="shrink-0"
              onClick={() => onDuration(step.id, duration)}
            >
              {t('fermentation.applyDuration')}
            </IonButton>
          )}
        </span>
      )}
      <YeastRows
        mass={mass}
        hideReason={duration.status !== 'ok' ? duration.reason : undefined}
        currentYeast={currentYeast}
        onYeast={onYeast}
      />
      {duration.status === 'ok' && (
        <Details>
          <span>
            {timeBand
              ? t('fermentation.prefermentDetail', {
                  duration: formatDuration(duration.value),
                  ...timeBand,
                })
              : t('fermentation.prefermentRipe', { duration: formatDuration(duration.value) })}
          </span>
          {progressBand && <span>{t('fermentation.detail.progressRipe', progressBand)}</span>}
          {yeastBand && (
            <span>
              {t('fermentation.detail.yeast', { name: t('fermentation.yeastName'), ...yeastBand })}
            </span>
          )}
        </Details>
      )}
    </span>
  );
};

const Headline = ({ children }: { children: ReactNode }) => {
  const { t } = useMessages();
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="text-[17px] font-semibold">{children}</span>
      <span className="shrink-0 rounded-full border border-line px-2 text-xs leading-5 text-muted">
        {t('fermentation.provisional')}
      </span>
    </span>
  );
};

/** How far the plan goes, capped at a full bar; past the target the bar turns solid ink. */
const ProgressBar = ({ value, label }: { value: number; label: string }) => (
  <div
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(Math.min(value, 100))}
    aria-valuetext={label}
    className="h-2 overflow-hidden rounded-full bg-track"
  >
    <div
      className={`h-full rounded-full ${value > 100 ? 'bg-ink' : 'bg-accent'}`}
      style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
    />
  </div>
);

const YeastRows = ({
  mass,
  hideReason,
  currentYeast,
  onYeast,
}: {
  mass: MassEstimates;
  /** The duration already says this reason: not repeated per yeast. */
  hideReason: string | undefined;
  currentYeast: (ingredient: string) => number | undefined;
  onYeast: (ingredient: string, accepted: AcceptedSuggestion) => boolean;
}) => {
  const { t, name } = useMessages();
  const { reason, pct } = useEstimateText();
  const entries = Object.entries(mass.yeastPct);
  return (
    <>
      {entries.map(([ingredient, estimate]) => {
        if (estimate.status !== 'ok') {
          return estimate.reason === hideReason ? null : (
            <span key={ingredient} className="text-sm text-muted">
              {reason(estimate)}
            </span>
          );
        }
        const appliedValue = appliedYeast(estimate.value);
        const current = currentYeast(ingredient) === appliedValue;
        const text =
          entries.length > 1
            ? t('fermentation.yeastForNamed', { name: name(ingredient), pct: pct(appliedValue) })
            : t('fermentation.yeastFor', { pct: pct(appliedValue) });
        return (
          <span key={ingredient} className="flex min-h-9 items-center justify-between gap-2">
            <span className="text-[15px]">
              {text}
              {current && <span className="text-muted"> {t('fermentation.yeastCurrent')}</span>}
            </span>
            {!current && (
              <IonButton
                size="small"
                fill="outline"
                className="shrink-0"
                aria-label={t('fermentation.useYeastLabel', {
                  pct: pct(appliedValue),
                  name: name(ingredient),
                })}
                onClick={() =>
                  onYeast(ingredient, { estimate, appliedValue, model: estimate.model })
                }
              >
                {t('fermentation.useYeast')}
              </IonButton>
            )}
          </span>
        );
      })}
    </>
  );
};

/** The dough's readiness profile: an explicit choice of the recipe, never a silent default. */
const ReadinessRow = ({
  process,
  onProcess,
}: {
  process: Process;
  onProcess: (process: Process) => boolean;
}) => {
  const { t } = useMessages();
  const id = useId();
  const selected = selectedProfile(process);
  return (
    <span className="flex flex-col gap-1.5 border-b border-line pb-2.5">
      <span className="flex items-center gap-1.5 font-semibold">
        <label htmlFor={id}>{t('fermentation.readiness')}</label>
        <InfoButton topic="readiness" term={t('fermentation.readiness')} />
      </span>
      <select
        id={id}
        className="fp-field h-10 w-full rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink"
        value={selected?.profile.id ?? ''}
        onChange={(event) => {
          const choice = PROFILES.find(({ profile }) => profile.id === event.target.value);
          if (!choice) return;
          const { readiness: _previous, ...rest } = process;
          onProcess(
            choice === PROFILES[0]
              ? rest
              : { ...rest, readiness: { id: choice.profile.id, version: choice.profile.version } },
          );
        }}
      >
        {!selected && <option value="">—</option>}
        {PROFILES.map(({ profile, label }) => (
          <option key={profile.id} value={profile.id}>
            {t(label)}
          </option>
        ))}
      </select>
      {selected && <span>{t(selected.hint)}</span>}
    </span>
  );
};

/** Ranges and other details, in plain sentences, behind one tap. */
const Details = ({ children }: { children: ReactNode }) => {
  const { t } = useMessages();
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="fp-reset flex min-h-9 items-center gap-1 self-start text-sm font-semibold text-accent-text"
        onClick={() => setOpen(!open)}
      >
        {t('fermentation.details')}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
          className={open ? 'rotate-180' : ''}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-1.5 rounded-xl bg-track px-3 py-2.5 text-sm">
          {children}
        </div>
      )}
    </>
  );
};
