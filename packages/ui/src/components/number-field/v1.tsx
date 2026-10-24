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
  onClear,
  onValidityChange,
  onDirtyChange,
  disabled = false,
  dataTestId,
  errorMessage,
  commitErrorMessage,
  onTextChange,
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
  const [errorKind, setErrorKind] = useState<'parse' | 'refusal' | null>(null);
  const lastCommittedRef = useRef<number>(value);
  const isDirtyRef = useRef<boolean>(false);
  const previousResetRef = useRef(resetKey);
  const previousDisabledRef = useRef(disabled);

  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const onTextChangeRef = useRef(onTextChange);
  onTextChangeRef.current = onTextChange;

  const setDirty = (dirty: boolean) => {
    if (isDirtyRef.current !== dirty) {
      isDirtyRef.current = dirty;
      onDirtyChangeRef.current?.(dirty);
    }
  };

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
      onValidityChangeRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    if (errorKind === 'refusal' && commitErrorMessage === '') {
      setErrorKind(null);
      onValidityChangeRef.current?.(false);
    }
  }, [commitErrorMessage, errorKind]);

  useEffect(() => {
    const forcedReset = previousResetRef.current !== resetKey;
    previousResetRef.current = resetKey;
    const disabledTransition = previousDisabledRef.current !== disabled && disabled;
    previousDisabledRef.current = disabled;

    lastCommittedRef.current = value;

    if (isDirtyRef.current && !forcedReset && !disabledTransition) {
      return;
    }

    setDirty(false);
    const nextFormatted = formatDisplayValue(value, locale, displayDigits);
    setRawText(nextFormatted);
    setErrorKind(null);
    onValidityChangeRef.current?.(false);
  }, [value, locale, resetKey, disabled, displayDigits]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onTextChangeRef.current?.(text);
    const currentFormatted = formatDisplayValue(lastCommittedRef.current, locale, displayDigits);
    setDirty(text !== currentFormatted);
    setRawText(text);

    const isOptionalEmpty = onClearRef.current !== undefined && text.trim() === '';
    const parsed = parseInputNumber(text);
    const valid = isOptionalEmpty || parsed.valid;

    if (valid) {
      setErrorKind(null);
      onValidityChangeRef.current?.(false);
    } else {
      onValidityChangeRef.current?.(true);
    }
  };

  const commitValue = () => {
    const trimmed = rawText.trim();

    if (trimmed === '') {
      if (onClearRef.current !== undefined) {
        if (Number.isFinite(lastCommittedRef.current)) {
          const accepted = onClearRef.current();
          if (accepted) {
            lastCommittedRef.current = NaN;
            setDirty(false);
            setRawText('');
            setErrorKind(null);
            onValidityChangeRef.current?.(false);
          } else {
            setErrorKind('refusal');
            onValidityChangeRef.current?.(true);
          }
        } else {
          setDirty(false);
          setRawText('');
          setErrorKind(null);
          onValidityChangeRef.current?.(false);
        }
        return;
      }

      setErrorKind('parse');
      onValidityChangeRef.current?.(true);
      return;
    }

    const parsed = parseInputNumber(rawText);
    if (!parsed.valid) {
      setErrorKind('parse');
      onValidityChangeRef.current?.(true);
      return;
    }

    const currentFormatted = formatDisplayValue(lastCommittedRef.current, locale, displayDigits);
    if (
      !isDirtyRef.current ||
      rawText === currentFormatted ||
      parsed.value === lastCommittedRef.current
    ) {
      setDirty(false);
      setRawText(currentFormatted);
      setErrorKind(null);
      onValidityChangeRef.current?.(false);
      return;
    }

    const success = onCommitRef.current(parsed.value);
    if (success) {
      setDirty(false);
      lastCommittedRef.current = parsed.value;
      setRawText(formatDisplayValue(parsed.value, locale, displayDigits));
      setErrorKind(null);
      onValidityChangeRef.current?.(false);
    } else {
      setErrorKind('refusal');
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

  const showError = errorKind !== null;
  const activeErrorMessage =
    errorKind === 'refusal' ? (commitErrorMessage ?? errorMessage) : errorMessage;

  return (
    <div
      ref={rootRef}
      data-fp-component="fp.number-field"
      data-fp-version="v1"
      className={`field ${compact ? 'field-compact' : ''} ${showError ? 'field-error' : ''} ${disabled ? 'field-disabled' : ''} ${unitPosition === 'prefix' ? 'field-prefix' : ''}`}
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
          aria-invalid={showError}
          aria-describedby={
            [showError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
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
      {showError && (
        <span id={errorId} className="field-error-msg" role="alert">
          {activeErrorMessage}
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
