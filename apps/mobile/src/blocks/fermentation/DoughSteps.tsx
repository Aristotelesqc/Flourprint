import { IonButton, useIonAlert } from '@ionic/react';
import { useId, useState } from 'react';
import { isColdStep } from '@flourprint/core/application';
import {
  insertStepAfter,
  removeStep,
  temperatureContext,
  updateStep,
  type Estimate,
  type Process,
  type ProcessStep,
} from '@flourprint/core/domain';
import { editableDuration, formatDuration } from '../../i18n/time';
import { useMessages } from '../../i18n/use-messages';
import { newStepId } from '../../services/process-edit';
import { DurationField, TemperatureField } from '../../ui/Field';
import { InfoButton } from '../../ui/InfoButton';
import { useEstimateText, withConditions } from './text';

/** Operations offered for a new dough step (process.md codes). */
const DOUGH_OPERATIONS = [
  'bulk',
  'fold',
  'retard',
  'rest',
  'degas',
  'divide',
  'preshape',
  'shape',
  'proof',
] as const;

/** A new cold retard starts in the fridge; every value stays editable. */
const FRIDGE = { location: 'fridge', temperatureC: 4 } as const;

interface Props {
  readonly process: Process;
  readonly mix: ProcessStep;
  readonly steps: readonly ProcessStep[];
  /** The dough's duration estimate: for the Auto step when there is one. */
  readonly duration: Estimate;
  readonly estimatedStepId: string | undefined;
  /** Ids a new step must not take (preparations own their step ids). */
  readonly reservedIds: readonly string[];
  /** The ambient each step is estimated at, shown in an empty temperature field. */
  readonly ambients: Readonly<Record<string, number>>;
  readonly onProcess: (process: Process) => boolean;
}

/**
 * The dough steps between the mix and the first heat step, one row each: place, temperature,
 * duration, and the Auto chip on the one step whose time follows the model (fermentation.md).
 */
export const DoughSteps = ({
  process,
  mix,
  steps,
  duration,
  estimatedStepId,
  reservedIds,
  ambients,
  onProcess,
}: Props) => {
  const { t } = useMessages();
  return (
    <section className="flex flex-col">
      <span className="flex items-center gap-1.5 pb-1 text-sm font-semibold">
        {t('fermentation.doughSteps')}
        <InfoButton topic="autoDuration" term={t('fermentation.autoTerm')} />
      </span>
      {steps.length === 0 && (
        <span className="py-2 text-sm text-muted">{t('fermentation.noDoughSteps')}</span>
      )}
      <ul className="fp-list flex flex-col [&>*+*]:border-t [&>*+*]:border-line">
        {steps.map((step) => (
          <StepRow
            key={step.id}
            process={process}
            step={step}
            estimate={step.id === estimatedStepId ? duration : undefined}
            ambientC={ambients[step.id]}
            onProcess={onProcess}
          />
        ))}
      </ul>
      <AddDoughStep
        process={process}
        anchors={[mix, ...steps]}
        reservedIds={reservedIds}
        onProcess={onProcess}
      />
    </section>
  );
};

