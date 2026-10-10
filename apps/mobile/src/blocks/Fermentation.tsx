import { IonButton } from '@ionic/react';
import { useId, useMemo, useState } from 'react';
import {
  estimateFermentation,
  EXPERIMENTAL_READY,
  MODEL_END_POINT,
  type AcceptedSuggestion,
  type Estimate,
  type Formula,
  type FormulaEdit,
  type MassEstimates,
  type OkEstimate,
  type Process,
  type ProcessStep,
  type RangeBound,
  type StepConditions,
  type YeastForm,
} from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { formatDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { recipeDuration } from '../services/recipe-duration';
import { OptionalNumberField } from '../ui/Field';
import { Card } from '../ui/Layout';
import { Segmented } from '../ui/Segmented';

/**
 * Fermentation times from the provisional model (docs/contracts/fermentation.md, ADR 0010).
 * Basic mode takes the dough at room temperature; advanced mode aims at a dough temperature and
 * gives the water temperature. Suggestions change the recipe only when the user applies them.
 */

const FERMENTATION_OPERATIONS = new Set(['preferment', 'bulk', 'retard', 'proof']);
const YEAST_FORMS: readonly YeastForm[] = ['active-dry', 'instant', 'fresh'];
/** Applied durations are rounded to five minutes: nobody times a dough to the second. */
const ROUND_S = 300;
const applied = (seconds: number) => Math.max(ROUND_S, Math.round(seconds / ROUND_S) * ROUND_S);

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

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

interface Props {
  readonly formula: Formula;
  readonly process: Process;
  readonly now: string;
  readonly onEdit: (edit: FormulaEdit) => boolean;
  readonly onProcess: (process: Process) => boolean;
}

export const FermentationCard = ({ formula, process, now, onEdit, onProcess }: Props) => {
  const { t, name, stepName, componentName } = useMessages();
  const estimates = useMemo(() => estimateFermentation(formula, process), [formula, process]);
  const mix = process.steps.find((s) => s.operation === 'mix');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advanced = advancedOpen || mix?.conditions?.doughTemperatureC !== undefined;

  const length = recipeDuration(process, now as Parameters<typeof recipeDuration>[1]);
  const total =
    length.kind === 'complete'
      ? formatDuration(length.seconds)
      : length.kind === 'atLeast'
        ? t('recipes.card.durationAtLeast', { duration: formatDuration(length.seconds) })
        : t('formula.time.unknown');

  const setConditions = (
    stepId: string,
    changes: { [K in keyof StepConditions]?: StepConditions[K] | undefined },
  ) =>
    onProcess({
      ...process,
      steps: process.steps.map((s) => {
        if (s.id !== stepId) return s;
        const conditions = Object.fromEntries(
          Object.entries({ ...s.conditions, ...changes }).filter(([, v]) => v !== undefined),
        );
        const { conditions: _, ...rest } = s;
        return Object.keys(conditions).length === 0
          ? rest
          : { ...rest, conditions: conditions as StepConditions };
      }),
    });

  /** Applies a suggested time and records where it came from (fermentation.md). */
  const setDuration = (stepId: string, estimate: OkEstimate) => {
    const appliedValue = applied(estimate.value);
    return onProcess({
      ...process,
      steps: process.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              plannedDurationS: appliedValue,
              accepted: { estimate, appliedValue, model: estimate.model },
            }
          : s,
      ),
    });
  };

  const steps = process.steps.filter((s) => FERMENTATION_OPERATIONS.has(s.operation));

  return (
    <Card gap="gap-3">
      <span className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold">{t('fermentation.title')}</span>
          <span className="rounded-full border border-line px-2 text-xs whitespace-nowrap text-muted">
            {t('fermentation.provisional')}
          </span>
        </span>
        <span className="text-lg font-bold whitespace-nowrap">{total}</span>
      </span>

      {mix && (
        <>
          <Segmented
            size="small"
            value={advanced ? 'advanced' : 'basic'}
            options={[
              { value: 'basic', label: t('fermentation.mode.basic') },
              { value: 'advanced', label: t('fermentation.mode.advanced') },
            ]}
            onChange={(mode) => {
              setAdvancedOpen(mode === 'advanced');
              if (mode === 'basic') {
                setConditions(mix.id, { doughTemperatureC: undefined, frictionC: undefined });
              }
            }}
          />
          <Row label={t('fermentation.room')}>
            <OptionalNumberField
              label={t('fermentation.room')}
              unit="°C"
              width="6.5rem"
              value={mix.conditions?.temperatureC}
              onCommit={(value) => setConditions(mix.id, { temperatureC: value })}
            />
          </Row>
          {advanced ? (
            <>
              <Row label={t('fermentation.target')}>
                <OptionalNumberField
                  label={t('fermentation.target')}
                  unit="°C"
                  width="6.5rem"
                  value={mix.conditions?.doughTemperatureC}
                  onCommit={(value) => setConditions(mix.id, { doughTemperatureC: value })}
                />
              </Row>
              <Row label={t('fermentation.friction')}>
                <OptionalNumberField
                  label={t('fermentation.friction')}
                  unit="°C"
                  width="6.5rem"
                  value={mix.conditions?.frictionC}
                  onCommit={(value) => setConditions(mix.id, { frictionC: value })}
                />
              </Row>
              {estimates.waterTemperatureC && (
                <WaterTemperature estimate={estimates.waterTemperatureC} />
              )}
            </>
          ) : (
            <span className="text-sm text-muted">{t('fermentation.basicHint')}</span>
          )}
        </>
      )}

      <ReadinessChoice process={process} onProcess={onProcess} />

      <ul className="m-0 flex list-none flex-col gap-1 border-t border-line p-0 pt-2 text-[15px]">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center justify-between gap-3">
            <span className="flex flex-col">
              <span>{stepName(step)}</span>
              <span
                className={step.plannedDurationS === undefined ? 'text-muted' : 'font-semibold'}
              >
                {step.plannedDurationS === undefined
                  ? t('formula.time.stepUnknown')
                  : formatDuration(step.plannedDurationS)}
              </span>
            </span>
            <OptionalNumberField
              label={t('fermentation.stepTemperature', { step: stepName(step) })}
              unit="°C"
              width="6.5rem"
              value={step.conditions?.temperatureC}
              onCommit={(value) => setConditions(step.id, { temperatureC: value })}
            />
          </li>
        ))}
      </ul>

      {Object.entries(estimates.preferments).map(([id, mass]) => (
        <Mass
          key={id}
          title={(() => {
            const component = formula.components.find((c) => c.id === id);
            return component ? componentName(formula, component) : name(id);
          })()}
          mass={mass}
          step={process.steps.find((s) => s.id === mass.stepId)}
          onDuration={setDuration}
          onYeast={(ingredient, accepted) => {
            const component = formula.components.find((c) => c.id === id);
            if (!component) return false;
            return onEdit({
              type: 'UpdateComponent',
              component: id,
              changes: {
                allocations: (component.allocations ?? []).map((a) =>
                  a.ingredient === ingredient
                    ? { ...a, bakerPct: accepted.appliedValue, accepted }
                    : a,
                ),
              },
            });
          }}
        />
      ))}
      <Mass
        title={t('fermentation.dough')}
        mass={estimates.dough}
        dough
        step={process.steps.find((s) => s.id === estimates.dough.stepId)}
        onDuration={setDuration}
        onYeast={(ingredient, accepted) =>
          onEdit({ type: 'SetBakerPct', ingredient, pct: accepted.appliedValue, accepted })
        }
      />
      {estimates.dough.duration.status === 'unsupported' &&
        estimates.dough.duration.reason === 'no_commercial_yeast' && (
          <MarkYeast formula={formula} onEdit={onEdit} />
        )}
      <span className="text-sm text-muted">{t('fermentation.footnote')}</span>
    </Card>
  );
};

