import { IonInput } from '@ionic/react';
import { useEffect, useState } from 'react';
import { editableNumber, parseDecimal } from '../i18n/numbers';
import { useMessages } from '../i18n/use-messages';

interface Props {
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly onCommit: (value: number) => void;
}

/**
 * Precise numeric entry (#8): decimal keyboard, comma or point, committed on blur or Enter.
 * An incomplete draft stays in the field instead of being reset or silently corrected.
 */
export const NumberField = ({ label, value, unit, onCommit }: Props) => {
  const { t, locale } = useMessages();
  const [text, setText] = useState(() => editableNumber(value, locale));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => setText(editableNumber(value, locale)), [value, locale]);

  const commit = () => {
    const parsed = parseDecimal(text);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <IonInput
      aria-label={label}
      className={`min-h-[var(--spacing-touch)] text-right ${invalid ? 'ion-invalid ion-touched' : ''}`}
      inputmode="decimal"
      value={text}
      {...(invalid ? { errorText: t('field.invalidNumber') } : {})}
      onIonInput={(event) => setText(String(event.detail.value ?? ''))}
      onIonBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit();
      }}
    >
      <span slot="end" className="text-[var(--color-muted)]">
        {unit}
      </span>
    </IonInput>
  );
};
