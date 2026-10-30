import { useCallback, useEffect, useId, useState, type KeyboardEvent } from 'react';
import type { TemperatureContext } from '@flourprint/core/domain';
import { Ui } from './library';
import { editableNumber, parseDecimal } from '../i18n/numbers';
import { useTemperature } from '../i18n/temperature';
import { editableDuration, parseDuration } from '../i18n/time';
import { useMessages } from '../i18n/use-messages';
import { useValidationActions } from './ValidationContext';

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
  readonly domainInvalidText?: string | undefined;
  readonly onCommit: Commit<V>;
  readonly size?: 'regular' | 'large';
  readonly width?: string;
  /** Shown while empty: a value that applies without being stored (e.g. an inherited one). */
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly describedBy?: string | undefined;
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
  domainInvalidText,
  onCommit,
  size = 'regular',
  width = '100%',
  placeholder,
  disabled = false,
  describedBy,
}: FieldProps<V>) => {
  const id = useId();
  const [text, setText] = useState(formatted);
  const [invalid, setInvalid] = useState(false);
  const [domainRefused, setDomainRefused] = useState(false);
  const validationActions = useValidationActions();

  useEffect(() => {
    setText(formatted);
    setInvalid(false);
    setDomainRefused(false);
  }, [formatted]);

  // Normal blur/Enter remains the commit mechanism.
  const commit = useCallback(() => {
    const decision = decideCommit(text, formatted, parse);
    if (decision.kind === 'commit') {
      const accepted = onCommit(decision.value);
      setInvalid(!accepted);
      setDomainRefused(!accepted);
      validationActions?.report(id, !accepted);
      return accepted;
    }
    if (decision.kind === 'invalid') {
      setInvalid(true);
      setDomainRefused(false);
      validationActions?.report(id, true);
      return false;
    }
    // decision.kind === 'none' (text === formatted)
    setInvalid(false);
    setDomainRefused(false);
    validationActions?.report(id, false);
    return true;
  }, [text, formatted, parse, onCommit, validationActions, id]);

  // Live validity: raw syntax error (parser-rejected), domain refusal, or blur invalidity.
  // Restoration of formatted text clears the blocker immediately.
  const isInvalid = text === formatted ? false : !parse(text).ok || domainRefused || invalid;

  useEffect(() => {
    if (!validationActions) return;
    return validationActions.register(id);
  }, [validationActions, id]);

  useEffect(() => {
    if (!validationActions) return;
    validationActions.report(id, isInvalid);
  }, [validationActions, id, isInvalid]);

  const handleChange = (newText: string) => {
    setText(newText);
    validationActions?.report(id, newText !== formatted && (!parse(newText).ok || domainRefused));
    if (newText === formatted) {
      setInvalid(false);
      setDomainRefused(false);
    } else if (parse(newText).ok) {
      // Valid correction clears parser invalidity while typing.
      setInvalid(false);
    }
  };

  const accessibleLabel = unit ? `${label} (${unit})` : label;

  return (
    <div className="flex flex-col items-end" style={{ width }}>
      <Ui
        component="fp.number-field"
        id={id}
        label={accessibleLabel}
        hideLabel={true}
        value={text}
        onValueChange={handleChange}
        unit={unit}
        error={invalid ? (domainRefused ? domainInvalidText : invalidText) : undefined}
        invalid={isInvalid}
        disabled={disabled}
        inputMode="decimal"
        placeholder={placeholder}
        enterKeyHint="done"
        size={size}
        describedBy={describedBy}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </div>
  );
};

interface NumberFieldProps {
  readonly label: string;
  readonly value: number | undefined;
  readonly unit?: string;
  readonly onCommit: Commit<number>;
  readonly size?: 'regular' | 'large';
  readonly width?: string;
  /** Display rounding only: an untouched formatted field never commits it to the domain. */
  readonly maximumFractionDigits?: number;
  readonly invalidText?: string;
  readonly disabled?: boolean;
  readonly describedBy?: string | undefined;
}

export const NumberField = ({
  value,
  maximumFractionDigits = 2,
  invalidText,
  ...props
}: NumberFieldProps) => {
  const { t, locale } = useMessages();
  return (
    <Field<number>
      {...props}
      text={
        value === undefined
          ? ''
          : new Intl.NumberFormat(locale, { maximumFractionDigits, useGrouping: false }).format(
              value,
            )
      }
      parse={(text) => {
        const parsed = parseDecimal(text);
        return parsed === undefined ? { ok: false } : { ok: true, value: parsed };
      }}
      invalidText={invalidText ?? t('field.invalidNumber')}
      domainInvalidText={invalidText}
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
  readonly placeholder?: string;
}

/** An optional signed number: empty is unknown (`undefined`), a leading minus is accepted. */
const parseOptional = (text: string): { ok: true; value: number | undefined } | { ok: false } => {
  if (text.trim() === '') return { ok: true, value: undefined };
  const compact = text.trim().replace(/^[−-]/, '');
  const parsed = parseDecimal(compact);
  if (parsed === undefined) return { ok: false };
  return { ok: true, value: compact === text.trim() ? parsed : -parsed };
};

/** A number that may stay unknown, such as a quantity nobody measured. */
export const OptionalNumberField = ({ value, ...props }: OptionalNumberFieldProps) => {
  const { t, locale } = useMessages();
  return (
    <Field<number | undefined>
      {...props}
      text={value === undefined ? '' : editableNumber(value, locale)}
      parse={parseOptional}
      invalidText={t('field.invalidNumber')}
    />
  );
};

interface TemperatureFieldProps {
  readonly label: string;
  /** Stored °C; undefined is an unknown temperature, shown empty, never as zero. */
  readonly value: number | undefined;
  /** Which display unit applies (values-and-units.md). */
  readonly context: TemperatureContext;
  /** A difference such as a mixer friction: converted by the scale only. */
  readonly difference?: boolean;
  /** An empty field commits `undefined`; a typed value is committed in °C. */
  readonly onCommit: Commit<number | undefined>;
  readonly width?: string;
  /** °C shown while empty, such as the inherited ambient. */
  readonly placeholderC?: number;
}

/** A temperature typed and shown in the unit of its context, stored in °C. */
export const TemperatureField = ({
  value,
  context,
  difference = false,
  onCommit,
  placeholderC,
  ...props
}: TemperatureFieldProps) => {
  const { t } = useMessages();
  const temperature = useTemperature();
  return (
    <Field<number | undefined>
      {...props}
      unit={temperature.unit(context)}
      text={value === undefined ? '' : temperature.editable(value, context, difference)}
      {...(placeholderC === undefined
        ? {}
        : { placeholder: temperature.editable(placeholderC, context, difference) })}
      parse={parseOptional}
      onCommit={(typed) =>
        onCommit(
          typed === undefined ? undefined : temperature.toCelsius(typed, context, difference),
        )
      }
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
