import type { ReactNode } from 'react';

export interface BottomSheetProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly closeLabel: string;
  readonly onDismiss: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly canDismiss?: boolean | (() => Promise<boolean>);
  readonly reducedMotion?: boolean;
}
