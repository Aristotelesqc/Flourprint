import { IonButton, useIonAlert } from '@ionic/react';
import { useId, useMemo, useState } from 'react';
import {
  applySchedule,
  FERMENTATION_SCHEDULES,
  roundedDurationS,
} from '@flourprint/core/application';
import {
  doughStepAmbients,
  doughSteps,
  estimateFermentation,
  temperatureContext,
  updateStep,
  type Estimate,
  type Formula,
  type FormulaEdit,
  type OkEstimate,
  type Process,
  type YeastForm,
} from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { useMessages } from '../i18n/use-messages';
import { DurationField, TemperatureField } from '../ui/Field';
import { useTemperature } from '../i18n/temperature';
import { InfoButton } from '../ui/InfoButton';
import { Card } from '../ui/Layout';
import { Segmented } from '../ui/Segmented';
import { DoughSteps } from './fermentation/DoughSteps';
import { DoughResult, PrefermentResult } from './fermentation/Result';
import { useEstimateText, withConditions } from './fermentation/text';

/**
 * Fermentation from the provisional model (docs/contracts/fermentation.md, ADR 0010), read top to
 * bottom: conditions, schedule, the dough steps with their place, temperature and time, then one
 * result line. Basic mode takes the dough at room temperature; advanced mode aims at a dough
 * temperature and gives the water temperature. Suggestions change the recipe only when applied,
 * or on the one step set to Auto (applied by the editor after every edit).
 */

const YEAST_FORMS: readonly YeastForm[] = ['active-dry', 'instant', 'fresh'];

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

interface Props {
  readonly formula: Formula;
  readonly process: Process;
  readonly now: string;
  readonly onEdit: (edit: FormulaEdit) => boolean;
  readonly onProcess: (process: Process) => boolean;
}

export const FermentationCard = ({ formula, process, onEdit, onProcess }: Props) => {
  const { t, componentName } = useMessages();
  const estimates = useMemo(() => estimateFermentation(formula, process), [formula, process]);
  const mix = process.steps.find((s) => s.operation === 'mix');
  const dough = useMemo(() => doughSteps(process) ?? [], [process]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advanced = advancedOpen || mix?.conditions?.doughTemperatureC !== undefined;
  const preferments = formula.components.filter((c) => c.kind === 'preferment' && c.flourPct > 0);

  /** Applies a suggested time and records where it came from (fermentation.md). */
  const setDuration = (stepId: string, estimate: OkEstimate) => {
    const appliedValue = roundedDurationS(estimate.value);
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
  const doughYeast = (ingredient: string) =>
    formula.ingredients.find((i) => i.id === ingredient)?.bakerPct;

  return (
    <Card gap="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
        <span className="flex items-center gap-1.5 text-[19px] font-semibold">
          {t('fermentation.title')}
          <InfoButton topic="fermentation" term={t('fermentation.title')} />
        </span>
        {mix && (
          <div className="w-full min-[420px]:w-[11.5rem] shrink-0">
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
                  onProcess(
                    withConditions(process, mix.id, {
                      doughTemperatureC: undefined,
                      frictionC: undefined,
                    }),
                  );
                }
              }}
            />
          </div>
        )}
      </div>

      {mix && (
        <div className="flex flex-col gap-2">
          <Row label={t('fermentation.room')}>
            <TemperatureField
              label={t('fermentation.room')}
              context="ambient"
              width="6.5rem"
              value={mix.conditions?.temperatureC}
              onCommit={(value) =>
                onProcess(withConditions(process, mix.id, { temperatureC: value }))
              }
            />
          </Row>
          {advanced && (
            <>
              <Row
                label={t('fermentation.target')}
                help={<InfoButton topic="waterTemp" term={t('fermentation.target')} />}
              >
                <TemperatureField
                  label={t('fermentation.target')}
                  context="ambient"
                  width="6.5rem"
                  value={mix.conditions?.doughTemperatureC}
                  onCommit={(value) =>
                    onProcess(withConditions(process, mix.id, { doughTemperatureC: value }))
                  }
                />
              </Row>
              <Row label={t('fermentation.friction')}>
                <TemperatureField
                  label={t('fermentation.friction')}
                  context="ambient"
                  difference
                  width="6.5rem"
                  value={mix.conditions?.frictionC}
                  onCommit={(value) =>
                    onProcess(withConditions(process, mix.id, { frictionC: value }))
                  }
                />
              </Row>
              {estimates.waterTemperatureC && (
                <WaterTemperature estimate={estimates.waterTemperatureC} />
              )}
            </>
          )}
          <ScheduleRow process={process} replaced={dough.length} onProcess={onProcess} />
        </div>
      )}

      {mix && (
        <DoughSteps
          process={process}
          mix={mix}
          steps={dough}
          duration={estimates.dough.duration}
          estimatedStepId={estimates.dough.stepId}
          reservedIds={formula.components.map((c) => c.id)}
          ambients={doughStepAmbients(process)}
          onProcess={onProcess}
        />
      )}

      <DoughResult
        mass={estimates.dough}
        step={process.steps.find((s) => s.id === estimates.dough.stepId)}
        currentYeast={doughYeast}
        onDuration={setDuration}
        onYeast={(ingredient, accepted) =>
          onEdit({ type: 'SetBakerPct', ingredient, pct: accepted.appliedValue, accepted })
        }
        process={process}
        onProcess={onProcess}
      />
      {estimates.dough.duration.status === 'unsupported' &&
        estimates.dough.duration.reason === 'no_commercial_yeast' && (
          <MarkYeast formula={formula} onEdit={onEdit} />
        )}

      {preferments.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-line pt-3">
          <span className="text-sm font-semibold">{t('fermentation.preferments')}</span>
          {preferments.map((component) => {
            const mass = estimates.preferments[component.id];
            const step = process.steps.find((s) => s.id === component.id);
            const title = componentName(formula, component);
            return (
              <div key={component.id} className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
                  {step && (
                    <>
                      <TemperatureField
                        label={t('fermentation.stepTemperature', { step: title })}
                        context={temperatureContext(step)}
                        width="5.75rem"
                        value={step.conditions?.temperatureC}
                        onCommit={(value) =>
                          onProcess(withConditions(process, step.id, { temperatureC: value }))
                        }
                      />
                      <DurationField
                        label={t('fermentation.stepDuration', { step: title })}
                        value={step.plannedDurationS}
                        optional
                        width="6.5rem"
                        onCommit={(seconds) =>
                          onProcess(updateStep(process, step.id, { plannedDurationS: seconds }))
                        }
                      />
                    </>
                  )}
                </span>
                {mass && (
                  <PrefermentResult
                    mass={mass}
                    step={step}
                    currentYeast={(ingredient) =>
                      component.allocations?.find((a) => a.ingredient === ingredient)?.bakerPct
                    }
                    onDuration={setDuration}
                    onYeast={(ingredient, accepted) =>
                      onEdit({
                        type: 'UpdateComponent',
                        component: component.id,
                        changes: {
                          allocations: (component.allocations ?? []).map((a) =>
                            a.ingredient === ingredient
                              ? { ...a, bakerPct: accepted.appliedValue, accepted }
                              : a,
                          ),
                        },
                      })
                    }
                  />
                )}
              </div>
            );
          })}
        </section>
      )}
    </Card>
  );
};

