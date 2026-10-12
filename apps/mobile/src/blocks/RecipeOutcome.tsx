import { useId } from 'react';
import { intendedOutcome, type Process } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';
import { OUTCOME_CHOICES, outcomeFromKey, outcomeKey, useOutcomeText } from './Outcome';

interface Props {
  readonly process: Process;
  readonly editable: boolean;
  readonly onChange?: (process: Process) => boolean;
}

/**
 * Authored outcome component for the Recipe tab (#63, #71).
 * Displays plain text in reading mode; labelled select/options in editing mode only.
 * Planning tab displays a static summary only; never an editable select.
 */
export const RecipeOutcome = ({ process, editable, onChange }: Props) => {
  const { t } = useMessages();
  const outcomeText = useOutcomeText();
  const id = useId();
  const { intendedOutcome: _, ...baseProcess } = process;
  const auto = intendedOutcome(baseProcess);
  const current = process.intendedOutcome;
  const isAuto = current === undefined;
  const currentKey = current ? outcomeKey(current) : '';
  const label = isAuto ? t('outcome.auto', { outcome: outcomeText(auto) }) : outcomeText(current);

  if (!editable || !onChange) {
    return (
      <div
        data-testid="recipe-outcome"
        className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3 text-sm"
      >
        <span className="font-semibold text-muted">{t('process.intendedOutcome')}</span>
        <span className="font-medium text-ink">{label}</span>
      </div>
    );
  }

  const selectClass =
    'fp-field h-11 w-full max-w-full rounded-[10px] border-[1.5px] border-field bg-field-bg px-2 text-ink';

  return (
    <div
      data-testid="recipe-outcome"
      className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-4"
    >
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t('process.intendedOutcome')}
      </label>
      <select
        id={id}
        className={selectClass}
        value={currentKey}
        onChange={(e) => {
          const key = e.target.value;
          if (key === '') {
            const { intendedOutcome: _, ...rest } = process;
            onChange(rest);
            return;
          }
          const picked = outcomeFromKey(key);
          if (!picked) return;
          const pieces = current?.result !== 'cooked' ? current?.pieces : undefined;
          onChange({
            ...process,
            intendedOutcome: {
              ...picked,
              ...(picked.result !== 'cooked' && pieces !== undefined ? { pieces } : {}),
            },
          });
        }}
      >
        <option value="">{t('outcome.auto', { outcome: outcomeText(auto) })}</option>
        {OUTCOME_CHOICES.map((choice) => {
          const key = outcomeKey(choice);
          return (
            <option key={key} value={key}>
              {outcomeText(choice)}
            </option>
          );
        })}
      </select>
      <span className="text-sm text-muted">{t('process.intendedOutcomeHint')}</span>
    </div>
  );
};
