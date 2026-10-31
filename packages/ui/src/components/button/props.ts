import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly ref?: Ref<HTMLButtonElement> | undefined;
  readonly variant?: ButtonVariant;
  readonly icon?: ReactNode;
  readonly fullWidth?: boolean;
  readonly children: ReactNode;
}
