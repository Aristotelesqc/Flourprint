import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
  useIonAlert,
} from '@ionic/react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  phasesDurationS,
  removeStep,
  updateStep,
  type MixPhase,
  type Process,
  type ProcessStep,
  type StepChanges,
  type StepTechnique,
} from '@flourprint/core/domain';
import { en, type MessageKey } from '../i18n/messages';
import { formatDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { END_CHECKS, FOLD_STYLES, methodsFor, SPEEDS } from '../services/process-edit';
import { DurationField, OptionalNumberField } from '../ui/Field';
import { InfoButton } from '../ui/InfoButton';
import { SectionTitle } from '../ui/Layout';

type Translate = ReturnType<typeof useMessages>['t'];

const isKey = (key: string): key is MessageKey => Object.hasOwn(en, key);

/** Label of an open code: its catalog text when the app names it, else the code as given. */
const codeLabel = (t: Translate, prefix: string, code: string): string => {
  const key = `${prefix}.${code}`;
  return isKey(key) ? t(key) : code;
};

/**
 * One line that says how a step is done, e.g. "Spiral · 3 min low + 5 min medium" or
 * "4 sets of folds / 30 min". Empty without a technique.
 */
export const techniqueSummary = (t: Translate, technique: StepTechnique | undefined): string => {
  if (!technique) return '';
  const parts: string[] = [];
  if (technique.method) parts.push(codeLabel(t, 'technique.method', technique.method));
  if (technique.phases && technique.phases.length > 0) {
    parts.push(
      technique.phases
        .map((phase) =>
          t('technique.phase.summary', {
            duration: formatDuration(phase.durationS),
            speed: codeLabel(t, 'technique.speed', phase.speed),
          }),
        )
        .join(' + '),
    );
  }
  if (technique.folds) {
    const folds = t('technique.folds.summary', {
      count: technique.folds.count,
      interval: formatDuration(technique.folds.intervalS),
    });
    parts.push(
      technique.folds.style
        ? `${folds} (${codeLabel(t, 'technique.method', technique.folds.style)})`
        : folds,
    );
  }
  if (technique.endCheck) {
    parts.push(
      t('technique.endCheck.summary', {
        check: codeLabel(t, 'technique.endCheck', technique.endCheck),
      }),
    );
  }
  return parts.join(' · ');
};

/** A technique being edited: a part set to undefined is removed. */
type TechniqueEdit = { readonly [K in keyof StepTechnique]?: StepTechnique[K] | undefined };

/** A technique without its empty parts; undefined when nothing is left. */
const compact = (technique: TechniqueEdit): StepTechnique | undefined => {
  const entries = Object.entries(technique).filter(
    ([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && !value.length),
  );
  return entries.length === 0 ? undefined : (Object.fromEntries(entries) as StepTechnique);
};

interface Props {
  readonly open: boolean;
  /** The step being edited, read from the current draft on every render. */
  readonly step: ProcessStep | undefined;
  readonly process: Process;
  /** A preparation's own step: removed through its preparation (formula tab), not here. */
  readonly preparation: boolean;
  /** Applies a process change to the draft; false when it was refused. */
  readonly onChange: (process: Process) => boolean;
  readonly onClose: () => void;
  readonly onDismissed?: () => void;
}

/**
 * Edits how a step is done (process.md, Techniques) and removes it. Every change goes to the draft
 * at once, like any edit (drafts.md). Recorded data only: nothing is predicted from it.
 */
export const StepSheet = ({
  open,
  step,
  process,
  preparation,
  onChange,
  onClose,
  onDismissed,
}: Props) => {
  const { t, stepName } = useMessages();
  const [presentAlert] = useIonAlert();
  const id = useId();
  // A phase being added waits for its duration: nothing is invented.
  const [newPhase, setNewPhase] = useState<MixPhase['speed']>();
  // Fold count and interval typed one after the other; folds exist once both are known.
  const [folds, setFolds] = useState<{ count?: number; intervalS?: number }>({});
  const [foldStyle, setFoldStyle] = useState<string | undefined>();

  const stepId = step?.id;
  useEffect(() => {
    if (!open) return;
    setNewPhase(undefined);
    setFolds({ ...step?.technique?.folds });
    setFoldStyle(step?.technique?.folds?.style);
    // Reset only when the sheet opens or moves to another step.
  }, [open, stepId]);

  if (!step) return <IonModal isOpen={false} />;
  const technique = step.technique ?? {};

  const change = (changes: StepChanges): boolean => onChange(updateStep(process, step.id, changes));

  const setTechnique = (next: TechniqueEdit, withPhases = false): boolean => {
    const cleaned = compact(next);
    // The baker's own numbers: the step lasts as long as its phases (process.md).
    const total = withPhases ? phasesDurationS(cleaned) : undefined;
    return change({
      technique: cleaned,
      ...(total === undefined ? {} : { plannedDurationS: total }),
    });
  };

  const phases = technique.phases ?? [];
  const setPhases = (next: readonly MixPhase[]) =>
    setTechnique({ ...technique, phases: [...next] }, true);

  const applyFolds = (next: { count?: number; intervalS?: number }): boolean => {
    setFolds(next);
    if (next.count !== undefined && next.intervalS !== undefined) {
      const style = foldStyle ?? technique.folds?.style;
      return setTechnique({
        ...technique,
        folds: {
          count: next.count,
          intervalS: next.intervalS,
          ...(style === undefined ? {} : { style }),
        },
      });
    }
    if (technique.folds) {
      const { folds: _, ...rest } = technique;
      return setTechnique(rest);
    }
    return true;
  };

  const methods = methodsFor(step.operation);
  const remove = () => {
    let accepted = false;
    let confirmed = false;
    void presentAlert({
      header: t('technique.removeStep'),
      message: t('technique.removeConfirm', { step: stepName(step) }),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('technique.removeStep'),
          role: 'destructive',
          handler: () => {
            if (!confirmed) {
              confirmed = true;
              accepted = onChange(removeStep(process, step.id));
            }
          },
        },
      ],
      onDidDismiss: () => {
        if (accepted) onClose();
      },
    });
  };

  return (
    <IonModal
      isOpen={open}
      onDidDismiss={() => {
        onClose();
        onDismissed?.();
      }}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{stepName(step)}</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={onClose}>
              {t('technique.close')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-6">
          <span className="flex items-center gap-1.5 font-bold">
            {t('technique.title')}
            <InfoButton topic="technique" term={t('technique.title')} />
          </span>

          {(methods.length > 0 || technique.method !== undefined) && (
            <CodeSelect
              label={t('technique.method')}
              value={technique.method}
              codes={methods}
              prefix="technique.method"
              onChange={(method) => setTechnique({ ...technique, method })}
            />
          )}

          {(step.operation === 'mix' || phases.length > 0) && (
            <section className="flex flex-col gap-2">
              <SectionTitle>{t('technique.phases')}</SectionTitle>
              {phases.map((phase, i) => (
                <PhaseRow
                  key={i}
                  index={i + 1}
                  speed={phase.speed}
                  durationS={phase.durationS}
                  onSpeed={(speed) =>
                    setPhases(phases.map((p, j) => (j === i ? { ...p, speed } : p)))
                  }
                  onDuration={(durationS) =>
                    durationS !== undefined &&
                    durationS > 0 &&
                    setPhases(phases.map((p, j) => (j === i ? { ...p, durationS } : p)))
                  }
                  onRemove={() => setPhases(phases.filter((_, j) => j !== i))}
                />
              ))}
              {newPhase !== undefined ? (
                <PhaseRow
                  index={phases.length + 1}
                  speed={newPhase}
                  durationS={undefined}
                  onSpeed={setNewPhase}
                  onDuration={(durationS) => {
                    if (durationS === undefined || durationS <= 0) return false;
                    setNewPhase(undefined);
                    return setPhases([...phases, { speed: newPhase, durationS }]);
                  }}
                  onRemove={() => setNewPhase(undefined)}
                />
              ) : (
                <button
                  type="button"
                  className="fp-reset min-h-11 self-start font-semibold text-accent-text"
                  onClick={() => setNewPhase('low')}
                >
                  {t('technique.phase.add')}
                </button>
              )}
              {phases.length > 0 && (
                <span className="text-sm text-muted">{t('technique.phases.hint')}</span>
              )}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <SectionTitle>{t('technique.folds')}</SectionTitle>
            <Line label={t('technique.folds.count')}>
              <OptionalNumberField
                label={t('technique.folds.count')}
                value={folds.count}
                width="7rem"
                onCommit={(count) => {
                  if (count !== undefined && !(Number.isInteger(count) && count >= 1)) {
                    return false;
                  }
                  const { count: _, ...rest } = folds;
                  return applyFolds(count === undefined ? rest : { ...rest, count });
                }}
              />
            </Line>
            <Line label={t('technique.folds.interval')}>
              <DurationField
                label={t('technique.folds.interval')}
                value={folds.intervalS}
                optional
                width="7rem"
                onCommit={(intervalS) => {
                  if (intervalS !== undefined && intervalS <= 0) return false;
                  const { intervalS: _, ...rest } = folds;
                  return applyFolds(intervalS === undefined ? rest : { ...rest, intervalS });
                }}
              />
            </Line>
            {technique.folds && (
              <>
                <CodeSelect
                  label={t('technique.folds.style')}
                  value={technique.folds.style}
                  codes={FOLD_STYLES}
                  prefix="technique.method"
                  onChange={(style) => {
                    setFoldStyle(style);
                    const { style: _, ...rest } = technique.folds ?? { count: 1, intervalS: 1 };
                    setTechnique({
                      ...technique,
                      folds: style === undefined ? rest : { ...rest, style },
                    });
                  }}
                />
                <span className="text-sm text-muted">{t('technique.folds.hint')}</span>
                <button
                  type="button"
                  className="fp-reset min-h-11 self-start text-sm font-semibold text-alert"
                  onClick={() => {
                    setFoldStyle(undefined);
                    applyFolds({});
                  }}
                >
                  {t('technique.folds.remove')}
                </button>
              </>
            )}
          </section>

          <CodeSelect
            label={t('technique.endCheck')}
            value={technique.endCheck}
            codes={END_CHECKS}
            prefix="technique.endCheck"
            onChange={(endCheck) => setTechnique({ ...technique, endCheck })}
          />

          <section className="flex flex-col gap-2 border-t border-line pt-4" aria-labelledby={id}>
            {preparation ? (
              <p id={id} className="m-0 text-sm text-muted">
                {t('technique.preparationStep')}
              </p>
            ) : (
              <IonButton id={id} fill="outline" color="danger" onClick={remove}>
                {t('technique.removeStep')}
              </IonButton>
            )}
          </section>
        </div>
      </IonContent>
    </IonModal>
  );
};

const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="flex items-center justify-between gap-3">
    <span>{label}</span>
    {children}
  </span>
);

const selectClass =
  'fp-field h-11 max-w-[60%] rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink';

/** A select of open codes; a code the app does not name is kept and shown as given. */
const CodeSelect = ({
  label,
  value,
  codes,
  prefix,
  onChange,
}: {
  label: string;
  value: string | undefined;
  codes: readonly string[];
  prefix: string;
  onChange: (code: string | undefined) => void;
}) => {
  const { t } = useMessages();
  const id = useId();
  const all = value === undefined || codes.includes(value) ? codes : [...codes, value];
  return (
    <span className="flex items-center justify-between gap-3">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={selectClass}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
      >
        <option value="">{t('technique.none')}</option>
        {all.map((code) => (
          <option key={code} value={code}>
            {codeLabel(t, prefix, code)}
          </option>
        ))}
      </select>
    </span>
  );
};

const PhaseRow = ({
  index,
  speed,
  durationS,
  onSpeed,
  onDuration,
  onRemove,
}: {
  index: number;
  speed: MixPhase['speed'];
  durationS: number | undefined;
  onSpeed: (speed: MixPhase['speed']) => void;
  onDuration: (durationS: number | undefined) => boolean;
  onRemove: () => void;
}) => {
  const { t } = useMessages();
  return (
    <span className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
      <select
        aria-label={t('technique.phase.speed', { index })}
        className="fp-field h-11 rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink"
        value={speed}
        onChange={(event) => onSpeed(event.target.value as MixPhase['speed'])}
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {t(`technique.speed.${s}`)}
          </option>
        ))}
      </select>
      <DurationField
        label={t('technique.phase.duration', { index })}
        value={durationS}
        onCommit={onDuration}
      />
      <button
        type="button"
        aria-label={t('technique.phase.remove', { index })}
        className="fp-reset min-h-11 min-w-11 text-xl text-muted"
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
};
