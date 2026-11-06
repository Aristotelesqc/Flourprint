export interface SelectOption {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  readonly value: string | undefined;
  readonly options: readonly SelectOption[];
  readonly label: string;
  readonly placeholder?: string;
  readonly cancelText: string;
  readonly okText: string;
  readonly disabled?: boolean;
  readonly onValueChange: (value: string) => void;
  readonly description?: string;
  readonly error?: string;
}
