import type { HTMLAttributes, ReactNode } from 'react';

export interface StepNodeProps extends HTMLAttributes<HTMLDivElement> {
  readonly number?: number;
  readonly icon?: ReactNode;
  readonly label: string;
  readonly details?: ReactNode;
  readonly actions?: ReactNode;
  readonly highlighted?: boolean;
  readonly children?: ReactNode;
}
