import { useId, useRef, useState, useEffect, type ReactElement } from 'react';
import { IonSelect, IonSelectOption } from '@ionic/react';
import { getAncestorTheme } from '../overlay-context.ts';
import { library } from '../../index.ts';
import type { SelectProps } from './props.ts';

export function Select({
  value,
  options,
  label,
  placeholder,
  cancelText,
  okText,
  disabled = false,
  onValueChange,
  description,
  error,
}: SelectProps): ReactElement {
  const selectId = useId();
  const descId = useId();
  const errorId = useId();

  const describedBy =
    [description ? descId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<string | undefined>(undefined);

  const syncTheme = () => {
    const t = getAncestorTheme(containerRef.current);
    if (t !== theme) setTheme(t);
  };

  useEffect(() => {
    setTheme(getAncestorTheme(containerRef.current));
  }, []);

  const activeTheme =
    theme ?? (typeof document !== 'undefined' ? getAncestorTheme(containerRef.current) : undefined);

  return (
    <div
      ref={containerRef}
      onPointerDown={syncTheme}
      onFocusCapture={syncTheme}
      className="flex flex-col w-full text-on-surface"
    >
      <div
        className={`w-full min-h-12 bg-field-background border rounded-card px-3 py-2 flex items-center ${
          error ? 'border-error' : 'border-field-outline focus-within:border-primary'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <IonSelect
          id={selectId}
          interface="popover"
          interfaceOptions={{
            ...(activeTheme ? { htmlAttributes: { 'data-theme': activeTheme } } : {}),
            cssClass: 'fp-ionic',
          }}
          label={label}
          labelPlacement="stacked"
          value={value}
          {...(placeholder === undefined ? {} : { placeholder })}
          cancelText={cancelText}
          okText={okText}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className="w-full text-body text-on-surface min-h-12 fp-ionic [--placeholder-color:var(--color-muted)] [--placeholder-opacity:1]"
          onIonChange={(e) => {
            const chosen = e.detail.value;
            if (typeof chosen === 'string') {
              const matched = options.find((opt) => opt.id === chosen && !opt.disabled);
              if (matched) {
                onValueChange(matched.id);
              }
            }
          }}
        >
          {options.map((option) => (
            <IonSelectOption
              key={option.id}
              value={option.id}
              disabled={option.disabled === true}
              className="text-body"
            >
              {option.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      </div>

      {description && (
        <p id={descId} className="text-supporting text-muted mt-1.5 px-1 whitespace-normal min-w-0">
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-supporting text-error mt-1.5 px-1 whitespace-normal min-w-0"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function SelectExample(props: SelectProps): ReactElement {
  const [currentVal, setCurrentVal] = useState<string | undefined>(props.value);
  return (
    <Select
      {...props}
      value={currentVal}
      onValueChange={(next) => {
        setCurrentVal(next);
        props.onValueChange(next);
      }}
    />
  );
}

export default library.version({
  id: 'fp.select',
  version: 'v1',
  component: Select,
  notes:
    'Production Ionic popover select with stacked label, descriptions, error states, and type-guarded option matching.',
  examples: [
    {
      name: 'standard',
      render: SelectExample,
      props: {
        value: 't65',
        label: 'Flour classification',
        placeholder: 'Select a flour grade',
        cancelText: 'Cancel',
        okText: 'Confirm',
        options: [
          { id: 't45', label: 'Type 45 (Pastry)' },
          { id: 't55', label: 'Type 55 (Standard white)' },
          { id: 't65', label: 'Type 65 (Traditional bread)' },
          { id: 't80', label: 'Type 80 (Semi-whole)', disabled: true },
          { id: 't110', label: 'Type 110 (Whole wheat)' },
        ],
        onValueChange: () => undefined,
        description: 'French ash content classification for wheat flours.',
      },
    },
  ],
});
