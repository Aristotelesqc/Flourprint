import { useIonAlert } from '@ionic/react';
import type { PreparationOutcome } from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';

/**
 * The results offered when a bake ends differently from its recipe (bake-session.md, Outcome).
 * Pieces kept stay unrecorded here: the dough inventory (#56) will ask for them.
 */
export const OUTCOME_CHOICES: readonly PreparationOutcome[] = [
  { result: 'cooked' },
  { result: 'dough', dough: 'frozen' },
  { result: 'dough', dough: 'refrigerated' },
  { result: 'dough', dough: 'given' },
  { result: 'dough', dough: 'sold' },
  { result: 'dough' },
  { result: 'cookedAndDough', dough: 'frozen' },
  { result: 'cookedAndDough' },
];

/** A stable key of an outcome, for radio values and selects. */
export const outcomeKey = (outcome: PreparationOutcome): string =>
  [outcome.result, outcome.dough ?? ''].join(':');

export const outcomeFromKey = (key: string): PreparationOutcome | undefined =>
  OUTCOME_CHOICES.find((o) => outcomeKey(o) === key);

/** Display text of an outcome; `unknown` for one never recorded. */
export const useOutcomeText = () => {
  const { t } = useMessages();
  return (outcome: PreparationOutcome | 'unknown'): string => {
    if (outcome === 'unknown') return t('outcome.unknown');
    const result = t(`outcome.${outcome.result}`);
    return outcome.dough === undefined
      ? result
      : t('outcome.withDough', { result, dough: t(`outcome.dough.${outcome.dough}`) });
  };
};

/** Asks for a result among the choices, the current one selected. */
export const useOutcomePicker = () => {
  const { t } = useMessages();
  const text = useOutcomeText();
  const [presentAlert] = useIonAlert();
  return (
    header: string,
    current: PreparationOutcome | undefined,
    onPick: (outcome: PreparationOutcome) => void,
  ) =>
    void presentAlert({
      header,
      inputs: OUTCOME_CHOICES.map((choice) => ({
        type: 'radio' as const,
        label: text(choice),
        value: outcomeKey(choice),
        checked: current !== undefined && outcomeKey(current) === outcomeKey(choice),
      })),
      buttons: [
        { text: t('bake.cancel'), role: 'cancel' },
        {
          text: t('bake.save'),
          handler: (key: string | undefined) => {
            const outcome = key === undefined ? undefined : outcomeFromKey(key);
            if (!outcome) return false;
            onPick(outcome);
            return true;
          },
        },
      ],
    });
};
