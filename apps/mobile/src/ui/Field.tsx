import { useEffect, useId, useState } from 'react';
import { editableNumber, parseDecimal } from '../i18n/numbers';
import { editableDuration, parseDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';

/**
 * What a field reports when the user commits: `accepted` false when the edit was refused (the
 * page shows why); the field then keeps the typed text, marked invalid, instead of looking
 * accepted while totals still show the old value.
 */
type Commit<V> = (value: V) => boolean;

export type CommitDecision<V> =
  | { readonly kind: 'none' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'commit'; readonly value: V };

/**
 * What leaving a field does. Untouched text never commits: the display is rounded, and committing
 * it would change the recipe just by visiting the field (ADR 0006, Codex audit finding 1).
 */
export const decideCommit = <V,>(
  text: string,
  formatted: string,
  parse: (text: string) => { ok: true; value: V } | { ok: false },
): CommitDecision<V> => {
  if (text === formatted) return { kind: 'none' };
  const parsed = parse(text);
  return parsed.ok ? { kind: 'commit', value: parsed.value } : { kind: 'invalid' };
};

interface FieldProps<V> {
  readonly label: string;
  /** Display of the stored value; untouched text never commits (ADR 0006: no rounding feedback). */
  readonly text: string;
  readonly unit?: string;
  readonly parse: (text: string) => { ok: true; value: V } | { ok: false };
  readonly invalidText: string;
  readonly onCommit: Commit<V>;
  readonly size?: 'regular' | 'large';
  readonly width?: string;
}

/**
 * A framed field: in the #8 mockups a frame means "editable". Committed on blur or Enter, only
 * when the text was changed; an incomplete draft stays in the field instead of being reset or
 * silently corrected.
 */
const Field = <V,>({
  label,
  text: formatted,
  unit,
  parse,
  invalidText,
  onCommit,
  size = 'regular',
  width = '100%',
}: FieldProps<V>) => {
  const id = useId();
  const errorId = `${id}-error`;
  const [text, setText] = useState(formatted);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(formatted);
    setInvalid(false);
  }, [formatted]);

  const commit = () => {
    const decision = decideCommit(text, formatted, parse);
    if (decision.kind === 'commit') setInvalid(!onCommit(decision.value));
    else setInvalid(decision.kind === 'invalid');
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
          aria-label={unit ? `${label} (${unit})` : label}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
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
        {unit && (
          <span className="font-normal text-muted" aria-hidden="true">
            {unit}
          </span>
        )}
      </span>
      {invalid && (
        <span id={errorId} className="mt-1 text-xs text-alert">
          {invalidText}
        </span>
      )}
    </span>
  );
};

interface NumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
  readonly onCommit: Commit<number>;
  readonly size?: 'regular' | 'large';
  readonly width?: string;
}

export const NumberField = ({ value, ...props }: NumberFieldProps) => {
  const { t, locale } = useMessages();
  return (
    <Field<number>
      {...props}
      text={editableNumber(value, locale)}
      parse={(text) => {
        const parsed = parseDecimal(text);
        return parsed === undefined ? { ok: false } : { ok: true, value: parsed };
      }}
      invalidText={t('field.invalidNumber')}
    />
  );
};

interface OptionalNumberFieldProps {
  readonly label: string;
  /** Undefined is an unknown value, shown empty, never as zero. */
  readonly value: number | undefined;
  readonly unit?: string;
  /** An empty field commits `undefined`. */
  readonly onCommit: Commit<number | undefined>;
  readonly width?: string;
}

/** A number that may stay unknown, such as a temperature nobody measured. */
export const OptionalNumberField = ({ value, ...props }: OptionalNumberFieldProps) => {
  const { t, locale } = useMessages();
  return (
    <Field<number | undefined>
      {...props}
      text={value === undefined ? '' : editableNumber(value, locale)}
      parse={(text) => {
        if (text.trim() === '') return { ok: true, value: undefined };
        const compact = text.trim().replace(/^[−-]/, '');
        const parsed = parseDecimal(compact);
        if (parsed === undefined) return { ok: false };
        return { ok: true, value: compact === text.trim() ? parsed : -parsed };
      }}
      invalidText={t('field.invalidNumber')}
    />
  );
};

interface DurationFieldProps {
  readonly label: string;
  /** Seconds; undefined is an unknown duration, shown empty, never as zero. */
  readonly value: number | undefined;
  /** When set, an empty field commits `undefined` (unknown duration). */
  readonly optional?: boolean;
  readonly onCommit: Commit<number | undefined>;
  readonly width?: string;
}

/** Duration in seconds, typed as `45 min`, `1 h 30` or `2,5 h`. */
export const DurationField = ({ value, optional = false, ...props }: DurationFieldProps) => {
  const { t } = useMessages();
  return (
    <Field<number | undefined>
      {...props}
      text={value === undefined ? '' : editableDuration(value)}
      parse={(text) => {
        if (text.trim() === '') return optional ? { ok: true, value: undefined } : { ok: false };
        const parsed = parseDuration(text);
        return parsed === undefined ? { ok: false } : { ok: true, value: parsed };
      }}
      invalidText={t('field.invalidDuration')}
    />
  );
};
