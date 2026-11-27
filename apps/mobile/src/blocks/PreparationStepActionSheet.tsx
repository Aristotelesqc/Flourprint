import { useEffect, useEffectEvent, useId, useState, type FormEvent } from 'react';
import type { Instant, ProcessStep } from '@flourprint/core/domain';
import { editableDuration, parseDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { Ui } from '../ui/library';

export type PreparationStepAction =
  | {
      readonly kind: 'correct';
      readonly step: ProcessStep;
      readonly choices: readonly {
        readonly kind: 'start' | 'end';
        readonly eventId: string;
        readonly at: Instant;
      }[];
    }
  | {
      readonly kind: 'repeat';
      readonly step: ProcessStep;
      readonly after: ProcessStep;
    };

interface Props {
  readonly action: PreparationStepAction | undefined;
  readonly blocked: boolean;
  readonly retrying: boolean;
  readonly onCorrect: (eventId: string, at: Instant) => Promise<string | undefined>;
  readonly onRepeat: (
    step: ProcessStep,
    after: ProcessStep,
    durationS: number | undefined,
  ) => Promise<string | undefined>;
  readonly onDismiss: () => void;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** Formats a UTC instant as a local `datetime-local` (`step=1`) value. */
const toLocalDateTimeInput = (instant: Instant): string => {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

/**
 * Converts a local `datetime-local` value to UTC via `Date` on submit, rejecting blank,
 * malformed, rolled-over, or silently normalized DST wall-clock values.
 */
const parseLocalDateTimeInput = (value: string): Instant | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');
  const date = new Date(
    `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${pad2(second)}`,
  );
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return undefined;
  }
  return date.toISOString() as Instant;
};

/**
 * Bottom sheet for correcting a recorded step time or repeating a completed step in Bake mode
 * (#171, L127, L136). Does not dispatch commands directly; delegates persistence to callers.
 */
export const PreparationStepActionSheet = ({
  action,
  blocked,
  retrying,
  onCorrect,
  onRepeat,
  onDismiss,
}: Props) => {
  const { t, stepName } = useMessages();
  const id = useId();
  const formId = `${id}-form`;
  const targetLabelId = `${id}-target-label`;
  const radioName = `${id}-target`;
  const timeInputId = `${id}-time`;
  const durationInputId = `${id}-duration`;
  const errorId = `${id}-error`;

  const [selectedEventId, setSelectedEventId] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const actionKey =
    action === undefined
      ? undefined
      : action.kind === 'correct'
        ? `correct:${action.step.id}:${action.choices
            .map((c) => `${c.kind}:${c.eventId}`)
            .join(',')}`
        : `repeat:${action.step.id}:${action.after.id}`;

  const resetOnAction = useEffectEvent(() => {
    setErrorMessage(undefined);
    if (!action) return;
    if (action.kind === 'correct') {
      const choice = action.choices.find((c) => c.kind === 'end') ?? action.choices[0];
      setSelectedEventId(choice?.eventId ?? '');
      setTimeInput(choice ? toLocalDateTimeInput(choice.at) : '');
      return;
    }
    setDurationInput(
      action.step.plannedDurationS === undefined
        ? ''
        : editableDuration(action.step.plannedDurationS),
    );
  });
  useEffect(() => resetOnAction(), [actionKey]);

  const activeChoice =
    action?.kind === 'correct'
      ? (action.choices.find((c) => c.eventId === selectedEventId) ??
        action.choices.find((c) => c.kind === 'end') ??
        action.choices[0])
      : undefined;

  const title =
    action === undefined
      ? ''
      : action.kind === 'correct'
        ? t(
            action.choices.length === 1 && activeChoice?.kind === 'end'
              ? 'bake.correctEndTimeTitle'
              : 'bake.correctTimeTitle',
            { step: stepName(action.step) },
          )
        : t('bake.repeatStepTitle', { step: stepName(action.step) });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action || blocked || saving) return;

    if (action.kind === 'correct') {
      if (!activeChoice) return;
      const initial = toLocalDateTimeInput(activeChoice.at);
      const at = timeInput === initial ? activeChoice.at : parseLocalDateTimeInput(timeInput);
      if (at === undefined) {
        setErrorMessage(t('bake.invalidRecordedTime'));
        return;
      }
      setSaving(true);
      setErrorMessage(undefined);
      try {
        const message = await onCorrect(activeChoice.eventId, at);
        if (message !== undefined) setErrorMessage(message);
      } finally {
        setSaving(false);
      }
      return;
    }

    const trimmed = durationInput.trim();
    const durationS = trimmed === '' ? undefined : parseDuration(durationInput);
    if (trimmed !== '' && durationS === undefined) {
      setErrorMessage(t('field.invalidDuration'));
      return;
    }
    setSaving(true);
    setErrorMessage(undefined);
    try {
      const message = await onRepeat(action.step, action.after, durationS);
      if (message !== undefined) setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Ui
      component="fp.bottom-sheet"
      isOpen={action !== undefined}
      title={title}
      closeLabel={t('help.close')}
      canDismiss={!saving || action === undefined}
      onDismiss={onDismiss}
      footer={
        <Ui
          component="fp.button"
          type="submit"
          form={formId}
          density="compact"
          fullWidth
          disabled={
            action === undefined ||
            blocked ||
            saving ||
            (action.kind === 'correct' && !activeChoice)
          }
        >
          {t(retrying ? 'state.retry' : 'bake.save')}
        </Ui>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="flex flex-col gap-4"
      >
        {errorMessage && (
          <p id={errorId} role="alert" className="m-0 text-alert">
            {errorMessage}
          </p>
        )}

        {action?.kind === 'correct' && (
          <>
            {action.choices.length > 1 && (
              <div
                role="radiogroup"
                aria-labelledby={targetLabelId}
                className="flex flex-col gap-1.5"
              >
                <span id={targetLabelId} className="text-supporting font-medium text-on-surface">
                  {t('bake.correctTimeField')}
                </span>
                <div className="flex flex-wrap gap-4">
                  {action.choices.map((choice) => (
                    <label
                      key={choice.eventId}
                      className="flex min-h-touch cursor-pointer items-center gap-2 text-body text-on-surface"
                    >
                      <input
                        type="radio"
                        name={radioName}
                        value={choice.eventId}
                        checked={choice.eventId === activeChoice?.eventId}
                        disabled={blocked || saving || retrying}
                        onChange={() => {
                          setSelectedEventId(choice.eventId);
                          setTimeInput(toLocalDateTimeInput(choice.at));
                          setErrorMessage(undefined);
                        }}
                        className="h-5 w-5 accent-primary focus-visible:fp-focus-ring"
                      />
                      <span>{t(choice.kind === 'start' ? 'bake.timeStart' : 'bake.timeEnd')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor={timeInputId} className="text-supporting font-medium text-on-surface">
                {t('bake.recordedTime')}
              </label>
              <input
                id={timeInputId}
                type="datetime-local"
                step={1}
                disabled={blocked || saving || retrying}
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={errorMessage ? errorId : undefined}
                className="fp-field h-12 w-full min-w-0 rounded-[10px] border-[1.5px] border-field bg-field-bg px-3 font-bold text-ink"
                value={timeInput}
                onChange={(event) => {
                  setTimeInput(event.target.value);
                  setErrorMessage(undefined);
                }}
              />
            </div>
          </>
        )}

        {action?.kind === 'repeat' && (
          <>
            <p className="m-0 text-supporting text-muted">
              {t('bake.repeatAfterStep', { step: stepName(action.after) })}
            </p>

            <Ui
              component="fp.number-field"
              id={durationInputId}
              label={t('bake.repeatPlannedDuration')}
              value={durationInput}
              onValueChange={(value) => {
                setDurationInput(value);
                setErrorMessage(undefined);
              }}
              inputMode="decimal"
              enterKeyHint="done"
              placeholder={t('bake.noDuration')}
              invalid={Boolean(errorMessage)}
              describedBy={errorMessage ? errorId : undefined}
              disabled={blocked || saving || retrying}
            />
          </>
        )}
      </form>
    </Ui>
  );
};
