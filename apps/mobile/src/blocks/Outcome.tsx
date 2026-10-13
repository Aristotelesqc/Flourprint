import { useIonAlert } from '@ionic/react';
import {
  DOUGH_DISPOSITIONS,
  OUTCOME_RESULTS,
  type PreparationOutcome,
} from '@flourprint/core/domain';
import { useMessages } from '../i18n/use-messages';

/**
 * Every result the contract accepts (bake-session.md, Outcome), without pieces: cooked, then raw
 * dough and cooked-and-dough with each disposition or none said. Pieces kept stay unrecorded here:
 * the dough inventory (#56) will ask for them, and a recorded count is preserved, never dropped.
 */
export const OUTCOME_CHOICES: readonly PreparationOutcome[] = OUTCOME_RESULTS.flatMap(
  (result): PreparationOutcome[] =>
    result === 'cooked'
      ? [{ result }]
      : [{ result }, ...DOUGH_DISPOSITIONS.map((dough) => ({ result, dough }))],
);

/** A stable key of an outcome's result and disposition, for radio values and selects. */
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

/**
 * Asks for a result, then, for a raw dough kept, what became of it: two short lists rather than
 * one long one. The current outcome is preselected; its pieces count, if any, is kept when the
 * result still keeps dough.
 */
export const useOutcomePicker = () => {
  const { t } = useMessages();
  const [presentAlert] = useIonAlert();
  // A second controller: the dough list opens as the result list closes.
  const [presentDoughAlert] = useIonAlert();
  const buttons = (onSave: (value: string | undefined) => boolean) => [
    { text: t('bake.cancel'), role: 'cancel' },
    { text: t('bake.save'), handler: onSave },
  ];
  return (
    header: string,
    current: PreparationOutcome | undefined,
    onPick: (outcome: PreparationOutcome) => void,
  ) => {
    const pickDough = (result: PreparationOutcome['result']) =>
      void presentDoughAlert({
        header: t('outcome.pickDough'),
        inputs: [undefined, ...DOUGH_DISPOSITIONS].map((dough) => ({
          type: 'radio' as const,
          label: t(`outcome.dough.${dough ?? 'unknown'}`),
          value: dough ?? '',
          // Another result than the current one starts from "not said", so saving never does nothing.
          checked:
            current?.result === result
              ? (current.dough ?? '') === (dough ?? '')
              : dough === undefined,
        })),
        buttons: buttons((value) => {
          if (value === undefined) return false;
          const dough = DOUGH_DISPOSITIONS.find((d) => d === value);
          const pieces = current?.result !== 'cooked' ? current?.pieces : undefined;
          onPick({
            result,
            ...(dough === undefined ? {} : { dough }),
            ...(pieces === undefined ? {} : { pieces }),
          });
          return true;
        }),
      });
    // The second list opens once the first is gone: one alert at a time.
    let keeping: PreparationOutcome['result'] | undefined;
    void presentAlert({
      header,
      inputs: OUTCOME_RESULTS.map((result) => ({
        type: 'radio' as const,
        label: t(`outcome.${result}`),
        value: result,
        checked: current?.result === result,
      })),
      buttons: buttons((value) => {
        const result = OUTCOME_RESULTS.find((r) => r === value);
        if (result === undefined) return false;
        if (result === 'cooked') onPick({ result });
        else keeping = result;
        return true;
      }),
      onDidDismiss: () => {
        if (keeping !== undefined) pickDough(keeping);
      },
    });
  };
};