/** The dough's readiness profile: an explicit choice of the recipe, never a silent default. */
const ReadinessChoice = ({
  process,
  onProcess,
}: {
  process: Process;
  onProcess: (process: Process) => boolean;
}) => {
  const { t } = useMessages();
  const selected =
    PROFILES.find(
      ({ profile }) =>
        profile.id === process.readiness?.id && profile.version === process.readiness.version,
    ) ?? (process.readiness ? undefined : PROFILES[0]);
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-2">
      <span className="text-sm font-semibold">{t('fermentation.readiness')}</span>
      <Segmented
        size="small"
        value={selected?.profile.id ?? ''}
        options={PROFILES.map(({ profile, label }) => ({ value: profile.id, label: t(label) }))}
        onChange={(id) => {
          const choice = PROFILES.find(({ profile }) => profile.id === id);
          if (!choice) return;
          const { readiness: _previous, ...rest } = process;
          onProcess(
            choice === PROFILES[0]
              ? rest
              : { ...rest, readiness: { id: choice.profile.id, version: choice.profile.version } },
          );
        }}
      />
      <span className="text-sm text-muted">
        {selected ? t(selected.hint) : t('fermentation.reason.readiness_profile_unknown')}
      </span>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span>{label}</span>
    {children}
  </div>
);

