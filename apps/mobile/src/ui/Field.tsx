import { useEffect, useId, useState } from 'react';
import { editableNumber, parseDecimal } from '../i18n/numbers';
import { editableDuration, parseDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';

interface FieldProps {
  readonly label: string;
  readonly text: string;
  readonly unit?: string;
  readonly parse: (text: string) => number | undefined;
  readonly invalidText: string;
  readonly value: number;
  readonly onCommit: (value: number) => void;
  readonly size?: 'regular' | 'large';
  readonly width?: string;
}

/**
 * A framed field: in the #8 mockups a frame means "editable". Committed on blur or Enter; an
 * incomplete draft stays in the field instead of being reset or silently corrected.
 */
const Field = ({
  label,
  text: formatted,
  unit,
  parse,
  invalidText,
  value,
  onCommit,
  size = 'regular',
  width = '100%',
}: FieldProps) => {
  const id = useId();
  const [text, setText] = useState(formatted);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(formatted);
    setInvalid(false);
  }, [formatted]);

  const commit = () => {
    const parsed = parse(text);
    if (parsed === undefined) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed !== value) onCommit(parsed);
    else setText(formatted);
  };

  return (
    <span className="flex flex-col items-end" style={{ width }}>
      <span
        className={`fp-field flex w-full items-center justify-end gap-1 rounded-[10px] border-[1.5px] bg-field-bg px-2.5 ${
          size === 'large' ? 'h-12 text-xl font-bold' : 'h-11'
        } ${invalid ? 'border-alert' : 'border-field'}`}
      >
        <input
          id={id}
          aria-label={label}
          aria-invalid={invalid}
          className="fp-input w-full"
          inputMode="decimal"
          enterKeyHint="done"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        {unit && <span className="font-normal text-muted">{unit}</span>}
      </span>
      {invalid && <span className="mt-1 text-xs text-alert">{invalidText}</span>}
    </span>
  );
};

type NumberFieldProps = Omit<FieldProps, 'text' | 'parse' | 'invalidText'>;

export const NumberField = (props: NumberFieldProps) => {
  const { t, locale } = useMessages();
  return (
    <Field
      {...props}
      text={editableNumber(props.value, locale)}
      parse={parseDecimal}
      invalidText={t('field.invalidNumber')}
    />
  );
};

/** Duration in seconds, typed as `45 min`, `1 h 30` or `2,5 h`. */
export const DurationField = (props: Omit<NumberFieldProps, 'unit'>) => {
  const { t } = useMessages();
  return (
    <Field
      {...props}
      text={editableDuration(props.value)}
      parse={parseDuration}
      invalidText={t('field.invalidDuration')}
    />
  );
};
