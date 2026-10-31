import { useId, useState, type ChangeEvent, type ReactElement } from 'react';
import { library } from '../../index.ts';
import type { NumberFieldProps } from './props.ts';

export function NumberField({
  label,
  value,
  onValueChange,
  unit,
  help,
  error,
  invalid = false,
  disabled = false,
  readOnly = false,
  required = false,
  inputMode = 'decimal',
  id,
  name,
  placeholder,
  onBlur,
  onKeyDown,
  className,
  hideLabel = false,
  describedBy: externalDescribedBy,
  enterKeyHint,
  size = 'regular',
}: NumberFieldProps): ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  const isInvalid = invalid || Boolean(error);

  const describedBy = [externalDescribedBy, error ? errorId : undefined, help ? helpId : undefined]
    .filter((entry): entry is string => entry !== undefined)
    .join(' ');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onValueChange(event.target.value);
  };

  const borderClass = isInvalid
    ? 'border-error'
    : 'border-field-outline focus-within:border-outline';

  const stateClass = disabled
    ? 'opacity-50 cursor-not-allowed bg-surface-container'
    : 'bg-field-background';

  const inputTypographyClass =
    size === 'large' ? 'text-xl font-bold min-h-12' : 'text-body min-h-touch';

  return (
    <div className={`flex flex-col gap-1 min-w-0 w-full ${className ?? ''}`}>
      {hideLabel ? (
        <label htmlFor={inputId} className="sr-only">
          {label}
          {required ? (
            <span className="ms-1 text-error" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : (
        <div className="flex items-baseline justify-between gap-2 min-w-0 flex-wrap">
          <label
            htmlFor={inputId}
            className="text-supporting font-medium text-on-surface min-w-0 break-words"
          >
            {label}
            {required ? (
              <span className="ms-1 text-error" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        </div>
      )}

      <div
        className={`relative flex items-center min-w-0 w-full rounded-card border ${borderClass} ${stateClass}`}
      >
        <input
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          aria-describedby={describedBy !== '' ? describedBy : undefined}
          aria-required={required ? true : undefined}
          enterKeyHint={enterKeyHint}
          className={`fp-control-reset w-full min-w-0 rounded-card bg-transparent px-3 py-2 text-on-surface outline-none fp-focus placeholder:text-muted disabled:text-muted disabled:cursor-not-allowed ${inputTypographyClass}`}
        />
        {unit ? (
          <span className="shrink max-w-[40%] break-words pe-3 text-supporting text-muted select-none min-w-0">
            {unit}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          id={errorId}
          role="status"
          aria-live="polite"
          className="text-supporting text-error break-words"
        >
          {error}
        </div>
      ) : null}

      {help ? (
        <div id={helpId} className="text-supporting text-muted break-words">
          {help}
        </div>
      ) : null}
    </div>
  );
}

function NumberFieldDemo(props: NumberFieldProps): ReactElement {
  const [value, setValue] = useState<string>(props.value);

  const handleValueChange = (nextValue: string): void => {
    setValue(nextValue);
    props.onValueChange(nextValue);
  };

  return <NumberField {...props} value={value} onValueChange={handleValueChange} />;
}

export default library.version({
  id: 'fp.number-field',
  version: 'v1',
  component: NumberField,
  notes:
    'Controlled raw-string text input for locale-specific numbers with 48px touch target, accessible labeling and live error announcements.',
  examples: [
    {
      name: 'Standard decimal (Hydration percentage)',
      render: NumberFieldDemo,
      props: {
        label: 'Target Hydration',
        value: '72.5',
        onValueChange: () => {},
        unit: '%',
        help: 'A localized value supplied by the recipe editor.',
      },
    },
    {
      name: 'Raw comma string (French locale decimal input)',
      render: NumberFieldDemo,
      props: {
        label: 'Flour Mass',
        value: '450,5',
        onValueChange: () => {},
        unit: 'g',
        help: 'Pending comma-decimal entry in localized European format.',
      },
    },
    {
      name: 'Invalid with error message',
      render: NumberFieldDemo,
      props: {
        label: 'Inoculation Rate',
        value: '120',
        onValueChange: () => {},
        unit: '%',
        invalid: true,
        error: 'Enter a valid value.',
      },
    },
    {
      name: 'Disabled (Fixed measurement)',
      render: NumberFieldDemo,
      props: {
        label: 'Ambient Temperature',
        value: '26',
        onValueChange: () => {},
        unit: '°C',
        disabled: true,
        help: 'Sensor reading locked during active bulk fermentation.',
      },
    },
  ],
});