/** Replaces the dough steps with a fermentation schedule (drafts.md), after a confirmation. */
const ScheduleRow = ({
  process,
  replaced,
  onProcess,
}: {
  process: Process;
  replaced: number;
  onProcess: (process: Process) => boolean;
}) => {
  const { t, stepName, error } = useMessages();
  const id = useId();
  const [presentAlert] = useIonAlert();
  const [refusal, setRefusal] = useState<string>();
  const nameOf = (scheduleId: string) => {
    const key = `schedule.${scheduleId}`;
    return isKey(key) ? t(key) : scheduleId;
  };
  const apply = (scheduleId: string) => {
    const result = applySchedule(process, scheduleId);
    if (!result.ok) {
      setRefusal(
        result.error.code === 'InvalidProcess'
          ? t('fermentation.schedule.refused')
          : error(result.error),
      );
      return;
    }
    setRefusal(undefined);
    onProcess(result.value);
  };
  const choose = (scheduleId: string) => {
    if (replaced === 0) {
      apply(scheduleId);
      return;
    }
    void presentAlert({
      header: t('fermentation.schedule.confirmTitle', { name: nameOf(scheduleId) }),
      message: t('fermentation.schedule.confirmMessage', {
        steps: (doughSteps(process) ?? []).map(stepName).join(', '),
      }),
      buttons: [
        { text: t('fermentation.cancel'), role: 'cancel' },
        { text: t('fermentation.schedule.apply'), handler: () => apply(scheduleId) },
      ],
    });
  };
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <label htmlFor={id}>{t('fermentation.schedule')}</label>
          <InfoButton topic="schedule" term={t('fermentation.schedule.term')} />
        </span>
        <select
          id={id}
          className="fp-field h-11 max-w-[12.5rem] min-w-0 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink"
          value=""
          onChange={(event) => {
            if (event.target.value) choose(event.target.value);
          }}
        >
          <option value="" disabled>
            {t('fermentation.schedule.pick')}
          </option>
          {FERMENTATION_SCHEDULES.map((s) => (
            <option key={s.id} value={s.id}>
              {nameOf(s.id)}
            </option>
          ))}
        </select>
      </div>
      {refusal && (
        <p role="alert" className="m-0 text-sm text-alert">
          {refusal}
        </p>
      )}
    </>
  );
};

const Row = ({
  label,
  help,
  children,
}: {
  label: string;
  help?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-1.5">
      {label}
      {help}
    </span>
    {children}
  </div>
);

const WaterTemperature = ({ estimate }: { estimate: Estimate }) => {
  const { t } = useMessages();
  const temperature = useTemperature();
  const { reason } = useEstimateText();
  if (estimate.status !== 'ok') return <span className="text-sm">{reason(estimate)}</span>;
  // The limits named by the notes, in the device's unit.
  const limits = {
    low: temperature.format(0, 'ambient'),
    high: temperature.format(60, 'ambient'),
  };
  const notes = estimate.assumptions.flatMap((code) => {
    const key = `fermentation.note.${code}`;
    return isKey(key) ? [t(key, limits)] : [];
  });
  return (
    <span className="flex flex-col">
      <span className="flex items-center gap-1.5 text-lg font-bold">
        {t('fermentation.water', {
          temperature: temperature.format(estimate.value, 'ambient', { digits: 0 }),
        })}
        <InfoButton topic="waterTemp" term={t('fermentation.waterTerm')} />
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