const useEstimateText = () => {
  const { t, pct } = useMessages();
  const bound = (value: RangeBound, format: (v: number) => string) =>
    value.kind === 'finite'
      ? format(value.value)
      : t('fermentation.unbounded', { days: Math.round(value.horizonS / 86_400) });
  const range = (e: Estimate, format: (v: number) => string) => {
    if (e.status !== 'ok') return '';
    if (!e.range) {
      return e.assumptions.includes('band_unbounded') ? t('fermentation.bandUnbounded') : '';
    }
    return t('fermentation.range', {
      low: bound(e.range[0], format),
      high: bound(e.range[1], format),
    });
  };
  const reason = (e: Estimate) => {
    if (e.status === 'ok') return '';
    const key = `fermentation.reason.${e.reason}`;
    return isKey(key) ? t(key) : t('fermentation.reason.other', { reason: e.reason });
  };
  const extrapolations = (e: Estimate) => {
    if (e.status !== 'ok' || !e.extrapolations || e.extrapolations.length === 0) return '';
    const reasons = e.extrapolations.map((code) => {
      const key = `fermentation.extra.${code}`;
      return isKey(key) ? t(key) : code;
    });
    return t('fermentation.extrapolated', { reasons: reasons.join(', ') });
  };
  return { range, reason, extrapolations, pct };
};

