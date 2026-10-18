import './v1.css';
import React, { useId, useState, useEffect, useRef } from 'react';
import type { NumberFieldProps } from '../../props.ts';
import { library } from '../../index.ts';
import { useTransitionMotionStyle } from '../use-transition-motion.ts';

function formatDisplayValue(val: number, loc: 'fr' | 'en', digits = 2): string {
  if (!Number.isFinite(val)) return '';
  const rounded = Math.round(val * 10 ** digits) / 10 ** digits;
  const str = rounded.toString();
  return loc === 'fr' ? str.replace('.', ',') : str;
}

function parseInputNumber(raw: string): { valid: boolean; value: number } {
  const trimmed = raw.trim();
  if (trimmed === '') return { valid: false, value: NaN };
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return { valid: false, value: NaN };
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { valid: false, value: NaN };
  return { valid: true, value: parsed };
}

export const NumberField: React.FC<NumberFieldProps> = ({
  compact = false,
  hint,
  value,
  label,
  unit,
  unitPosition = 'suffix',
  locale,
  onCommit,
  onValidityChange,
  disabled = false,
  dataTestId,
  errorMessage,
  resetKey,
  displayDigits = 2,
}) => {
  const inputId = useId();
  const errorId = useId();
  const hintId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const highlightMotionStyle = useTransitionMotionStyle('fp.motion.highlight', rootRef);
  const [rawText, setRawText] = useState<string>(() =>
    formatDisplayValue(value, locale, displayDigits),
  );
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const lastCommittedRef = useRef<number>(value);
  const dirtyRef = useRef(false);
  const previousResetRef = useRef(resetKey);
  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;

  useEffect(() => {
    const forcedReset = previousResetRef.current !== resetKey;
    previousResetRef.current = resetKey;
    lastCommittedRef.current = value;
    if (dirtyRef.current && !forcedReset) return;
    dirtyRef.current = false;
    const nextFormatted = formatDisplayValue(value, locale, displayDigits);
    setRawText(nextFormatted);
    setIsInvalid(false);
    onValidityChangeRef.current?.(false);
  }, [value, locale, resetKey, displayDigits]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    dirtyRef.current = true;
    setRawText(text);
    const parsed = parseInputNumber(text);
    const invalid = !parsed.valid;
    setIsInvalid(invalid);
    onValidityChangeRef.current?.(invalid);
  };

  const commitValue = () => {
    if (rawText === '' && !Number.isFinite(lastCommittedRef.current)) {
      setIsInvalid(false);
      onValidityChangeRef.current?.(false);
      return;
    }
    const parsed = parseInputNumber(rawText);
    if (!parsed.valid) {
      setIsInvalid(true);
      onValidityChangeRef.current?.(true);
      return;
    }
    if (
      rawText === formatDisplayValue(lastCommittedRef.current, locale, displayDigits) ||
      parsed.value === lastCommittedRef.current
    ) {
      dirtyRef.current = false;
      setRawText(formatDisplayValue(parsed.value, locale, displayDigits));
      setIsInvalid(false);
      onValidityChangeRef.current?.(false);
      return;
    }
    const success = onCommit(parsed.value);
    if (success) {
      dirtyRef.current = false;
      lastCommittedRef.current = parsed.value;
      dirtyRef.current = false;
      setRawText(formatDisplayValue(parsed.value, locale, displayDigits));
      setIsInvalid(false);
      onValidityChangeRef.current?.(false);
    } else {
      setIsInvalid(true);
      onValidityChangeRef.current?.(true);
    }
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    }
  };

  return (
    <div
      ref={rootRef}
      data-fp-component="fp.number-field"
      data-fp-version="v1"
      className={`field ${compact ? 'field-compact' : ''} ${isInvalid ? 'field-error' : ''} ${unitPosition === 'prefix' ? 'field-prefix' : ''}`}
    >
      <label htmlFor={inputId} className="field-label">
        <span>{label}</span>
      </label>
      <div className="field-input-wrap">
        <input
          id={inputId}
          type="text"
          title={hint}
          inputMode="decimal"
          disabled={disabled}
          value={rawText}
          data-testid={dataTestId}
          aria-invalid={isInvalid}
          aria-describedby={
            [isInvalid ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
            undefined
          }
          className="field-input tabular"
          style={highlightMotionStyle}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {unit && (
          <span className="field-unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {isInvalid && (
        <span id={errorId} className="field-error-msg" role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export default library.version({
  id: 'fp.number-field',
  version: 'v1',
  component: NumberField,
  notes:
    'Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.',
  examples: [
    {
      name: 'Decimal entry',
      props: {
        value: 12.5,
        label: 'Quantity',
        unit: 'g',
        locale: 'en',
        onCommit: () => true,
        errorMessage: 'Enter a number',
      },
    },
    {
      name: 'Locked',
      props: {
        value: 75,
        label: 'Hydration',
        unit: '%',
        locale: 'en',
        disabled: true,
        onCommit: () => true,
        errorMessage: 'Enter a number',
      },
    },
  ],
});