const StepRow = ({
  process,
  step,
  estimate,
  ambientC,
  onProcess,
}: {
  process: Process;
  step: ProcessStep;
  estimate: Estimate | undefined;
  ambientC: number | undefined;
  onProcess: (process: Process) => boolean;
}) => {
  const { t, stepName } = useMessages();
  const { ends } = useEstimateText();
  const [presentAlert] = useIonAlert();
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const name = stepName(step);
  const auto = step.durationMode === 'model';
  const fridge = isColdStep(step);
  const paused = auto && estimate?.status !== 'ok';

  /** Auto on this step; the previous Auto step keeps its last time, now typed by hand. */
  const setAuto = (on: boolean) =>
    onProcess({
      ...process,
      steps: process.steps.map((s) => {
        if (s.id === step.id) {
          const { durationMode: _, ...manual } = s;
          return on ? { ...manual, durationMode: 'model' as const } : manual;
        }
        if (on && s.durationMode === 'model') {
          const { durationMode: _, ...manual } = s;
          return manual;
        }
        return s;
      }),
    });

  const remove = () =>
    void presentAlert({
      header: t('fermentation.removeConfirm', { step: name }),
      buttons: [
        { text: t('fermentation.cancel'), role: 'cancel' },
        {
          text: t('fermentation.remove'),
          role: 'destructive',
          handler: () => {
            onProcess(removeStep(process, step.id));
          },
        },
      ],
    });

  const band = estimate ? ends(estimate, formatDuration) : undefined;
  return (
    <li className="flex flex-col gap-1.5 py-2.5">
      <span className="flex items-center gap-2">
        <span className="min-w-0 truncate font-semibold">{name}</span>
        <span
          className={`shrink-0 rounded-full px-2 text-xs leading-5 ${
            fridge ? 'bg-accent-soft text-accent-text' : 'bg-track text-muted'
          }`}
        >
          {t(fridge ? 'fermentation.location.fridge' : 'fermentation.location.room')}
        </span>
        <button
          type="button"
          aria-label={t('fermentation.removeStep', { step: name })}
          className="fp-reset -my-2 ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center text-xl leading-none text-muted"
          onClick={remove}
        >
          ×
        </button>
      </span>
      <span className="flex items-center gap-2">
        <TemperatureField
          label={t('fermentation.stepTemperature', { step: name })}
          // A step the card marks cold reads in the cold unit (values-and-units.md).
          context={fridge ? 'cold' : temperatureContext(step)}
          width="5.75rem"
          value={step.conditions?.temperatureC}
          {...(ambientC === undefined ? {} : { placeholderC: ambientC })}
          onCommit={(value) => onProcess(withConditions(process, step.id, { temperatureC: value }))}
        />
        {auto ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={t('fermentation.autoValue', {
              step: name,
              duration:
                step.plannedDurationS === undefined ? '—' : formatDuration(step.plannedDurationS),
            })}
            className="fp-reset flex h-11 w-[6.5rem] shrink-0 items-center justify-end rounded-[10px] border-[1.5px] border-dashed border-field px-2.5 font-semibold"
            onClick={() => setOpen(!open)}
          >
            {step.plannedDurationS === undefined
              ? '—'
              : `≈ ${editableDuration(step.plannedDurationS)}`}
          </button>
        ) : (
          <DurationField
            label={t('fermentation.stepDuration', { step: name })}
            value={step.plannedDurationS}
            optional
            width="6.5rem"
            onCommit={(seconds) =>
              onProcess(updateStep(process, step.id, { plannedDurationS: seconds }))
            }
          />
        )}
        <button
          type="button"
          aria-pressed={auto}
          aria-label={t('fermentation.autoLabel', { step: name })}
          className={`fp-reset ml-auto h-9 shrink-0 rounded-full border-[1.5px] px-3 text-sm font-semibold ${
            auto ? 'border-accent bg-accent text-on-accent' : 'border-field text-muted'
          }`}
          onClick={() => setAuto(!auto)}
        >
          {t('fermentation.auto')}
        </button>
      </span>
      {paused && <span className="text-[13px] text-muted">{t('fermentation.autoKept')}</span>}
      {auto && open && (
        <span id={detailId} className="text-[13px] text-muted">
          {estimate?.status === 'ok' && estimate.assumptions.includes('end_point_before_last_step')
            ? `${t('fermentation.reachedBefore', { step: name })} `
            : estimate?.status === 'ok' && band
              ? `${t('fermentation.autoDetail', {
                  duration: formatDuration(estimate.value),
                  ...band,
                })} `
              : ''}
          {t('fermentation.autoOff')}
        </span>
      )}
    </li>
  );
};

/** Inserts a dough step after the mix or a dough step (the last one by default). */
const AddDoughStep = ({
  process,
  anchors,
  reservedIds,
  onProcess,
}: {
  process: Process;
  anchors: readonly ProcessStep[];
  reservedIds: readonly string[];
  onProcess: (process: Process) => boolean;
}) => {
  const { t, stepName } = useMessages();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<string>('bulk');
  const [after, setAfter] = useState<string>();
  const anchor = anchors.find((s) => s.id === after) ?? anchors.at(-1);
  if (!open || !anchor) {
    return (
      <button
        type="button"
        className="fp-reset min-h-11 w-full border-t border-line text-left font-semibold text-accent-text"
        onClick={() => setOpen(true)}
      >
        {t('fermentation.add')}
      </button>
    );
  }
  const selectClass =
    'fp-field h-11 w-full rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink';
  const add = () => {
    const next = insertStepAfter(process, anchor.id, {
      id: newStepId(process, operation, reservedIds),
      operation,
      schedule: 'asap',
      ...(operation === 'retard' ? { conditions: FRIDGE } : {}),
    });
    if (onProcess(next)) {
      setOpen(false);
      setAfter(undefined);
    }
  };
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <span className="grid grid-cols-2 gap-2">
        <span className="flex flex-col gap-1">
          <label htmlFor={`${id}-operation`} className="text-sm">
            {t('fermentation.add.operation')}
          </label>
          <select
            id={`${id}-operation`}
            className={selectClass}
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            {DOUGH_OPERATIONS.map((code) => (
              <option key={code} value={code}>
                {stepName({ operation: code })}
              </option>
            ))}
          </select>
        </span>
        <span className="flex flex-col gap-1">
          <label htmlFor={`${id}-after`} className="text-sm">
            {t('fermentation.add.after')}
          </label>
          <select
            id={`${id}-after`}
            className={selectClass}
            value={anchor.id}
            onChange={(event) => setAfter(event.target.value)}
          >
            {anchors.map((s) => (
              <option key={s.id} value={s.id}>
                {stepName(s)}
              </option>
            ))}
          </select>
        </span>
      </span>
      <span className="flex gap-2">
        <IonButton size="small" onClick={add}>
          {t('fermentation.add.confirm')}
        </IonButton>
        <IonButton size="small" fill="outline" onClick={() => setOpen(false)}>
          {t('fermentation.cancel')}
        </IonButton>
      </span>
    </div>
  );
};