const Mass = ({
  title,
  mass,
  dough = false,
  step,
  onDuration,
  onYeast,
}: {
  title: string;
  mass: MassEstimates;
  /** The dough ends at the provisional "ready to bake" target, a preferment when ripe. */
  dough?: boolean;
  step: ProcessStep | undefined;
  onDuration: (stepId: string, estimate: OkEstimate) => boolean;
  onYeast: (ingredient: string, accepted: AcceptedSuggestion) => boolean;
}) => {
  const { t, name, stepName } = useMessages();
  const { range, reason, extrapolations, pct } = useEstimateText();
  const { duration, progressPct, yeastPct } = mass;
  const before =
    duration.status === 'ok' && duration.assumptions.includes('end_point_before_last_step');
  const yeasts = Object.entries(yeastPct);
  return (
    <section className="flex flex-col gap-1.5 border-t border-line pt-2">
      <span className="font-semibold">{title}</span>
      {duration.status !== 'ok' ? (
        <span className="text-sm">{reason(duration)}</span>
      ) : (
        step &&
        (before ? (
          <span className="text-[15px]">
            {t('fermentation.reachedBefore', { step: stepName(step) })}
          </span>
        ) : (
          <span className="flex items-center justify-between gap-2">
            <span className="text-[15px]">
              {t('fermentation.needs', {
                step: stepName(step),
                duration: formatDuration(duration.value),
              })}{' '}
              <span className="text-muted">{range(duration, formatDuration)}</span>
            </span>
            {/* Offered unless the rounded value is already applied with its provenance. */}
            {!(
              step.plannedDurationS === applied(duration.value) &&
              step.accepted?.appliedValue === step.plannedDurationS
            ) && (
              <IonButton size="small" fill="outline" onClick={() => onDuration(step.id, duration)}>
                {t('fermentation.applyDuration')}
              </IonButton>
            )}
          </span>
        ))
      )}
      {progressPct.status === 'ok' && (
        <span className="text-[15px]">
          {t(dough ? 'fermentation.progressReady' : 'fermentation.progress', {
            pct: pct(progressPct.value),
          })}{' '}
          <span className="text-muted">{range(progressPct, pct)}</span>
        </span>
      )}
      {dough && progressPct.status === 'ok' && (
        <span className="text-sm text-muted">{t('fermentation.readyTarget')}</span>
      )}
      {yeasts.some(
        ([, e]) => e.status === 'ok' && e.assumptions.includes('band_outside_domain'),
      ) && <span className="text-sm text-muted">{t('fermentation.bandOutsideDomain')}</span>}
      {yeasts.map(([ingredient, estimate]) =>
        estimate.status === 'ok' ? (
          <span key={ingredient} className="flex items-center justify-between gap-2">
            <span className="text-[15px]">
              {t('fermentation.yeast', { name: name(ingredient), pct: pct(estimate.value) })}{' '}
              <span className="text-muted">{range(estimate, pct)}</span>
            </span>
            <IonButton
              size="small"
              fill="outline"
              onClick={() => {
                const appliedValue = Math.round(estimate.value * 1000) / 1000;
                onYeast(ingredient, { estimate, appliedValue, model: estimate.model });
              }}
            >
              {t('fermentation.applyYeast')}
            </IonButton>
          </span>
        ) : duration.status !== 'ok' && duration.reason === estimate.reason ? null : (
          <span key={ingredient} className="text-sm text-muted">
            {reason(estimate)}
          </span>
        ),
      )}
      {extrapolations(duration) && (
        <span className="text-sm text-alert">{extrapolations(duration)}</span>
      )}
    </section>
  );
};

const WaterTemperature = ({ estimate }: { estimate: Estimate }) => {
  const { t } = useMessages();
  const { reason } = useEstimateText();
  if (estimate.status !== 'ok') return <span className="text-sm">{reason(estimate)}</span>;
  const notes = estimate.assumptions.flatMap((code) => {
    const key = `fermentation.note.${code}`;
    return isKey(key) ? [t(key)] : [];
  });
  return (
    <span className="flex flex-col">
      <span className="text-lg font-bold">
        {t('fermentation.water', { temperature: `${Math.round(estimate.value)} °C` })}
      </span>
      {notes.length > 0 && <span className="text-sm text-muted">{notes.join(' · ')}</span>}
    </span>
  );
};

/** Marks an existing ingredient as commercial yeast, for recipes made before the marker. */
const MarkYeast = ({
  formula,
  onEdit,
}: {
  formula: Formula;
  onEdit: (edit: FormulaEdit) => boolean;
}) => {
  const { t, name } = useMessages();
  const id = useId();
  const candidates = formula.ingredients.filter((i) => i.kind === 'other' && i.role === 'dough');
  const [ingredient, setIngredient] = useState(candidates[0]?.id ?? '');
  const [form, setForm] = useState<YeastForm>('active-dry');
  if (candidates.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-ingredient`} className="text-sm font-semibold">
        {t('fermentation.markYeast')}
      </label>
      <select
        id={`${id}-ingredient`}
        className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2"
        value={ingredient}
        onChange={(event) => setIngredient(event.target.value)}
      >
        {candidates.map((i) => (
          <option key={i.id} value={i.id}>
            {name(i.id)}
          </option>
        ))}
      </select>
      <select
        aria-label={t('fermentation.yeastForm')}
        className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2"
        value={form}
        onChange={(event) => setForm(event.target.value as YeastForm)}
      >
        {YEAST_FORMS.map((f) => (
          <option key={f} value={f}>
            {t(`fermentation.form.${f}`)}
          </option>
        ))}
      </select>
      <span>
        <IonButton
          onClick={() =>
            onEdit({ type: 'UpdateIngredient', ingredient, changes: { yeast: { form } } })
          }
        >
          {t('fermentation.markYeastConfirm')}
        </IonButton>
      </span>
    </div>
  );
};
