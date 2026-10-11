import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useEffect, useState } from 'react';
import type {
  BakeCommandPayload,
  BakeState,
  ObservationCategory,
  StepId,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { defaultCategory, NOTE_CATEGORIES, noteSteps } from '../services/notes';
import { SectionTitle } from '../ui/Layout';

interface Props {
  readonly open: boolean;
  readonly state: BakeState;
  /** The step the baker is on; the note is attached to it unless they pick another. */
  readonly stepId?: StepId;
  /** A write is running: saving waits for it. */
  readonly busy: boolean;
  /**
   * Records the note; resolves to nothing once it is durably written (the page then closes the
   * sheet), or to a message. The draft stays until then (a conflict, a storage error, a busy
   * write), so a note is never lost before it is saved.
   */
  readonly onSave: (
    payload: Extract<BakeCommandPayload, { type: 'AddObservation' }>,
  ) => Promise<string | undefined>;
  readonly onClose: () => void;
}

/**
 * A note taken during or after a bake (bake-session.md): attached to a step and a category, so
 * that it can be read against the plan later (history.md, feedback export).
 */
export const NoteSheet = ({ open, state, stepId, busy, onSave, onClose }: Props) => {
  const { t, stepName } = useMessages();
  const [text, setText] = useState('');
  const [step, setStep] = useState<StepId | undefined>(stepId);
  const [category, setCategory] = useState<ObservationCategory>(defaultCategory(state, stepId));
  const [rating, setRating] = useState<number>();
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string>();
  const ended = state.status !== 'active';

  useEffect(() => {
    if (!open) return;
    setText('');
    setStep(stepId);
    setCategory(defaultCategory(state, stepId));
    setRating(undefined);
    setProblem(undefined);
    // Reset only when the sheet opens: the state refreshes while it is open.
  }, [open]);

  const pick = (next: StepId | undefined) => {
    setStep(next);
    setCategory(defaultCategory(state, next));
  };
  const save = async () => {
    const trimmed = text.trim();
    if (trimmed === '' && rating === undefined) return;
    setSaving(true);
    setProblem(undefined);
    try {
      setProblem(
        await onSave({
          type: 'AddObservation',
          category,
          ...(step === undefined ? {} : { stepId: step }),
          ...(trimmed === '' ? {} : { text: trimmed }),
          ...(rating === undefined ? {} : { rating }),
        }),
      );
    } finally {
      setSaving(false);
    }
  };
  const nameOf = (id: StepId) => {
    const found = state.process?.steps.find((s) => s.id === id);
    return found ? stepName(found) : id;
  };

  return (
    <IonModal isOpen={open} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={onClose}>{t('bake.cancel')}</IonButton>
          </IonButtons>
          <IonTitle>{t('bake.noteTitle')}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              strong
              disabled={saving || busy || (text.trim() === '' && rating === undefined)}
              onClick={() => void save()}
            >
              {t('bake.save')}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="flex flex-col gap-5">
          {problem && (
            <p role="alert" className="m-0 text-alert">
              {problem}
            </p>
          )}
          <textarea
            aria-label={t('bake.noteTitle')}
            className="fp-reset min-h-32 w-full rounded-xl border border-line bg-surface p-3 text-lg"
            placeholder={t('bake.notePlaceholder')}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Choices
            title={t('note.step')}
            options={[
              ...noteSteps(state).map((id) => ({ value: id, label: nameOf(id) })),
              { value: '', label: t('note.wholeBake') },
            ]}
            value={step ?? ''}
            onChange={(value) => pick(value === '' ? undefined : value)}
          />
          <Choices
            title={t('note.category')}
            options={NOTE_CATEGORIES.map((c) => ({ value: c, label: t(`note.category.${c}`) }))}
            value={category}
            onChange={(value) => setCategory(value as ObservationCategory)}
          />
          {ended && (
            <Choices
              title={t('note.rating')}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: '★'.repeat(n) }))}
              value={rating === undefined ? '' : String(rating)}
              onChange={(value) => setRating(value === String(rating) ? undefined : Number(value))}
            />
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

const Choices = ({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <section className="flex flex-col gap-2">
    <SectionTitle>{title}</SectionTitle>
    <div role="group" aria-label={title} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`fp-reset min-h-10 rounded-full border px-3.5 text-[15px] ${
              selected
                ? 'border-accent bg-accent font-bold text-on-accent'
                : 'border-line bg-surface text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </section>
);
