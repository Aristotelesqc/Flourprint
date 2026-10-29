import type { ReactNode } from 'react';

export interface BottomBarProps {
  /** Optional variant indicator; navigation A is the contextual toolbar (L101). */
  readonly variant?: 'A' | 'B' | undefined;
  /** Contextual actions placed in the bottom bar. */
  readonly children?: ReactNode;
  /** Accessible label describing the toolbar or bottom bar landmark. */
  readonly navigationLabel?: string | undefined;
  /** Optional custom CSS classes. */
  readonly className?: string | undefined;
}
