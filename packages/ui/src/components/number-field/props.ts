import type { FocusEventHandler, KeyboardEventHandler, ReactNode } from 'react';

export interface NumberFieldProps {
  readonly label: ReactNode;
  readonly value: string;
  readonly onValueChange: (raw: string) => void;
  readonly unit?: ReactNode;
  readonly help?: ReactNode;
  readonly error?: ReactNode;
  readonly invalid?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly readOnly?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly inputMode?: 'decimal' | 'numeric' | undefined;
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly onBlur?: FocusEventHandler<HTMLInputElement> | undefined;
  readonly onKeyDown?: KeyboardEventHandler<HTMLInputElement> | undefined;
  readonly className?: string | undefined;
}
